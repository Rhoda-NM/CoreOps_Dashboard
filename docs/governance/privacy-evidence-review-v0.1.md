# Stravect privacy evidence and legal-review checklist v0.1

**Internal Working Draft — Founder Business Policy, Pending Legal and Operational Verification**

11 November 2026. Owner: Founder, initial privacy lead. This is the single outstanding checklist for the [governance foundation](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/stravect-privacy-data-governance-v0.1.md) and [G01–G10 decision register](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/privacy-decisions-v0.1.md). All items below are **open** unless described as source-only evidence. Proposed responsible roles are not appointments; legal reviewer, backup contact and operational delegates remain to be assigned. No statutory compliance, contract, mailbox, deployment or supplier approval is inferred.

Labels: F founder policy; S source-verified; I isolated engineering; V deployed verification; L legal review; O operational owner/outside-provider evidence. The November 8 audit remains the original baseline, November 11 readiness the closure inventory, and P-C1 the later source remediation overlay. No original finding is silently closed as deployed.

## Legal and business determinations

| ID / linked decision | Question and minimum review evidence | Labels / proposed responsible role |
| --- | --- | --- |
| E01 / G02,G03 | Must Stravect register with Kenyan ODPC as controller, processor or both? Assess actual activities, turnover, employee count and mandatory activity/category exclusions from exemptions; record current registration or reasoned applicability/exemption conclusion and review triggers. Assess formal DPO requirements separately. | **L/O** Founder + qualified legal reviewer. No threshold-based exemption declared. |
| E02 / G01,G03,G06 | What duties arise from worldwide account registration and indirect collection, even before workspace access? Map actual countries, offering/targeting, people/customer activities, territorial reach, cross-border rules and any representative/DPIA requirements. Kenya-first is not a jurisdictional exemption. | **L/O**, then **V** for real flows; founder + legal reviewer. |
| E03 / G10 | Verify proprietor legal name, legally appropriate address, registered trade name and particulars; approve contracting identity and appropriate public disclosure. | **F/L/O** Founder supplies protected evidence; legal reviewer confirms wording. Unknown fields remain placeholders. |
| E04 / G03,G09 | Approve activity-specific controller/processor/basis matrix, customer instructions and DPA obligations, indirect employee/client/invitee notices, sensitive/free-text restrictions and high-risk assessment triggers. | **F/S/L/O** Legal reviewer + founder; actual customer contracts required. |
| E05 / G04 | Identify applicable statutory financial/legal/security schedules, category/start-event/minimization/expiry actions, justified exceptions and hold authority/review/release. Include global identity, invitations, export/auth metadata, grants, queue/provider evidence/suppressions/witnesses, support/logs/backups. | **F/I/L/O** Legal reviewer + founder; no invented number of years. |
| E06 / G05 | Determine rights, territorial response/extension clocks, receipt triggers, identity/representative evidence, customer coordination, reasons/exceptions and appeals/regulator routes. Validate all-store scope rather than Owner ZIP only. | **F/I/L/O** Legal reviewer + assigned rights handler. |
| E07 / G07 | Determine incident notification thresholds, awareness triggers, deadlines, responsible controller/processor, customer/supplier/regulator/individual duties and approved communications/record retention. | **F/L/O** Legal reviewer + founder; backup/technical lead to appoint. |
| E08 / G08 | Review Terms, Privacy, customer DPA, retention schedule and applicable cookie notice; approve document-specific agreement/notice/consent semantics. Confirm exact-content archive, hashing/custody, languages, changed versions, receipt retention on account deletion and historical missing-content treatment. | **F/S/L/O**, later **V**; legal + engineering reviewer. No flag constitutes legal signoff. |

### Official legal starting points checked on 11 November 2026

