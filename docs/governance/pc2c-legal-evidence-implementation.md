# P-C2C — Immutable legal document and acceptance evidence

**Internal Working Draft — Pending Legal and Operational Verification**

11 November 2026. **Implemented and tested in isolated local development only. Stop for engineering review.** No customer document was approved or publicly published. P-C2F acceptance does not authorize production legal processing. The [exact-content contract](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2c-legal-content-contract.md) defines the preservation semantics; P-C2A/B governance and the privacy readiness/P-C1 reports remain unchanged baselines.

## Baseline and resulting behavior

Existing authenticated receipts preserve version labels, URLs, acceptance time/source and an optional Clerk timestamp. Their race-safe insertion preserves the original receipt on retry. They do not preserve exact wording, its hash, approval provenance or a receipt-linked publication archive. Mutable URLs/configuration and Git history alone cannot reconstruct what each person accepted. The old User foreign key also cascaded deletion of receipts.

This checkpoint adds a separate synthetic catalog and exact-set acceptance path. It archives canonical bytes, records independent simulated approval and publication provenance, binds authenticated presentation/acceptance to those versions and preserves minimal receipt/event evidence through an explicitly constrained synthetic subject-detachment exercise. Historical receipts are neither reclassified as exact-content proof nor populated with guessed hashes.

The catalog is server-only and requires all of: `COREOPS_LEGAL_CATALOG_REHEARSAL_ENABLED=true`, a numeric/localhost loopback database named `coreops_auth_rehearsal_legal_*` or `coreops_auth_rehearsal_market_legal_*`, and no VERCEL/VERCEL_ENV marker. Documents must begin **SYNTHETIC TEST** and database evidence is constrained synthetic=true. There is no real publication or production enable path. When explicitly rehearsing the catalog, provisioning requires its current exact-set receipt and rejects the legacy label-only acceptance API. With that gate off, the existing legal path remains unchanged and retains its documented limitations; this is not a claim that every ordinary receipt now has exact-content evidence.

## Exact files changed

Earlier uncommitted lifecycle, identity, market, notification, export and P-C1 work remains present. The whole working-tree diff is not this checkpoint's change list.

| Files | P-C2C change |
| --- | --- |
| `prisma/schema.prisma` | Eight legal models, closed enums, User/PlatformAdmin inverse relations; legacy LegalAcceptance User FK changed from Cascade to Restrict. Existing records/models retained. Prisma formatting applied. |
| `prisma/migrations/20261111000300_legal_evidence/migration.sql` | New tables/indexes/relations, hashes/bounds, immutability and consistency triggers, singleton control seed; forward tightening of legacy receipt FK. No historical evidence backfill. |
| `src/server/legal/config.ts` | Named-loopback synthetic-only release boundary. |
| `src/server/legal/content.ts` | Canonical UTF-8 validation, exact SHA-256 and fail-closed reconstruction. |
| `src/server/legal/catalog.ts` | SUPER_ADMIN/MFA simulated approval/publication, exact manifest, supersession/withdrawal, revision locking and reconstruction. |
| `src/server/legal/acceptance.ts` | Live authenticated subject-bound presentations, exact-set receipts/events, idempotency, restricted own-receipt reconstruction and explicit limited historical projection. |
| `src/server/legal/retention.ts` | Independent-admin synthetic subject detachment; explicit unavailable disposal and customer-DPA execution functions. No User/provider deletion service. |
| `src/server/auth/legal-acceptance.ts` | Compose the new current-receipt requirement only in guarded rehearsals; prevent legacy-label submission from satisfying that mode. |
| `src/app/account/legal/rehearsal/{page.tsx,actions.ts}` | Private dynamic escaped-text presentation, separate Terms agreement/Privacy acknowledgment, generic failure and fixed safe navigation. |
| `tests/legal-evidence.integration.cjs`, `tests/legal-fixtures.cjs` | PostgreSQL integrity/concurrency/registration/retention/reconstruction tests and scoped synthetic cleanup. Outbound fetch tripwire. |
| `tests/legal-http-smoke.cjs` | Built loopback denial/no-write checks and temporary server cleanup; limits below. |
| `tests/identity.integration.cjs` | Cleanup explicitly removes only fixture-owned old-format receipts before deleting fixture Users under the new restrictive FK. Identity assertions unchanged. |
| `scripts/legal-migration-fingerprint.cjs`, `scripts/legal-preservation-fixture.cjs` | Guarded disposable preservation evidence and synthetic pre-migration market/legacy-receipt fixture. |
| `package.json` | Adds `test:legal-evidence` through the existing guarded runner. No dependency/lockfile change for P-C2C. |
| This report and `docs/governance/pc2c-legal-content-contract.md` | Engineering contract, evidence, unresolved decisions and stop boundary. |

