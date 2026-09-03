# Release QA — Manual checklist

Complete these passes on **production** (or a production-like staging env with live Paypack sandbox/prod keys as agreed). Check each box and note build/commit when done.

**Environments**

- Web partner portal: `https://agri-finance-web.vercel.app`
- API: Render `agri-finance` service
- Mobile: current store / TestFlight / internal build against prod API

---

## 1. Authentication

### Web (partner)

- [ ] Login with BANK account → lands on role home / loans
- [ ] Login with INSURER → insurance / payments (not farmer repay UI)
- [ ] Login with ADMIN → admin panel reachable
- [ ] Wrong password → clear error, no token stored
- [ ] Forgot password → email received; reset link opens web app and new password works
- [ ] Unverified email (if enforced) cannot sign in until verified
- [ ] Logout clears session; protected routes redirect to login
- [ ] Auth footer shows **Terms** and **Privacy** links (`/terms`, `/privacy`)

### Mobile (farmer)

- [ ] Register with valid Rwanda mobile (+250 7…) + accept Terms/Privacy
- [ ] Email verification (if enabled) before login
- [ ] Login / logout / session restore after kill-app
- [ ] Invalid phone rejected with clear message

---

## 2. Insurance

- [ ] INSURER can create / issue policy for a real farmer ID
- [ ] PENDING policy can be **Activated** → status ACTIVE, `validFrom` ≤ today
- [ ] Policy dates and farmer ID visible to bank on loan screens (coverage badge)
- [ ] BANK **cannot** call insurance CRUD APIs (expect 403)
- [ ] BANK sees message that insurer must issue cover (no auto-create)
- [ ] INSURER Payments: collect premium (MoMo) + history loads
- [ ] Farmer without ACTIVE cover is blocked from loan apply (mobile) / bank sees gate on approve

---

## 3. Loan approval

- [ ] Farmer applies loan (or package) only when ACTIVE insurance exists for **same** farmer ID
- [ ] BANK sees pending loan; approve succeeds when ACTIVE insurance present
- [ ] Approve fails with clear API message when insurance missing / not yet valid / wrong farmer
- [ ] After approve, status updates; pending filter does not hide success incorrectly
- [ ] Reject path works and is audited (if used)

---

## 4. Paypack repayments

**Preconditions:** `PAYPACK_CLIENT_ID`, `PAYPACK_CLIENT_SECRET`, `PAYPACK_WEBHOOK_TOKEN` set on Render; webhook URL registered in Paypack dashboard pointing at `/api/payments/paypack/webhook`.

- [ ] Farmer initiates loan repayment from mobile with own MoMo number
- [ ] Payment row created (`provider=PAYPACK` or equivalent); status moves PENDING → SUCCESSFUL via webhook
- [ ] Successful pay records repayment against loan balance
- [ ] Failed / cancelled payment shows failure reason; no false SUCCESS
- [ ] Insurer premium collect (if used) follows same webhook path
- [ ] PIN never requested or stored by Agri Trust UI
- [ ] eKash demo mode is **off** in production (`EKASH_DEMO_MODE=false`)

---

## 5. Legal pages (smoke)

- [ ] `GET /privacy` returns Privacy Policy HTML (not SPA shell)
- [ ] `GET /terms` returns Terms HTML
- [ ] `GET /support` returns Support HTML with `support@hinga.rw` and Play Store link
- [ ] Mobile “view full policy” / register Terms links open the same URLs
- [ ] Login footer shows Terms, Privacy, Support; farmer CTA opens Play Store

---

## 6. Database cleanup (before declaring prod clean)

- [ ] Backup production DB
- [ ] Run inventory script (see `docs/PRODUCTION_DB_CLEANUP.md`)
- [ ] Review candidate list with product owner
- [ ] Execute delete script or gated admin cleanup
- [ ] Re-verify login with real partner accounts still works
- [ ] Confirm bootstrap admin password was rotated if still using default

---

## Sign-off

| Area | Tester | Date | Pass? |
|---|---|---|---|
| Auth | | | |
| Insurance | | | |
| Loan approval | | | |
| Paypack | | | |
| DB cleanup | | | |
| Legal counsel | | | *(see LEGAL_COUNSEL_REVIEW.md)* |
