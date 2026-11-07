# WorkflowConnect rebrand and UX implementation

7 November 2026. Implemented locally; no production deployment, database migration, data deletion or external account configuration change was performed. Product name and `workflowconnect.io` remain subject to owner approval, domain ownership and trademark clearance.

## 1. Design audit

The previous site used a dark indigo/slate palette, an agency-specific “command center” message, and inconsistent CoreOps labels across marketing, authentication, workspaces and administration. The old demo included unsupported testimonials/performance percentages and a simulated launch sequence. It was not a trustworthy source of product/usage evidence for the redesign.

Reusable foundations already existed: Tailwind tokens, Card/Badge/Button components, workspace-aware links, desktop role-filtered navigation, Clerk native authentication, and published subscription offers with tax calculation. The redesign extends these rather than rebuilding the application.

Primary risks identified:

- Public prices must continue to come from approved/published catalog records; provisional introductory prices must not appear in marketing.
- A new “Get started” label must not imply that production registration, legal acceptance, billing, merchant configuration or activation have been approved.
- STAFF marketing/application views must not imply financial permission. The public dashboard illustration is explicitly an owner view with sample data.
- Terms/Privacy text can use the new product name, but document version IDs, approved URLs and historical receipts cannot be silently renamed or accepted anew.
- Clerk display branding is an external setting; application IDs, identity bindings and auth checks must remain intact.
- Public metadata endpoints must be reachable without authentication; private routes must remain protected.

## 2. Design system

The public site uses warm-white `#F7F8F5` surfaces, deep teal `#143D3B` identity, charcoal `#192B32` text, muted `#52635F` body copy and restrained accent teal. The suggested bright accent is decorative; darker `#147D70`/`#147165` tones provide readable button/focus contrast.

The authenticated application keeps a dark interface, using teal-based `core` tokens (`#0E2425` background, `#102C2C` surface, `#173434` cards, readable pale text). This avoids changing operational status semantics while connecting the product visually to the public site. Financial calculations and permissions are not styling inputs.

Typography uses a local sans-serif stack preferring Inter when available, then system fonts. No external font download, animation library or raster hero image was added. Headings use tighter tracking, clear hierarchy and responsive type scaling. Public sections share container, spacing, button and focus styles. Motion is limited to small hover transitions and disabled under reduced-motion preferences.

A new original W/path-and-node SVG mark is shared by `Brand` and `BrandMark`. Replace/refine the logo centrally without rewriting layouts. Assets include icon-only, light/dark wordmarks, favicon, generated PNG Apple icon, and a generated Open Graph image. These are proposed design assets, not trademark-cleared marks.

## 3. Public experience

`/` now contains all requested sections: responsive navigation, focused hero, disconnected-tools problem, connected-records diagram, six feature areas, three-stage onboarding explanation, customer segments, secondary future-portal concept, catalog-backed pricing, security principles, FAQ, final contact CTA and Stravect attribution/footer.

The hero and feature cards use native HTML/SVG and shared application Card/Badge components. All counts, client/project names, tasks and progress values are labelled illustrative sample data. No customer quote, logo, adoption statistic, certification or performance outcome is invented.

`/pricing` shares the public header/footer and Pricing component with the landing page. Solo/Starter/Business/Enterprise descriptions explain seat allowances. Only records returned by the existing published-offer service render amounts and monthly/annual intervals. VAT/payable display calls the existing exact tax calculation; no new pricing arithmetic or VAT assumption was introduced. Without published offers, visitors see availability/contact messaging, not draft prices.

The CTA defaults to a functional early-access email to the existing approved support address. This is an email contact action, not a silently stored lead or an automated signup promise. `COREOPS_PUBLIC_ONBOARDING_READY=true` enables “Get started” only when published offers exist and the existing registration-readiness check succeeds. This flag controls presentation; it grants no business access and does not bypass backend registration/activation policies.

`/demo` is now a clearly labelled static product preview. It creates no workspace, launches no trial and navigates to no customer dashboard. Unsupported demo testimonials, percentages, fake security assurances and launch progress have been removed.

The future client portal is marked **Post-MVP concept / not currently available**, has no launch button and no promised release date. The relationship diagram describes connected records, not automatic workflow execution.

## 4. Application and identity continuity

User-facing branding was updated on authentication, recovery/help, onboarding, dashboard, quick add, subscription pages, payment-return messaging, settings, legal drafts and platform administration. Shared dark tokens and Clerk's supported appearance variables align native widgets with the product palette.