Generated Prisma client refreshed locally. Public Terms/Privacy pages, existing LegalDocument renderer, legal approval configuration/flags, account legal UI and Clerk provisioning/binding implementation were not rewritten. Lifecycle B/C, N-X, market and notification release gates were not loosened.

## Final model and transitions

| Model | Preserved evidence / invariant |
| --- | --- |
| LegalDocumentVersion | Immutable document kind/version/language, bytes, format/renderer, digest/algorithm/length and creator/time; unique version tuple. |
| LegalVersionReview | Separate immutable SIMULATED_APPROVE or WITHDRAW record, real privileged reviewer and restricted synthetic evidence reference/reason/time. Software approval flags do not create this provenance. |
| LegalPublication | Immutable Terms/Privacy version set and exact approval references, canonical manifest/hash, publisher, publication/effective times. |
| LegalPublicationControl | One REHEARSAL active pointer and fenced revision; updates serialize publication and acceptance. |
| LegalEvidenceSubject | Minimal opaque subject with nullable restrictive User binding, explicit detachment time/review reference. Cannot rebind. |
| LegalPresentation | Subject/set/control revision and bounded presentation/expiry times. |
| LegalAcceptanceEvidence | Exact presentation/subject/set, Terms agreement and Privacy acknowledgment, authenticated source/time; unique subject/set. |
| LegalEvidenceEvent | Independent publication/supersession/withdrawal/acceptance/detachment evidence with constrained references and operation identities. |

Version creation → separate simulated approval → atomic set publication. A later publication appends supersession evidence and moves the active pointer; it does not edit an earlier publication or receipt. Withdrawal appends review/event evidence and clears an affected active set. Reconstructing an old own receipt still uses its original archived documents after supersession/withdrawal. Server timestamps prevent caller backdating. This records a simulated legal-review decision, not counsel approval or public serving.

Bodies are exact canonical UTF-8, not mutable URL content: valid round-trippable bytes, LF, no BOM/NUL/CR, 1–262,144 bytes. No Unicode/newline normalization or repair occurs. SHA-256 covers the entire archived body including whitespace/trailing newline; byte length/algorithm/format/renderer are checked. The manifest additionally binds publication identity, both complete version descriptors, review references, times and acknowledgment semantics. Reconstruction verifies bytes and manifest rather than trusting stored labels. Plain text is escaped by React; no legal-body HTML/Markdown execution. The contract explains authoritative wording versus UI chrome and why evidence does not prove reading, understanding or screen pixels.

CUSTOMER_DPA and other document types can be archived as synthetic catalog versions, but an individual Terms/Privacy set rejects a DPA substitution. **Customer DPA execution remains explicitly blocked.** The contract proposes a distinct business/Workspace, contracting-party, signatory-authority, exact-document, counter-approval, scope/effectivity and execution-event model for separate legal/engineering review. Individual sign-up acknowledgment cannot execute it. Optional processing consent is not collected or inferred.

## Acceptance integrity and security

Central host and live verified Clerk identity are required. Acceptance resolves the existing local User by authoritative external ID, locks it and rechecks binding. No caller userId/email or posted document text supplies authority, and no acceptance flow merges identities. Publication administration independently requires active SUPER_ADMIN, recent strict MFA and current administrator/User binding, rechecked transactionally. No billing/support role or legal configuration flag approves documents.

