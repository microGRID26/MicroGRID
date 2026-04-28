# Drop `org_type='platform'` short-circuit on MicroGRID — phased migration plan

**Project:** MicroGRID prod (`hzymsezqfxzpbcqryeim`)
**Closes:** greg_action #354
**Author:** migration-planner subagent (read-only audit; no SQL applied)
**Date:** 2026-04-28

---

## Executive summary

`auth_is_platform_user()` is referenced by **76 RLS policies across 50 tables + 4 storage policies** (audited live). It is the single most powerful access vector on MG: anyone with an `org_memberships` row to an `org_type='platform'` organization sees and edits every project across every dealer org, every invoice, every payment, every partner credential.

There is exactly **one** `platform` org on MG today: the EDGE org `1f82d049-8e2b-46d5-9fe2-efd8664a91a5` with three members:

| Email | `users.role` | `users.active` | Effective MG access today |
|---|---|---|---|
| `paul@energydevelopmentgroup.com` | `admin` | **true** | Full platform-level access via `auth_is_platform_user()` |
| `greg@energydevelopmentgroup.com` | `super_admin` | **false** | **None** (helper requires `active=true`) |
| `gkelsch@trismartsolar.com` | `super_admin` | **false** | **None** (helper requires `active=true`) |

**Critical pre-flight finding:** only Paul currently exercises the platform short-circuit. The other two are inactive. The single user this migration affects is Paul. `greg@gomicrogridenergy.com` (the canonical Greg) is `super_admin` + `active=true` and does NOT need platform — `auth_is_super_admin()` covers him.

**Replacement strategy chosen:** drop `auth_is_platform_user()` entirely and rewrite each policy to use `auth_is_super_admin()`. Every existing platform reference is purely additive elevation already paired with org-membership or super_admin checks.

---

## Pre-flight A: Paul's role decision (REQUIRES GREG)

Paul is the only user actively exercising the platform gate. After Phase B he loses cross-org access unless his MG `users.role` is elevated. Two choices:

- **A1 (recommended):** promote Paul to `super_admin` on MG. He's CFO of EDGE and already has cross-tenant visibility de facto.
- **A2:** leave Paul as `admin`. He loses cross-dealer visibility on MG. Keeps EDGE access entirely (different DB).

**This is a Greg decision. Do not proceed without it.**

If A1, run before Phase A:
```sql
UPDATE public.users SET role='super_admin', updated_at=now()
 WHERE email='paul@energydevelopmentgroup.com' AND active=true;
```

---

## Phase order + cadence

| When | Phase | Reversible? |
|---|---|---|
| Day 0 | Pre-flight A–F (incl. Paul decision) | Yes |
| Day 0 | **Phase A** — neuter `auth_is_platform_user()` to fall through to super_admin | Yes |
| Day 0–7 | Bake. Watch logs. Confirm Paul + Greg unaffected. | n/a |
| Day 7 | **Phase B** — rewrite 76+4 policies (per-table transactions) | Yes (snapshot) |
| Day 7 | **Phase D** — delete EDGE platform org row + 3 memberships | Yes |
| Day 7 | **Phase C** — add CHECK constraint preventing future `platform` rows | Yes |
| Day 37 | **Phase E** — drop `auth_is_platform_user()` function | Yes |

---

## Phase A — Neuter the helper (one-statement security fix)

After this single statement, `org_type='platform'` membership grants nothing. Phases B–E are cleanup. **Phase A is the actual security fix.**

```sql
CREATE OR REPLACE FUNCTION public.auth_is_platform_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
  -- Deprecated 2026-04-28 (greg_action #354). Falls through to super_admin.
  SELECT public.auth_is_super_admin();
$function$;
```

**Lock:** `ACCESS EXCLUSIVE` on the function's `pg_proc` row. Milliseconds. No table locks.

**Rollback:** restore the original plpgsql body (saved separately).

---

## Phase B — Rewrite 76+4 policies (per-table transactions)

Pure textual substitution: `auth_is_platform_user()` → `auth_is_super_admin()`. Each policy `DROP POLICY` + `CREATE POLICY` per-table inside its own `BEGIN/COMMIT`. Tiny tables; sub-second windows; production-safe.