Desktop and new mobile workspace navigation call the same `visibleDashboardNav` helper. Its filters preserve the previous OWNER/MANAGER/STAFF visibility exactly. All existing server permissions/resource/seat/activation checks remain authoritative. Mobile navigation has explicit controls/expanded state and Escape handling. Placeholder global search and bell buttons that had no implementation were removed from the header rather than presented as working features.

Intentionally retained technical/historical names:

- Prisma models, tables, applied migrations, database names and legacy workspace slugs/data.
- Clerk identity IDs, memberships, API configuration keys and authentication routes.
- `COREOPS_*` environment keys, internal request headers/cookies, gateway metadata/references and historical audit records.
- Existing provisional `COREOPS-TOS-v1.0` / `COREOPS-PRIV-v1.0` identifiers and configured legal URLs. Rebranded legal drafts remain explicitly unapproved. They require new reviewed versions/URLs/effective dates before production use; the redesign does not record acceptance.
- Existing screenshots/assets remain unreferenced historical files; the new public experience does not present old screenshots as the rebranded application.

The registration-readiness check still requires the provider's configured application display name to match the product. It now expects WorkflowConnect instead of CoreOps. Configure/verify that display name in Clerk and the relevant Google consent/branding experience before production registration is declared ready. The check was not weakened, no provider identity was renamed, and no external Clerk setting was changed in this task.

## 5. Metadata and domain configuration

New shared brand configuration, page titles/descriptions, Open Graph/Twitter metadata, manifest, favicon/Apple icon, robots and sitemap routes are implemented. Public metadata endpoints were added to the proxy's explicit public allowlist after Lighthouse revealed that robots/social-image requests were reaching Clerk instead. Existing private routes and authorization tests remain protected.

`COREOPS_CANONICAL_URL` accepts a verified HTTPS origin only; no proposed domain is hardcoded as a canonical. Until ownership and launch approval are complete, indexing stays disabled. Enable `COREOPS_PUBLIC_INDEXING_ENABLED=true` only with the verified canonical origin and a non-preview environment. Protected layouts remain no-index. Draft legal documents do not enter the sitemap.

Owner configuration checklist:

1. Approve the WorkflowConnect name and visual identity; complete trademark/domain clearance. Do not assume the proposed domain is owned.
2. Configure the verified canonical origin after the domain is secured and connected. Keep previews no-index.
3. Update Clerk display branding/Google consent branding and review allowed origins/redirects without replacing Clerk identities or keys. Native authentication still needs real-session validation.
4. Review rebranded Terms/Privacy drafts and assign approved document versions, URLs and effective dates. Retain historical acceptance evidence.
5. Update existing application-origin/payment callback configuration only through the normal environment/deployment review. Internal `COREOPS_*` keys are unchanged.
6. Enable public onboarding presentation only after legal, offer, billing and browser acceptance requirements have been met. Until then, early-access contact is intentional.

## 6. Verification

| Check | Result and limitation |
| --- | --- |
| TypeScript | `npm run typecheck` passed with generated Next routes and the installed Clerk appearance types |
| Production build | `npm run build` passed, including generated PNG social/Apple assets; no deployment |
| Full lint | No errors; 12 existing unused-import warnings in operational pages |
| Existing integration suite | 60 tests passed against isolated PostgreSQL, including authorization, assignments, identity collisions, subscription/seat rules, payment confirmation, private administration and public metadata routing |
| Auth configuration | Direct regression program passed; production branding/readiness remains fail-closed |
| Brand experience | Five direct Node tests passed: honest sample/roadmap/availability content; approved monthly/annual price rendering; canonical/indexing guards; shared role navigation; nonmutating static demo |
| Additional regressions | Prisma cache and status-control programs passed |
| Public route smoke | `/`, `/pricing`, `/demo`, `/terms`, `/privacy`, `/sign-in`, `/sign-up`, `/platform/sign-in` return 200 on the isolated preview; unauthenticated onboarding/platform operations redirect (307) |
| Metadata route smoke | robots/sitemap/manifest/SVG and generated PNG image endpoints return 200 with appropriate content types; robots correctly disallows indexing until configured |
| Branding scan | No CoreOps text remains in TSX production UI. The only old branded domain literals in TypeScript are the deliberately retained provisional legal URL defaults; technical keys and historical IDs remain unchanged |
| Visual review | Lighthouse viewport and full-page captures inspected at 1350px desktop and 412px mobile. Mobile content stacks into readable single-column sections; sample visuals remain contained. Captures are anonymous public content, not a signed-in customer session |
| Manual interactions/auth | No completed signed-in Clerk/browser acceptance, assistive-technology pass, or manual keyboard/touch walkthrough is claimed. Native auth routing/server policies are covered automatically; actual provider UI, menu interactions and role-specific live sessions still need human acceptance |

