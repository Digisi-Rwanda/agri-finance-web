# Production database cleanup

**Do not run deletes against production until you have a backup and a reviewed inventory.**

This runbook removes **demo accounts**, **test transactions**, and other **development-shaped** rows. It does **not** wipe the whole database and **never** deletes `admin@agritrust.rw` by default.

## Scripts (backend repo)

Path: `agri-finance/scripts/prod-cleanup/`

1. `01_inventory.sql` — read-only candidate lists and counts  
2. `02_delete_demo_data.sql` — deletes matching rows inside a transaction  

Copy SQL into the Render Postgres shell (or `psql`), or use the admin preview API below.

## Candidate rules

A **demo/test user** matches any of:

- email `ILIKE '%@example.%'` or `'%@test.%'` or `'%@mailinator.%'`
- email / username starts with `demo`, `test`, `qa.`
- username exactly `demo` / `test`

**Protected:** `admin@agritrust.rw` and username `admin`.

**Demo/test financial rows** also include:

- `payments` / `payment_transactions` tied to demo farmers, or notes containing `demo` / `eKash demo`
- `transactions` (ledger) for demo farmers, or description `ILIKE '%demo%'` / `'%test%'`
- loans, repayments, insurance policies, farms, etc. for demo farmers

Edit the email/username lists in the SQL if your staging used other patterns (e.g. personal Gmail test users)—add them explicitly before delete.

## Procedure

1. **Backup** Render Postgres (dashboard snapshot or `pg_dump`).
2. Run `01_inventory.sql`; export results; get product-owner sign-off.
3. Optionally set `agri.release.cleanup-enabled=true` on Render **temporarily**, then:
   - `GET /api/admin/release/cleanup-preview` (ADMIN JWT)
   - `POST /api/admin/release/cleanup` with body  
     `{ "confirm": "DELETE_DEMO_AND_TEST_DATA", "dryRun": true }` then `dryRun: false`
4. Or run `02_delete_demo_data.sql` in a transaction; `COMMIT` only after row counts look right.
5. Set `agri.release.cleanup-enabled=false` (or unset) again.
6. Rotate bootstrap admin password if it was ever the default `Admin@123456`.
7. Smoke-test real BANK / INSURER / farmer logins.

## What this does not do

- Does not remove legitimate partner banks/insurers seeded for production (e.g. Bank of Kigali) unless you expand the script.
- Does not purge audit logs (kept for compliance); inventory shows counts only.
- Does not replace a full “reset database” — use a fresh DB only if you intentionally want empty prod.