**Tables affected (50 public + 4 storage):** projects, notes, task_state, task_history, stage_history, audit_log, tickets, commission_records, customer_payments, customer_messages, customer_billing_statements, customer_payment_methods, customer_feedback, customer_referrals, equipment_warranties, warranty_claims, purchase_orders, po_line_items, service_calls, schedule, task_reasons, queue_sections, warehouse_stock, permit_submissions, commission_advances, sales_reps, sales_teams, project_files, project_folders, project_funding, project_documents, project_materials, project_adders, wo_checklist_items, work_orders, edge_sync_log, document_requirements, invoices, invoice_line_items, invoice_attestations, clearing_runs, entity_profit_transfers, project_cost_line_items, engineering_assignments, ntp_requests, sales_dealer_relationships, organizations, org_memberships, crews, notification_rules, partner_actors, partner_api_keys, partner_api_logs, partner_event_outbox, partner_idempotency_keys, partner_webhook_deliveries, partner_webhook_subscriptions, epc_underwriting_fees, funding_deductions, workmanship_claims, onboarding_documents, customer_feedback_attachments, ticket_attachments_*, customer_feedback_*.

**Pre-flight C snapshot:** save full `pg_get_expr` output to `docs/plans/2026-04-28-platform-policy-snapshot.json` for rollback.

---

## Phase D — Delete EDGE platform org + 3 memberships

Must run BEFORE Phase C (so Phase C's CHECK constraint can be added without violating an existing row).

**Pre-flight verification — confirm zero FK references:**
```sql
SELECT 'projects' AS t, count(*) FROM public.projects WHERE org_id='1f82d049-8e2b-46d5-9fe2-efd8664a91a5'
UNION ALL SELECT 'invoices.from_org', count(*) FROM public.invoices WHERE from_org='1f82d049-8e2b-46d5-9fe2-efd8664a91a5'
UNION ALL SELECT 'invoices.to_org',   count(*) FROM public.invoices WHERE to_org  ='1f82d049-8e2b-46d5-9fe2-efd8664a91a5'
UNION ALL SELECT 'sales_reps',        count(*) FROM public.sales_reps WHERE org_id='1f82d049-8e2b-46d5-9fe2-efd8664a91a5';
-- If ANY > 0, STOP. Re-home rows to a non-platform org first.
```

```sql
BEGIN;
DELETE FROM public.org_memberships WHERE org_id='1f82d049-8e2b-46d5-9fe2-efd8664a91a5';
DELETE FROM public.organizations
 WHERE id='1f82d049-8e2b-46d5-9fe2-efd8664a91a5' AND org_type='platform';
COMMIT;
```

---

## Phase C — Add CHECK constraint

```sql
ALTER TABLE public.organizations DROP CONSTRAINT organizations_org_type_check;
ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_org_type_check
  CHECK (org_type = ANY (ARRAY[
    'epc'::text, 'sales'::text, 'sales_d2d'::text, 'engineering'::text,
    'supply'::text, 'customer'::text,
    'direct_supply_equity_corp'::text, 'newco_distribution'::text
  ]));  -- 'platform' REMOVED
```

---

## Phase E — Drop the helper (deferred 30 days)

Wait 30 days post-Phase B to absorb any code path discovered in production logs that still calls `auth_is_platform_user()` directly. Pre-flight: zero policy + zero function references. Then:

```sql
REVOKE EXECUTE ON FUNCTION public.auth_is_platform_user() FROM anon, authenticated, service_role;
DROP FUNCTION public.auth_is_platform_user();
```

---

## Critical risks & answers

- **Greg (`greg@gomicrogridenergy.com`):** zero impact. Stays super_admin.
- **Paul:** loses cross-dealer MG visibility at Phase A unless A1 runs first.
- **Service-role workflows:** unaffected — service-role key bypasses RLS entirely.
- **pg_cron:** not installed on MG. No scheduled-job concerns.
- **Direct RPC calls to `auth_is_platform_user()` from client code:** Pre-flight D greps all 4 web repos to confirm zero hits before Phase E.
- **Caching note:** original function caches via `set_config`. Phase A version doesn't. Each `auth_is_super_admin()` is one indexed lookup; with 76 policies could mean 76 lookups per query. If perf regresses, add caching back to Phase A's body. STABLE marker should let the planner inline within a single statement.

---

**VERDICT (planner):** safe to execute as planned, **conditional on Greg's Pre-flight A1 decision (promote Paul to super_admin) before Phase A**. If A1 is declined, Paul loses cross-dealer MG access at Phase A — confirm intended before proceeding.