Use the [ODPC laws index](https://www.odpc.go.ke/data-protection-laws-kenya/index.html), [registration regulations](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-REGISTRATION-OF-DATA-CONTROLLERS-AND-DATA-PROCESSORS-REGULATIONS-2021.pdf), [ODPC registration FAQ](https://www.odpc.go.ke/faqs/) and [rights guidance](https://www.odpc.go.ke/rights-of-a-data-subject/index.html) as starting points for qualified review. ODPC describes combined size criteria and activity exclusions for registration exemptions; Stravect's facts have not been established against them. This is not a determination that any exemption applies. Verify current law/regulations and activity-specific duties, not just summaries. No universal rights-response or breach-notification duration is approved by this draft.

## Supplier and transfer evidence

**E09 / G06 — all rows open (L/O/V).** Founder must assign a supplier evidence owner and legal reviewer. For each row collect actual account/entity/product, role/purposes/data, applicable terms/DPA, subprocessors, all storage/log/support/backup countries, transfer mechanism/assessment, IAM/MFA, encryption/key custody, retention/deletion/restoration, incident contacts and owner/review date. Public vendor policy availability is not evidence of incorporation into the actual arrangement. Do not activate a new flow on this checklist's existence.

| Supplier | Source starting point / targeted missing evidence |
| --- | --- |
| Clerk | [Live identity checks](/home/rmuya/rhoda-work/coreops_dashboard/src/server/auth/clerk-identity.ts); actual instance/session/device/cookie processing, contracts, subprocessors, self/admin deletion, MFA/recovery and retention. |
| Google | [Scope-readiness attestation](/home/rmuya/rhoda-work/coreops_dashboard/src/lib/auth/registration-readiness.ts); actual OAuth request/consent/scopes, account linkage, roles and transfer terms. No Gmail/Drive access requested by app source is not proof of actual provider scopes. |
| Vercel | [Configuration](/home/rmuya/rhoda-work/coreops_dashboard/next.config.ts) and [P-C1 logging](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-safe-logging.md); actual project/revision, logs/drains/body capture, regions/IAM/read/export/retention and applicable contract. No production settings checked. |
| Neon/PostgreSQL | [Database client](/home/rmuya/rhoda-work/coreops_dashboard/src/server/db/prisma.ts); actual target/account/entity, database/branch/restore privileges, region/PITR/off-host copies, pool/storage capacity and retention/key custody. No cloud target queried. |
| Paystack | [API client](/home/rmuya/rhoda-work/coreops_dashboard/src/server/payments/paystack.ts); merchant/mode/channels, subscription-only payload, transient verification/webhook data, provider roles/terms/countries/retention and incident contacts. Payment verification is not market approval. |
| Resend | [External transport throws](/home/rmuya/rhoda-work/coreops_dashboard/src/server/notifications/resend/release.ts:4); only isolated REST/Svix mocks. Any future account/domain/keys/contract/regions/callback/delivery/retention evidence needs separate release approval. No live relationship or sending claimed. |
| Support mail, financial institutions and other tooling | [Configured support](/home/rmuya/rhoda-work/coreops_dashboard/src/config/auth.ts:15); identify actual mailbox host, forwarding, attachments/access/security/retention. Identify manual banks/M-Pesa recipients and statements; inspect monitoring, log drains and injected analytics rather than presume absent. |

## Operational and source acceptance evidence

| ID / linked decision | Required evidence / boundary | Labels / proposed owner |
| --- | --- | --- |
| E10 / G01 | Approved market eligibility criteria/reviewer, separate decision identity, inquiry path before workspace creation, minimal evidence and enforcement across onboarding/activation/access; existing workspaces and revocation treatment reviewed. | **F/S-gap/L/O/V** Founder + future engineering lead. No implementation authorized here. |
| E11 / G02,G05,G07 | Confirm proposed privacy mailbox delivery, restricted access, coverage/backup and secure verification; appoint backup incident contact and case owners. Create blank workflow/tooling design and exercise synthetic requests/incidents before any real records. | **F/O/V** Founder. Proposed address remains unconfigured/unverified. |
| E12 / G05,G07 | Approved restricted rights/incident registers, authority checks, clocks/escalations, customer coordination, secure response/containment, outcome/evidence schedules and tabletop rehearsal. No credentials in evidence. | **F/L/O/V** Assigned operators + legal reviewer; no personal cases created in P-C2A. |
| E13 / G04,G06,G08 | Provider and independent backup inventory, durations/regions/encryption/access, whole-environment restore quarantine, completed-deletion and accepted/UNKNOWN/suppression reconciliation. Prove old backups cannot reactivate deleted data or resend messages. | **I/L/O/V** Operations + future separately approved engineering. Local file/fake-ledger witnesses do not satisfy independence. |
| E14 / G02,G03 | Real Clerk identity/MFA/deletion/last-owner recovery; tenant/role/API/RSC authorization and infrastructure access reviews. Last-owner app mutation guards do not block provider administrator deletion. | **S/O/V** Security/operator roles to appoint; no dashboard/browser test in P-C2A. |
| E15 / G08,G09 | Actual cookie/network/storage inventory including provider/platform-injected technology, URL/referrer/body-capture behavior, free-text handling and minimized customer instructions. | **S/L/O/V** Legal + security review; no universal cookie-consent conclusion. |
| E16 / G04,G06 | N-X generation/artifact/token/grant boundary, cleanup/monitoring, key availability, workload/storage/WAL/PITR and actual streaming acceptance; notification recipient/lead-time/evidence policies and independently durable admission. | **I/L/O/V** Future export/notification/operations reviewers. No real sending or lifecycle rollout approved. |
| E17 / P-C1 | Preserve source-only containment acceptance, verify deployed matching build, referrer/cache behavior, log readers/exporters/drains/retention and safe support-reference procedure. Older temporary evidence permissions/custody remain review items. | **S/O/V** Security + operations; no claim every framework log is sanitized. |
| E18 / all | Durable protected custody of original audit, decision approvals, legal/provider evidence, acceptance results and review history. Track historical unresolved items without overwriting the baseline. | **O** Founder assigns custodian; temporary test logs and this Git working tree are not a complete legal evidence archive. |

## Recommended later P-C2 decomposition — proposals, not approvals

| Proposed checkpoint / order | Reviewable outcome | Exit gate / independence |
| --- | --- | --- |
| **P-C2B — applicability and responsibilities** | Confirm proprietor, jurisdictions, ODPC/DPO questions, lawful purposes/roles, customer DPA requirements, category schedules/holds and rights/incident clocks. | Legal + founder review of E01–E08; decisions documented without publishing or declaring deployment. Supplier/owner evidence gathering may proceed independently under its own authorization. |
| **P-C2C — immutable legal evidence engineering** | Reviewed additive version/catalog/approval/hash/archive/receipt design; preserve exact bytes and acceptance provenance through publication changes/account deletion; explicitly handle unprovable old text. | Separate code/schema approval and isolated migration/concurrency/reconstruction/preservation tests; legal approval and publication remain separate final gates. |
| **P-C2D — supplier evidence and transfer admission** | Account-specific register and restricted evidence custody, documented legal/technical reviews and supplier/flow activation criteria. | E09/E13 reviewed for actual services; no automatic provider configuration or live Resend approval. |
| **P-C2E — managed rights and incident operations** | Appointed owners/backup, tested channel, restricted case workflow, verified clocks/authority, controller coordination and synthetic end-to-end rehearsals. | Legal/operational signoff on E06/E07/E11/E12 before operating procedures or tooling are represented as ready. Real case handling remains separately authorized. |
| **P-C2F — market and disclosure integration design** | Separate worldwide account/inquiry from market-eligible operational workspace, funding and activation; reconcile cookie/product restrictions and policy wording with real source behavior. | Founder/legal/engineering review before implementing gates or editing public legal documents. No backwards inference of customer eligibility. |
| **Later explicit production acceptance/publication** | Real target identity/IAM/cookies/logs/backup/capacity evidence and final legal document reconciliation; feature-by-feature release contract. | Separate authorization to publish, migrate or deploy. Controlled deletion/Lifecycle D, live day-60 enforcement and notification sending retain independent gates. No automatic progression from P-C2. |

Source security fixes do not settle financial launch findings (including invoice-number uniqueness/idempotency), supplier assurance or universal rights fulfillment. Controlled deletion and restore reconciliation require their separately approved engineering checkpoint; this documentation does not start it.

## P-C2A document verification and exact change record

Created only:

1. `docs/governance/stravect-privacy-data-governance-v0.1.md`
2. `docs/governance/privacy-decisions-v0.1.md`
3. `docs/governance/privacy-evidence-review-v0.1.md`

Checked ten decision IDs, all requested governance sections, draft labels, source links, contradictions and open review items. No application tests/builds/migrations were required or run for documentation-only changes. Existing readiness/P-C1 reports, legal pages, source, schema and earlier uncommitted work were not modified. No database, `.env`, provider, deployment, gate, customer data, email, incident or privacy-request record was accessed/changed/created. Public official documentation was read only. **Stop for P-C2A review before further implementation.**


## P-C2B review preparation — 11 November 2026

**Internal Working Draft — Founder Business Policy, Pending Legal and Operational Verification**

P-C2A was accepted as the internal working baseline. The [P-C2B applicability report](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-legal-applicability-review.md), [activity/DPA matrix](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-activity-responsibilities.md), [retention/exception matrix](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-retention-decisions.md) and [rights/incident and reviewer handoff](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-rights-incidents-handoff.md) now prepare E01–E08 and related E09–E18 decisions. The report contains founder facts F01–F08, unresolved legal decisions L01–L11 and authoritative sources K01–K10 with retrieval/currency limits.

Research identifies distinct Kenyan request clocks, portability extension consultation, registration wording questions and current DPO guidance requiring full legal review. These are preparation results, **not closure of any E-row**, a registration exemption, an approved retention schedule or proof of compliance. All founder G01–G10 decisions and historical evidence remain unchanged. Only this cross-reference was added to the checklist; four new internal review documents were created. No application, database, provider, legal publication, release gate or live-data change was made. Stop for founder and legal review.