### Lighthouse 13.6.0 lab results

Audits ran in headless Chrome against the built app on `localhost:3100`, using an isolated rehearsal database and default mobile/desktop emulation. These are local lab measurements, not production field Core Web Vitals.

| Metric | Desktop | Mobile |
| --- | --- | --- |
| Performance | 95 | 77 |
| Accessibility | 100 | 100 |
| Best practices | 77 | 77 |
| SEO | 63 | 63 |
| LCP | 0.7 s | 3.6 s |
| Total blocking time | 20 ms | 420 ms |
| CLS | 0 | 0 |

The initial audit found missing progressbar roles and a skipped heading level in the sample preview; these were corrected, and both final accessibility scores are 100. Automated accessibility scoring is not WCAG certification or a replacement for manual testing.

Mobile performance remains below the desired target. The audit identifies substantial unused JavaScript from development Clerk assets; keep the established authentication architecture intact for this redesign, then review provider-loading/performance work separately and remeasure with production configuration. Best-practices deductions include development Clerk third-party cookie/DevTools warnings and cache behavior. SEO deductions reflect intentional no-index/crawl restrictions while the domain/launch is unapproved. Indexing was not enabled merely to improve a score.

Private local evidence: `.backups/rebrand-qa/{desktop,mobile}.report.{html,json}`, `{desktop,mobile}-viewport.jpg` and sanitized `summary.json`. Reports are git-ignored because raw third-party audit details may include development request identifiers; do not publish them without review. The temporary preview server is stopped after verification.

Useful commands:

```sh
npm run typecheck
npm run lint
npm run build
npm run test:brand
node tests/auth-configuration.test.cjs
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_release_20261107 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node --test --test-concurrency=1 \
    tests/commercial.integration.cjs tests/authorization.integration.cjs \
    tests/identity.integration.cjs tests/proxy.test.cjs tests/paystack-vat.integration.cjs
```

## 7. Outstanding approvals and boundaries

Brand/trademark/domain clearance, final logo approval and rebranded legal versions are pending. External Clerk/Google branding, actual signed-in desktop/mobile flows, manual accessibility/keyboard checks and production mobile-performance remeasurement remain unverified. The independent cloud-provisioning, merchant/VAT/fiscal-document, bootstrap and deployment blockers in [fresh deployment readiness](fresh-deployment-paystack-vat.md) still apply.

Implemented operational features remain clients, projects, tasks, assignments, role-controlled invoice records, dashboard, workspace/team access and the controlled subscription process. Client portal access, shared milestones/documents/client communication and automated workflow execution are not being launched through this redesign.

## Changed files and routes

