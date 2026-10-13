# Phase 54: Legal, Privacy & Accessibility Compliance

## Context & Decisions

This phase aims to implement required compliance pages, banners, form consents, and UI enhancements to meet legal regulations (GDPR, CCPA) and App Store guidelines.

### Decisions
- **Business Details**: 
  - Name: Virat Bio Plaantec private limited
  - Address: SECOND FLOOR, SHOP NO-213, SAHITYA ICON, NEAR SHAMSHAN GRUH, NARODA GIDC, Ahmedabad, Gujarat, 382330
  - Email: developer@viratbioplaantec.com
- **Age Verification**: Minimum age is 18.
- **Unnecessary Data / Dark Patterns**: User confirmed no fields are unnecessary and there are no dark patterns.

### Tasks
- Add legal pages (`/privacy-policy`, `/terms-of-service`, `/cookie-policy`, `/data-deletion`)
- Create a global `CookieBanner` in `layout.tsx`
- Add consent and age verification checkboxes to signup/login forms.
- Review images for `alt` text.
- Add unsubscribe link to `src/server/lib/communication.ts`.