Presentation locks User then singleton control, reconstructs the active effective nonwithdrawn set and issues a subject-bound five-minute presentation. Twenty presentations/hour is a technical abuse bound, not a retention period. The UI displays exact archived text and separate required checkboxes. Acceptance validates both booleans, subject, presentation, active set/hash and control revision. Stale, replaced, mismatched, withdrawn or expired new acceptance fails. Unique subject/set plus locks makes concurrent retries preserve one original receipt/time; a valid existing receipt can be returned without creating a new expired-presentation acceptance.

Receipt and independent acceptance event commit together. Deferred SQL constraints reject a receipt without its event. Content/hash/length/kinds/review links/presentation relations and update immutability are enforced in PostgreSQL as well as application validation. Publication races serialize on the same control: either an old-set receipt commits before replacement or the stale request fails afterward. No provider I/O is held inside these database transactions.

Own-evidence queries bind to current live identity and return only that subject's archived wording and receipt facts. No public receipt lookup or identity-recovery endpoint was added. Actions return generic failures, preserve framework control flow and introduce no raw exception logging. Database-owner alteration, clock manipulation, backups and external custody are separate operator risks. A digest and reviewer ID in one database are not tamper-proof independent legal custody or a validity determination.

## Historical gaps and erasure limitations

Historical projection explicitly marks **LABEL_URL_ONLY**, `reconstructableFromReceipt=false`. Old labels/URLs/source/times remain unchanged. No hash, version mapping, review, publication or new acceptance event was manufactured. Counsel/custodian must later inventory available exact archives and provenance, document what is provable versus unknown, and approve any prospective re-acknowledgment process without backdating or claiming new acknowledgment proves past wording. No message or live-record modification was performed.

Legacy receipt User deletion now fails through Restrict, preventing accidental evidence loss. New evidence is linked through a minimal subject rather than duplicating name/email/provider identifiers. An independent SUPER_ADMIN may detach only a synthetic target with an explicit synthetic retention-review reference and **no** legacy, business, market, security or other User relations; self/admin targets are denied. Detachment and its event are atomic. The helper does not delete User, invoke Clerk, transfer ownership or erase business evidence. A fixture subsequently deletes its own minimal synthetic User to verify independent evidence survives. Business-linked and legacy-receipt cases remain blocked.

Detached proof retains exact wording/time and opaque subject identity, but cannot identify a particular natural person from its fields alone. Recreated accounts cannot acquire that detached history. This is an explicit minimization/evidential tradeoff for legal review, not irreversible anonymization or an approved real-account workflow. No general rights/last-owner/provider-deletion orchestration is implemented.

`disposeLegalEvidence()` is explicitly unavailable pending legal category schedules/holds and custody. Update immutability does not impose permanent DELETE-denial triggers; restrictive dependencies require a future reviewed disposal order. No indefinite retention period is approved. Backups, shared identities, minimal legally necessary identity proof and independent restore reconciliation remain open. The FK change means future legitimate User erasure must explicitly resolve legacy evidence; it is not a production deletion migration approval.

## Migration and test evidence

The single new migration was finalized before its first isolated application; no applied migration was edited. It is primarily additive, with the explicit non-destructive tightening of the existing FK. Seeded configuration is only a REHEARSAL control row, not documents/approval/acceptance evidence.

| Disposable loopback target | Result |
| --- | --- |
| `coreops_auth_rehearsal_market_legal_261111` | Initial full-chain rehearsal and development tests. |
| `coreops_auth_rehearsal_market_legal_chain_261111` | Final 32-migration chain from empty; final legal/market/domain/P-C1 and built checks. |
| `coreops_auth_rehearsal_legal_preserve_261111` | Clone of synthetic market preservation fixtures plus synthetic pre-migration market/legacy receipt examples. All **44 prior tables / 76 records** matched full prior-column fingerprints after migration. No historical legal backfill. |
| `coreops_auth_rehearsal_exports_nx_legal_261111` | Final-schema isolated C/N-X regression. |
| `coreops_auth_rehearsal_notifications_nd_legal_261111` | Final-schema N-B/C/D suites, run sequentially. |