Public routes: `/`, `/pricing`, `/demo`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/icon.svg`, `/apple-icon`, `/opengraph-image`. Branding/layout updates also cover existing auth, legal/help, account, onboarding, workspace and platform routes; their business URLs and server permission matrix are unchanged.

Files changed in this implementation:

- `docs/workflowconnect-rebrand.md`
- `package.json`
- `public/brand/workflowconnect-dark.svg`
- `public/brand/workflowconnect-light.svg`
- `public/brand/workflowconnect-mark.svg`
- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/sign-in/[[...signin]]/page.tsx`
- `src/app/(auth)/sign-up/[[...signup]]/page.tsx`
- `src/app/(onboarding)/layout.tsx`
- `src/app/(onboarding)/onboarding/page.tsx`
- `src/app/account/[[...account]]/page.tsx`
- `src/app/account/error.tsx`
- `src/app/account/layout.tsx`
- `src/app/account/legal/page.tsx`
- `src/app/account/recovery/page.tsx`
- `src/app/apple-icon.tsx`
- `src/app/auth-help/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/demo/page.tsx`
- `src/app/globals.css`
- `src/app/icon.svg`
- `src/app/invitations/layout.tsx`
- `src/app/layout.tsx`
- `src/app/manifest.ts`
- `src/app/opengraph-image.tsx`
- `src/app/page.tsx`
- `src/app/payments/layout.tsx`
- `src/app/payments/paystack/return/page.tsx`
- `src/app/platform/(protected)/layout.tsx`
- `src/app/platform/(protected)/security/page.tsx`
- `src/app/platform/access-denied/page.tsx`
- `src/app/platform/error.tsx`
- `src/app/platform/layout.tsx`
- `src/app/platform/sign-in/[[...sign-in]]/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/privacy/page.tsx`
- `src/app/robots.ts`
- `src/app/sitemap.ts`
- `src/app/terms/page.tsx`
- `src/app/w/[workspaceSlug]/activity/page.tsx`
- `src/app/w/[workspaceSlug]/clients/[clientId]/page.tsx`
- `src/app/w/[workspaceSlug]/dashboard/page.tsx`
- `src/app/w/[workspaceSlug]/error.tsx`
- `src/app/w/[workspaceSlug]/layout.tsx`
- `src/app/w/[workspaceSlug]/projects/page.tsx`
- `src/app/w/[workspaceSlug]/settings/page.tsx`
- `src/app/w/[workspaceSlug]/subscription/page.tsx`
- `src/app/w/[workspaceSlug]/tasks/page.tsx`
- `src/components/auth/AuthShell.tsx`
- `src/components/auth/LegalDocument.tsx`
- `src/components/brand/Brand.tsx`
- `src/components/commercial/CommercialForm.tsx`
- `src/components/marketing/Pricing.tsx`
- `src/components/marketing/SiteFooter.tsx`
- `src/components/marketing/SiteHeader.tsx`
- `src/components/marketing/WorkspacePreview.tsx`
- `src/components/ui/Badge.tsx`
- `src/components/ui/layout/Header.tsx`
- `src/components/ui/layout/MobileNavigation.tsx`
- `src/components/ui/layout/Sidebar.tsx`
- `src/config/brand.ts`
- `src/config/dashboard-nav.ts`
- `src/features/memberships/InvitationForm.tsx`
- `src/features/quick-add/components/QuickAddButton.tsx`
- `src/features/quick-add/components/QuickAddDialog.tsx`
- `src/features/quick-add/components/QuickInvoiceForm.tsx`
- `src/features/workspaces/components/WorkSpaceOnboardingForm.tsx`
- `src/proxy.ts`
- `src/server/auth/clerk-configuration.ts`
- `src/server/commercial/marketing.ts`
- `src/server/payments/paystack.ts`
- `tailwind.config.ts`
- `tests/auth-configuration.test.cjs`
- `tests/brand-experience.test.cjs`
- `tests/proxy.test.cjs`
- `docs/launch-readiness.md`

## Landing simplification — 7 November 2026

The homepage now focuses on a larger hero, four brief benefits, three onboarding steps and a pricing link. Detailed features moved to the new public `/features` page; plan details remain on `/pricing`. Shared desktop/mobile navigation and footer link directly to both routes. The feature page retains role/assignment boundaries and explicitly labels the future client portal as unavailable. Pricing still uses the approved catalog and exact tax calculation; no provisional prices were published.

Marketing body copy is 18px, primary hero copy 20–24px, navigation/buttons 16px, with larger section and hero headings. These changes are scoped to marketing styles. The homepage no longer fetches catalog/tax/auth-readiness data; accessing accounts still uses `/sign-in` and existing server authorization is unchanged.

Verification: six brand regression checks and the proxy regression program passed; TypeScript, focused ESLint and whitespace checks passed. Browser inspection covered desktop and 390px mobile landing layouts, mobile menu → Features navigation and Features → Pricing navigation. The viewport override was reset after review. No authenticated, payment, database or deployment actions were part of this UI change.

## Pricing display approval and card redesign — 7 November 2026

The user explicitly approved public display of Solo KES 1,500/month or 15,000/year, Starter 2,900/month or 29,000/year, Business 7,900/month or 79,000/year, and Enterprise by quotation. Display values are recorded in `src/config/public-pricing.ts`; this approval does not approve tax charging, publish commercial database offers, enable checkout, or authorize activation. Server-published offers take precedence when available. Checkout continues to require an approved request and immutable commercial/tax snapshots.

Pricing now has an accessible monthly/annual switch, aligned plan cards, exact string-formatted KES amounts, clear membership and feature lists, a highlighted Business card, account-entry CTAs, Enterprise contact and a short FAQ. Removed customer-facing catalog-readiness notices and internal offer-version labels. A concise quotation/payment explanation remains. Legal approval status has not changed.

Six brand regression checks, TypeScript and focused lint passed. Browser review covered desktop cards, switching annual prices to 15,000/29,000/79,000, and a 390px mobile layout. No payment was initiated, no commercial database offer was published, and no deployment occurred. The display-price approval supersedes earlier public-price approval blockers only; payment, tax, legal and production readiness requirements remain independently applicable.
