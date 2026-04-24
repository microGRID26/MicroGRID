#!/usr/bin/env python3
"""
Grant-parity check for the public.auth_* helper family.

Ships as insurance against the 2026-04-24 outage class: commit 4519127
revoked EXECUTE on public.auth_is_internal_writer() from anon while the
six peer auth_* helpers retained it. 155 RLS policies silently denied
across ~70 tables. Nothing caught the asymmetry — tests passed, tsc
passed, review approved.

This script enumerates every function in the public schema whose name
starts with `auth_` and asserts that `anon`, `authenticated`, and `public`
all have EXECUTE on it. Exits 0 if the family is consistent; exits 1 and
prints the offending function + missing role(s) if any helper diverges.

Designed to be called from:
  - .git/hooks/pre-commit (runs before every MG commit that touches migrations)
  - CI (any commit that touches supabase/migrations/**.sql)
  - Manually by Atlas on an audit: `python3 scripts/check-auth-grant-parity.py`

Reads Supabase credentials from ~/.claude/secrets/.env (Greg's canonical
secrets store; .env.local is a symlink to it). Accepts an explicit env-var
override for CI runs where the shell doesn't source the secrets file.

Env vars required (in this precedence order):
  SUPABASE_URL            or NEXT_PUBLIC_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

The script does not make the check configurable per auth_* helper — that's
the point. The contract is uniform across the family. If a helper ever
legitimately needs to differ, update this script and add a comment explaining
why, so the rationale is checked in next to the exception.

Exit codes:
  0 — all auth_* helpers have EXECUTE on (anon, authenticated, public)
  1 — one or more helpers are missing a grant (drift detected)
  2 — could not reach Supabase (credentials or network)
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

EXPECTED_ROLES = ("anon", "authenticated", "public")

CANDIDATE_ENV_FILES = (
    Path.cwd() / ".env.local",                          # MG repo root when run from pre-commit
    Path(__file__).resolve().parent.parent / ".env.local",  # MG repo root when run from elsewhere
    Path.home() / ".claude" / "secrets" / ".env",       # Atlas canonical secrets
)


def load_env_from_candidate_files() -> None:
    for path in CANDIDATE_ENV_FILES:
        if not path.exists():
            continue
        try:
            for raw in path.read_text().splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                os.environ.setdefault(key, val)
        except Exception:
            continue


def resolve_supabase_config() -> tuple[str, str]:
    url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        tried = ", ".join(str(p) for p in CANDIDATE_ENV_FILES)
        print(
            "ERROR: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n"
            f"Tried env vars and: {tried}.",
            file=sys.stderr,
        )
        sys.exit(2)
    return url.rstrip("/"), key


def run_sql(url: str, key: str, query: str) -> list[dict]:
    """Execute SQL via PostgREST's rpc/exec endpoint using Supabase's generic
    SQL via the `execute_sql` pattern would be ideal, but not all projects
    expose it. We use the direct SQL RPC if available, otherwise fall back to
    the management query. The simplest path that works today: the pg_meta-style
    query endpoint on /rest/v1/rpc/<name>. We rely on the small helper RPC
    `atlas_list_auth_function_grants` if it exists; else fail gracefully.

    To keep this script standalone and avoid creating yet another RPC, we POST
    directly to the Supabase PostgREST SQL proxy. The service_role key has
    direct SQL privileges; the simplest transport is `/pg/query` via the
    supabase-js `execute_sql` shape, but PostgREST doesn't expose raw SQL.

    Concretely: we use an inline RPC. We create/assume a `atlas_check_auth_grants`
    that returns the rows. If it doesn't exist, the script prints a migration
    hint and exits 2.
    """
    endpoint = f"{url}/rest/v1/rpc/atlas_check_auth_grants"
    req = urllib.request.Request(
        endpoint,
        data=b"{}",
        method="POST",
        headers={
            "Content-Type": "application/json",
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Accept": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read().decode("utf-8")
            return json.loads(body) if body else []
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="replace")
        if "Could not find the function" in detail or e.code == 404:
            print(
                "ERROR: RPC public.atlas_check_auth_grants is not installed.\n"
                "Apply migration 156 first (ships the helper RPC).",
                file=sys.stderr,
            )
            sys.exit(2)
        print(f"HTTP {e.code}: {detail}", file=sys.stderr)
        sys.exit(2)
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"ERROR: could not reach Supabase: {e}", file=sys.stderr)
        sys.exit(2)


def check_parity(rows: list[dict]) -> int:
    if not rows:
        print("ERROR: no public.auth_* functions found — schema drift?", file=sys.stderr)
        return 1

    drift: list[tuple[str, list[str]]] = []
    for row in rows:
        name = row.get("proname", "<unknown>")
        missing: list[str] = []
        for role in EXPECTED_ROLES:
            col = f"{role}_exec"
            if not row.get(col, False):
                missing.append(role)
        if missing:
            drift.append((name, missing))

    checked = len(rows)
    if not drift:
        print(f"OK: {checked} public.auth_* helpers all grant EXECUTE to (anon, authenticated, public)")
        return 0

    print(f"DRIFT DETECTED across {len(drift)} of {checked} public.auth_* helpers:", file=sys.stderr)
    for name, missing in drift:
        print(f"  - public.{name}: missing EXECUTE for {', '.join(missing)}", file=sys.stderr)
    print(
        "\nFix: add a migration with "
        "`GRANT EXECUTE ON FUNCTION public.<name>() TO <role>, ...;` for each divergent helper.\n"
        "See migration 151 (2026-04-24) for the pattern that resolved the outage that prompted this check.",
        file=sys.stderr,
    )
    return 1


def self_test() -> int:
    """Verify the assertion logic against synthetic rows. No DB required."""
    print("[self-test] drift fixture — one helper missing anon:")
    synthetic_drift = [
        {"proname": "auth_is_admin", "anon_exec": True, "authenticated_exec": True, "public_exec": True},
        {"proname": "auth_is_internal_writer", "anon_exec": False, "authenticated_exec": True, "public_exec": True},
    ]
    code = check_parity(synthetic_drift)
    assert code == 1, f"drift fixture should return 1, got {code}"

    print("[self-test] clean fixture — all grants present:")
    synthetic_clean = [
        {"proname": "auth_is_admin", "anon_exec": True, "authenticated_exec": True, "public_exec": True},
        {"proname": "auth_is_internal_writer", "anon_exec": True, "authenticated_exec": True, "public_exec": True},
    ]
    code = check_parity(synthetic_clean)
    assert code == 0, f"clean fixture should return 0, got {code}"

    print("[self-test] PASS — assertion logic correct")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    load_env_from_candidate_files()
    url, key = resolve_supabase_config()
    rows = run_sql(url, key, "")
    return check_parity(rows)


if __name__ == "__main__":
    sys.exit(main())