| Check | Actual result / boundary |
| --- | --- |
| Legal evidence | **15 passed including parent, 14 scenarios**, zero failures: versions/hash/UTF-8/immutability/provenance, unauthorized admin/MFA, set/DPA mismatch, subject tampering/booleans, ten-way receipt idempotency, supersession/stale race, withdrawal, historical limits, ten-way actual provisioning, minimal detachment/recreated identity, business-linked denial, event rollback, exact escaped rendering and expiry/SQL mismatch. |
| Market P-C2F | **15 passed**, zero failures. |
| Authorization/commercial/identity/payment/lifecycle/Proxy | **88 passed**, zero failures. |
| C/N-X exports/recovery | **29 passed**, zero failures. |
| Notifications N-B / N-C / N-D | **26 / 24 / 11 passed**, zero failures; local capture/fake witnesses/HTTP mocks only. |
| P-C1 invoice / safe errors | **9 / 8 passed**, zero failures. |
| Navigation / host / lifecycle policy / auth configuration / independent ZIP format | **4 / 9 / 3 / 3 / 1 passed**, zero failures. |
| Schema validation/generation, empty/populated migration, drift | Passed; final Prisma diff **No difference detected**. Raw checks/triggers additionally exercised by integration tests. |
| Typecheck / focused lint / full lint | Passed; full lint zero errors with 12 existing business-page warnings. |
| Local production build | Passed, including the private rehearsal page; no deployment. |
| Actual built HTTP | **3 loopback route denial checks passed**, selected DB counts unchanged, temporary server stopped. Existing host-policy denial may precede handler; these checks do not establish signed-in route or public-page acceptance. |

An optional public Terms HTTP probe returned an existing host-policy 404 before the legal page. Its failed evidence is retained separately; no routing/provider settings were changed and no public runtime pass is claimed. Public legal source remained unchanged. Real Clerk/MFA/browser, HTTPS, platform IAM/logs/backup and deployed acceptance remain unverified. Synthetic identity/request/cache/provider substitutions do not prove them. Transactions, constraints, fingerprints, persisted rows and local build are real; no live external request or customer record was used.

Reproduce only on an already migrated disposable named loopback database:

```bash
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_market_legal_chain_261111 npm run test:legal-evidence
npm run typecheck
npm run lint
npm run build
COREOPS_COMMERCIAL_REHEARSAL_DB=coreops_auth_rehearsal_market_legal_chain_261111 \
  node --env-file=.env scripts/with-commercial-rehearsal.cjs node tests/legal-http-smoke.cjs
```

Evidence: `/tmp/workflowconnect-legal-{final-chain,preserve,final-tests,market,regressions,pc1,exports,nb,nc,nd,units,auth-config,format-tests,validate,generate,drift,types,focused-lint,lint,build,http,http-public-attempt}.log` and `/tmp/workflowconnect-legal-preservation.json`. New files' final permissions are 0600; early checkpoint-created evidence permissions were tightened only for these new legal files. Existing older checkpoint evidence was not changed. Temporary local storage is not durable approved evidence custody. No customer log/backup contents were inspected.

## Remaining gates and review outcome

**Verified implemented, isolated-only:** exact synthetic byte catalog, separate simulated review/publication history, exact-set subject-bound acceptance/events, stale/concurrent rejection and restricted reconstruction; historical evidence classification; restrictive legacy deletion plus narrowly constrained synthetic detachment.

**Requires legal/operational decisions:** approved real wording, document-specific agreement/notice/consent and business DPA authority, effective/change/withdrawal rules, historical gap treatment, receipt identity evidence, category retention/holds/disposal, actual legal reviewer and protected archive custody. No flag or passing test supplies these approvals.

**Requires separately authorized engineering/release:** real publication/serving integration and immutable archive custody; controlled account-erasure/disposal and independent restore admission; target schema/client compatibility, actual identity/MFA/host/UI and operational evidence. Production code currently has no catalog enable path. The existing noncatalog label path is not retroactively strengthened. Database-owner/backup access, deployed storage/IAM/logging/retention and exact public runtime must be reviewed independently.

No normal/preview/production database, real legal document/approval flag, provider/account setting or deployment changed. No customer communication, real payment, live export/notification/market/lifecycle activation, actual account erasure or customer-data deletion occurred. Synthetic disposable fixtures alone were inserted/removed. **Stop at P-C2C for engineering review. No subsequent checkpoint or production rollout started.**
