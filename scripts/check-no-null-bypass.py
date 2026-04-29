#!/usr/bin/env python3
"""
CI check: assert no RLS policy in any schema contains the dead-code disjunct
`org_id IS NULL`. Closes #395.

Why this exists:
  Phase 3 of the multi-tenant RLS hardening (mig 193, 2026-04-29) rewrote 53
  policies that had `(<some condition>) OR (org_id IS NULL)` clauses. The OR
  clause was harmless once Phase 4 enforced NOT NULL on org_id (mig 197),
  but it remained in policy text — and a future dev could 'fix' a downstream
  bug by dropping the NOT NULL on org_id, silently re-opening the bypass.

  This script + its helper RPC `public.atlas_list_null_bypass_policies()`
  guards the contract: zero policies match the regex `org_id\\s+is\\s+null`
  in either USING or WITH CHECK text. Failing exits 1 with the offending
  policies named.

Wire into:
  - .git/hooks/pre-commit (when supabase/migrations/**.sql changes)
  - CI on PRs that touch supabase/migrations/

Reads Supabase service-role creds from ~/.claude/secrets/.env (Atlas canonical
secrets store; .env.local is a symlink to it).

Exit codes:
  0 — no null-bypass policies found
  1 — at least one policy matches; lists them on stderr
  2 — could not reach Supabase
"""

from __future__ import annotations

import json
import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

CANDIDATE_ENV_FILES = (
    Path.cwd() / ".env.local",
    Path(__file__).resolve().parent.parent / ".env.local",
    Path.home() / ".claude" / "secrets" / ".env",
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
                os.environ.setdefault(key.strip(), val.strip().strip('"').strip("'"))
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


def call_rpc(url: str, key: str) -> list[dict]:
    endpoint = f"{url}/rest/v1/rpc/atlas_list_null_bypass_policies"
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
                "ERROR: RPC public.atlas_list_null_bypass_policies is not installed.\n"
                "Apply migration 199 first.",
                file=sys.stderr,
            )
            sys.exit(2)
        print(f"HTTP {e.code}: {detail}", file=sys.stderr)
        sys.exit(2)
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"ERROR: could not reach Supabase: {e}", file=sys.stderr)
        sys.exit(2)


def report(rows: list[dict]) -> int:
    if not rows:
        print("OK: 0 RLS policies contain 'org_id IS NULL' bypass disjunct")
        return 0

    print(
        f"REGRESSION: {len(rows)} RLS policies contain 'org_id IS NULL' bypass:",
        file=sys.stderr,
    )
    for row in rows:
        schema = row.get("schemaname", "?")
        table = row.get("tablename", "?")
        policy = row.get("policyname", "?")
        qual = (row.get("qual_clause") or "").strip()
        wc = (row.get("with_check_clause") or "").strip()
        print(f"  - {schema}.{table} :: {policy}", file=sys.stderr)
        if qual:
            print(f"      USING:      {qual[:160]}", file=sys.stderr)
        if wc:
            print(f"      WITH CHECK: {wc[:160]}", file=sys.stderr)

    print(
        "\nFix: rewrite each policy to remove the `org_id IS NULL` disjunct.\n"
        "Pattern reference: migration 193 (Phase 3 rewrite of 53 such policies).",
        file=sys.stderr,
    )
    return 1


def self_test() -> int:
    """Verify report() behavior without a DB connection."""
    print("[self-test] regression fixture:")
    rc = report([
        {
            "schemaname": "public",
            "tablename": "projects",
            "policyname": "projects_select_v2",
            "qual_clause": "((org_id = ANY (auth_user_org_ids())) OR (org_id IS NULL))",
            "with_check_clause": None,
        }
    ])
    assert rc == 1, f"regression fixture should return 1, got {rc}"

    print("[self-test] clean fixture:")
    rc = report([])
    assert rc == 0, f"clean fixture should return 0, got {rc}"

    print("[self-test] PASS")
    return 0


def main() -> int:
    if "--self-test" in sys.argv:
        return self_test()
    load_env_from_candidate_files()
    url, key = resolve_supabase_config()
    rows = call_rpc(url, key)
    return report(rows)


if __name__ == "__main__":
    sys.exit(main())
