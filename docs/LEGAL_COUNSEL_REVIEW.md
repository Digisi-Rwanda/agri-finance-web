# Legal counsel review — Privacy & Terms

**Status:** Draft published at `/privacy` and `/terms` on the partner web app. **Not signed off by counsel.**

## Documents for counsel

| Document | Public URL (after deploy) | Source |
|---|---|---|
| Privacy Policy | `https://agri-finance-web.vercel.app/privacy` | `public/privacy.html` |
| Terms & Conditions | `https://agri-finance-web.vercel.app/terms` | `public/terms.html` |
| Support | `https://agri-finance-web.vercel.app/support` | `public/support.html` |

Mobile app in-app Privacy screen mirrors the same substance (`PrivacyPolicyScreen` + i18n). Registration and auth footers link to these URLs.

## Counsel checklist

- [ ] Privacy Policy reviewed for Rwanda data-protection / consumer rules and partner sharing (banks, insurers, Paypack, hosting, email/SMS, optional AI/weather).
- [ ] Terms reviewed for eligibility, role-based partner use, limitation of liability, governing law, and payment/loan/insurance disclaimers.
- [ ] Company legal name, registration, and contact address inserted where required.
- [ ] “Draft for legal counsel review” banners removed or replaced with counsel-approved effective date.
- [ ] Confirm MoMo PIN / Paypack wording matches the live payment integration.
- [ ] Confirm retention language matches how long loan/insurance/payment records are kept.
- [ ] Provide French (and optionally Kinyarwanda) versions if required for your market.
- [ ] Written approval archived (email/PDF) before marketing “legally reviewed”.

## Product owner actions after approval

1. Replace HTML content with counsel’s final text (keep URLs stable).
2. Sync mobile i18n privacy strings if counsel changed substance.
3. Set production env if using a custom domain:
   - Web: `VITE_TERMS_URL`, `VITE_PRIVACY_URL`, `VITE_SUPPORT_EMAIL`
   - Mobile: `EXPO_PUBLIC_TERMS_URL`, `EXPO_PUBLIC_PRIVACY_URL`
4. Tick this checklist and note the approval date in your release record.
