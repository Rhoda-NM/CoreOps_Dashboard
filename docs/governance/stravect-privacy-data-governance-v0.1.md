# Stravect Systems — WorkflowConnect privacy and data governance v0.1

**Internal Working Draft — Founder Business Policy, Pending Legal and Operational Verification**

11 November 2026. Internal owner: Founder, initial privacy lead. This records the founder's P-C2A decisions; it is not legal certification, a customer contract, a public notice, supplier approval or production release authorization.

## 1. Purpose, scope and evidence discipline

This foundation covers WorkflowConnect account, workspace, commercial, authentication, support, technical, export/recovery and notification processing. It applies to Stravect's proposed practices and future release decisions, including registrations outside Kenya. It does not authorize activation of any processing currently gated off.

The [decision register](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/privacy-decisions-v0.1.md) is the authoritative index of the ten founder decisions and their source traceability. The [evidence checklist](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/privacy-evidence-review-v0.1.md) owns outstanding questions and proposed later checkpoints. Those documents reference this policy rather than create competing schedules or approvals.

Evidence baseline: the complete 8 November audit supplied in this conversation, the [11 November readiness report](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-compliance-readiness.md), and accepted isolated [P-C1](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-checkpoint-pc1.md). The original audit is supplied conversational evidence; this checkpoint does not claim a separately archived original artifact. Preserve its approved source/custody in the later evidence checkpoint. P-C1 supersedes the readiness report's raw quick-invoice defect description **in source only**; the historical baseline remains unchanged. No live exposure was demonstrated.

Use these explicit labels, which may coexist:

| Label | Meaning |
| --- | --- |
| **Founder-approved business policy (F)** | Working decision supplied by the founder; no independent legal/operational approval implied. |
| **Existing implementation verified in source (S)** | Current repository has the specified control; deployed revision and operation remain unproven. |
| **Isolated-only engineering (I)** | Implemented behind rehearsal/simulation restrictions; unavailable as approved live processing. |
| **Requires deployed verification (V)** | Real target, browser, identity, logs, headers, jobs or runtime evidence outstanding. |
| **Requires legal review (L)** | Activity/jurisdiction-specific determination, contract, wording or schedule outstanding. |
| **Requires an operational owner or outside provider evidence (O)** | Named responsibility, real service arrangement, settings or operational record outstanding. |

These labels do not replace the readiness report's Implemented/Partial/Not Implemented/External classifications. No control is certified here as deployed and operational. P-C2A used source/document reads and public official legal references only, with no tests, builds, database queries, dashboards or customer records.

## 2. Business identity and accountability

**F:** Stravect Systems is a registered sole proprietorship in Kenya, as represented by the founder, and provides WorkflowConnect. Do not call it a limited company. The legally correct contracting formulation is **[proprietor legal name — confirmation required], trading as Stravect Systems**. Registered/service address, business registration particulars and appropriate public contact details require confirmation; no identity/address is invented here.

The founder is the initial internal privacy lead and coordinates decisions, rights requests, suppliers and incidents. This assignment does not designate a statutory DPO. Formal DPO and ODPC controller/processor registration obligations and possible exemptions require assessment. A sole-proprietor or small-business label does not itself establish an exemption.

Proposed privacy contact: `privacy@stravectsystems.com` — **not confirmed configured, monitored or usable**. Existing source defaults support to `info@stravectsystems.com`; its mailbox operation is also unverified ([configuration](/home/rmuya/rhoda-work/coreops_dashboard/src/config/auth.ts)). Do not redirect users to the proposed address or represent it as an operating rights channel until tested. A backup incident contact must be appointed before production. Founder owns appointing qualified operational roles; named delegates and legal reviewer remain unassigned.

## 3. Activity-specific responsibilities

**F/L:** Customer businesses generally control operational personal data. Stravect generally processes workspace information for those customers and controls its own account administration, billing, security and direct support. These are working classifications requiring activity-specific review; mixed purposes and supplier roles must not be inferred from a table alone.

| Activity | Working responsibility | Required boundary / unresolved decision |
| --- | --- | --- |
| Customer clients, projects, tasks, employee assignments and business invoices | Customer generally controller; Stravect generally processor | Document customer instructions, permitted purposes, confidentiality, rights assistance, subprocessors, security, incident cooperation, return/deletion and audit arrangements in customer DPA. Customer remains responsible for its lawful inputs and notices. |
| Global account administration and service membership/security administration | Stravect generally controller for own purposes; membership content may also implement customer instructions | Separate global identity from tenant data; determine lawful basis per purpose, indirect invitee collection and shared-account retention. |
| Stravect subscription quotes, receipts, verification, tax/reversal records | Stravect generally controller | Confirm financial obligations, institutions/provider roles, recipients and schedules. Payment verification is not market eligibility. |
| Service security/audit and infrastructure logs | Stravect generally controller for own security; contractual security services may also support processor role | Define necessary fields, lawful purpose, operator access and retention; no universal read-audit or anonymous-log claim. |
| Direct privacy/support/account-recovery correspondence | Stravect generally controller; tenant-content assistance may be processor activity | Scope each case, minimize evidence, verify authority and coordinate with customer; no general support right to browse tenant content. |
| Workspace exports, recovery grants and transactional notifications | Inherit underlying purpose; Stravect also maintains own security/evidence obligations | Map request, recipient, approval, delivery and evidence purposes separately. A verified claimant is not automatically an Owner. |
| Authentication, hosting, payments and support suppliers | Contract/activity-specific processor, subprocessor or independent-controller roles | Assess actual account/products/terms; do not label every recipient a processor. |

Candidate lawful bases require review: contract only where necessary for a contract with the individual; assessed legitimate interests for appropriate administration/security; specific applicable legal obligations for required records. Customer employee/client processing needs its own basis. Privacy acknowledgment is not blanket processing consent. Optional marketing, if introduced later, needs separate approved arrangements.

## 4. Market availability and international inquiries

**F:** Kenya-first commercial availability, with worldwide account registration allowed. International users may submit subscription inquiries. They must not create or access an operational workspace until Stravect has approved **both market eligibility and subscription**. Market approval must be distinct from independent payment verification and SUPER_ADMIN subscription activation; none implies either of the others.

**S / implementation gap:** [onboarding](/home/rmuya/rhoda-work/coreops_dashboard/src/server/services/workspace-onboarding.service.ts:24) creates a Workspace, pending Subscription and Owner membership before any market-eligibility check. The pending state is not an approved market decision. [Commercial activation](/home/rmuya/rhoda-work/coreops_dashboard/src/server/commercial/service.ts:146) has funding/approval requirements but no separate market decision record was found. The strict “cannot create” policy is therefore unmet even though pending workspaces are restricted. Existing workspace-bound subscription flows may require a separately designed inquiry path. P-C2A neither changes those flows nor retrospectively approves any customer/market.

Before market engineering, decide how eligibility is established without unnecessary nationality/location data; customer business location, user residence and data-subject location are different. Assess applicable law from worldwide registrations even when no workspace is activated. Define approved criteria, reviewer, evidence, reasons, review/expiry/revocation and existing-customer treatment. Do not add geolocation, IP-based exclusion or payment-derived eligibility through this document.

## 5. Inventory, purposes and minimization

The detailed source inventory in [readiness §4](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-compliance-readiness.md) remains the field-level baseline. The following groups must appear in processing records and category schedules, with actual data stores and recipients verified before rollout.

| Data group / purpose | Source/storage | Principal minimization and retention issue |
| --- | --- | --- |
| Account profile, external identity, session/email/MFA checks | Clerk/browser and local User; transient server claims | No local password/MFA-secret table; profile copying and provider-held security data have separate purposes/retention. |
| Workspace, membership, invitation, job title and assignments | Customer/user input; Workspace/Member/Invitation and assignment relations | Invited nonusers and employees need appropriate notices; token expiry is not invitation-record deletion. |
| Client contacts, projects, tasks, descriptions, invoices | Customer input; tenant operational tables | Indirect collection/free text; prevent unnecessary sensitive entries through customer guidance and later approved controls. |
| Subscription requests, quotes, payment/reference/tax/receipt/reversal records | Owners, administrators, Paystack when enabled; commercial/payment tables | Review notes and external statements can identify people; no invented financial retention term. |
| Audit, legal receipt and technical navigation/log data | Application actions/browser/provider; audit/legal tables, URLs and logs | IDs/HMACs remain linkable; no accepted-text archive or general operator-read audit established. |
| Support and recovery evidence | Mailbox outside app; internal recovery references, reasons, scopes and grants | Do not solicit credentials or unnecessary identity documents; protected references/free text remain personal information. |
| Export ciphertext, requests, tokens, attempts and leases | Isolated C/N-X tables and authorized browser download | Artifact access expiry differs from cleanup, metadata retention and customer-held copies. |
| Lifecycle/outbox/attempt/provider/suppression/notice/witness records | Isolated B/N-B/C/D engineering | Generic content/encryption/digests are not irreversible anonymization; retention must preserve dedup/suppression/restore safety. |

**F:** Initial scope is general business workflow/project management. No intentional specialized health, biometric, children's or other high-risk sensitive-data launch without additional assessment and approval. This is a product restriction, not a claim that free-text inputs cannot contain such data or that an age-verification control exists. Unintended sensitive entries require a minimized handling/escalation process; do not copy them into logs/tickets or silently delete customer records under this policy. No marketing or new incident/account-security/invitation producer is authorized.

## 6. Security and authorized support access

**S:** Active membership, tenant-scoped reads, assignment/role restrictions, transactional Workspace locks and permission rechecks exist in [authorization](/home/rmuya/rhoda-work/coreops_dashboard/src/server/authorization/authorize.ts) and [policies](/home/rmuya/rhoda-work/coreops_dashboard/src/server/authorization/policies.ts). Platform access is purpose-specific, requires central host, live identity, active database role and recent strict MFA ([platform authentication](/home/rmuya/rhoda-work/coreops_dashboard/src/server/commercial/platform-auth.ts:13)); it does not grant general tenant business access. Database/provider administrators remain a separate trust boundary; application roles are not infrastructure IAM.

Support should verify identity and authority, define a bounded purpose/scope, use approved access, minimize copied evidence and document authorized actions. Founder status/internal privacy leadership is not an application-access bypass. Account conflicts must not trigger email-only rebinding, automatic merge or ownership transfer. Existing [recovery runbook](/home/rmuya/rhoda-work/coreops_dashboard/docs/account-recovery.md) requires reviewed procedures; its presence does not prove operational execution.

**S/V/O:** P-C1 provides safe quick-invoice error codes/reference logging and narrowly scoped invitation/payment-return no-referrer/no-store responses. Follow the [logging standard](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-safe-logging.md); raw secrets, tokens and unnecessary customer records must not enter ordinary diagnostics. External access-log URLs, auth continuation URLs, browser history, log drains/IAM and retention still need evidence. Actual provider deletion/MFA and last-owner recovery require signed-in and operator acceptance; local membership guards do not intercept privileged Clerk deletion.

## 7. Lifecycle and category retention

**F:** Preserve seven-day grace, day-60 cancellation after paid expiry, then 90 days retention for ordinary operational data. Let E be authoritative activated, non-revoked paid coverage expiry. Isolated UTC implementation calculates archive E+7, cancellation E+60 and retention eligibility E+150, using original effective deadlines rather than job execution time ([policy](/home/rmuya/rhoda-work/coreops_dashboard/src/server/lifecycle/policy.ts:10)). The deadline establishes **eligibility for controlled deletion**, not unconditional destruction or authority to execute purge.

**I/V:** Lifecycle enforcement and secure exports remain rehearsal-restricted ([lifecycle gate](/home/rmuya/rhoda-work/coreops_dashboard/src/server/lifecycle/config.ts:5), [export gate](/home/rmuya/rhoda-work/coreops_dashboard/src/server/data-access/security.ts:11)). Default commercial reads can remain available indefinitely after expiry. No live-policy compliance is certified. Never-paid, suspended/closed, abandoned, disputed or exceptional cases require decisions rather than invented deadlines. Live enforcement remains blocked pending approved export/recovery, notices and target-specific rollout.

| Category | Current control / required policy decision |
| --- | --- |
| Ordinary customer operational records | 7/60/90 framework is founder policy and isolated calculation; controlled deletion, dependency handling, exceptions and completed-deletion evidence are missing. |
| Financial/legal/security/audit records | Separate purpose, applicable law, minimum fields, justified duration/start event, authorized reviewers and expiry action required. No numerical schedule approved here. |
| Holds and lawful exceptions | Define lawful authority, category/scope, reason, start/review/expiry, release and access restrictions; no hold implementation or indefinite blanket exemption authorized. |
| Global accounts/membership/invitation history | Separate tenant exit from global identity; preserve other customers' records and reviewed evidence; provider deletion and receipt retention need coordinated design. |
| Export artifacts | Isolated N-X: bounded generation, at most 24 hours after successful generation; independently shorter one-use authorization and recovery grant. Access denial at expiry is separate from eventual ciphertext clearing, WAL/PITR and metadata retention. |
| Notification/recovery/journal evidence | Approve separate request, grant, outbox, frozen envelope, attempt, callback, suppression, notice and witness schedules. Do not remove dedup/UNKNOWN/suppression evidence in ways that resurrect sending. |
| Mail/support/rights/incident/log records | Purpose-specific minimum evidence, restricted readers, documented duration/review and disposal; actual providers/settings unverified. |
| Backups/restores | Inventory copies/regions, retention, encryption/key custody and access. Restore quarantine plus independent deletion/notification reconciliation required before active use; local rehearsals/witnesses are not production assurance. |

No category acquires an indefinite retention entitlement because a schedule is unresolved. No purge, anonymization, backup destruction, historical backfill or extension of a grant is authorized by this document.

## 8. Managed individual-rights procedure

**F/L/O:** Start with a managed, monitored email process once channel/owner/deadline rules are approved and tested. A workspace-owner ZIP is not a complete access/erasure mechanism: account/legal/payment/support/provider data and nonuser clients/invitees need separate handling. No real case register or personal records are created in P-C2A.

Minimum proposed workflow for later operational approval:

1. Receive securely, assign an opaque reference, record receipt/awareness time, jurisdiction/request type and responsible handler in a restricted case system. Acknowledge through the verified channel; do not promise a universal deadline.
2. Determine applicable legal response/extension/escalation dates and whether Stravect acts as controller or processor. Route/cooperate with the customer controller while preserving Stravect's own duties; do not bounce a person between organizations without ownership.
3. Verify identity/representative and business authority proportionately, avoiding unnecessary ID copies. Never request passwords, MFA codes, cookies or recovery secrets. Email control alone does not prove historical workspace ownership.
4. Scope all relevant stores/suppliers, protect other people's information, assess requested access/correction/erasure/restriction/objection/portability and applicable exceptions. Escalate disputed decisions to founder/legal reviewer; no blanket approval or automatic deletion.
5. Fulfil only through approved authorized procedures, record scope, legal rationale, recipient, secure release and completion/outstanding provider/backup work. Workspace export remains isolated and scoped; do not use ad hoc SQL dumps as a fulfillment shortcut.
6. Communicate the reviewed outcome, reasons/limits and applicable challenge/complaint routes. Retain minimal proof under an approved case schedule; periodically review overdue/open cases and exercise a synthetic request end to end.

Response time limits, extensions, representative rules, complaint routes and retention are unresolved legal checklist items, not implemented promises.

## 9. Suppliers and international transfers

**F:** Document supplier assessment before activating external personal-data processing and assess existing integrations as well. A library, public DPA, verified domain or preferred region does not prove an applicable agreement or approved transfer. This policy does not attest that existing integrations have completed diligence.

Review Clerk, Google, Vercel, Neon, Paystack, Resend, actual banks/M-Pesa institutions, support mail and any monitoring/drain provider. For each obtain actual contracting entity/account/product, purposes/data/roles, applicable terms/DPA, instructions/subprocessors, all relevant storage/support/backup/log countries, transfer mechanism/assessment, IAM, encryption/key custody, retention/deletion/export/restore, incidents and owner/review dates. The evidence checklist owns the supplier rows.

Worldwide registration processes personal data before commercial approval and may create additional jurisdictional duties. Kenya-first availability is not Kenya-only processing or an exemption from other applicable law. Countries, targeting, individuals and customer activities require legal review. No account-only geographical declaration establishes residency. Resend external transport remains technically blocked ([release](/home/rmuya/rhoda-work/coreops_dashboard/src/server/notifications/resend/release.ts:4)); local REST/Svix tests are not live supplier or delivery evidence.

## 10. Privacy incident response

**F/L/O:** Founder initially leads assessment and coordination; appoint backup before production. Maintain a restricted incident register and containment procedure, assess relevant controller/customer/supplier/regulator/individual notification duties and rehearse them. Do not equate notification-worker outage guidance with a privacy-incident capability.

The proposed procedure must capture discovery/awareness times, accountable handler, minimized scope/evidence, affected systems/categories/roles, containment actions, risk/notification decisions and deadlines, recipients, recovery and lessons. Escalate promptly to founder and relevant technical/supplier contacts; do not wait for a complete investigation before assessing time-sensitive duties. Preserve protected evidence, contain through separately authorized technical actions, coordinate with customer controllers and verify recovery without restoring deleted data or resending uncertain messages. Document reasons for notification/non-notification and reassess as facts change.

No statutory notification clock is decided here; legal review must map applicable thresholds, responsible parties, triggers and deadlines. No backup contact, functioning register, provider escalation or exercise is certified. P-C2A creates no actual incident record and authorizes no messages or containment execution.

## 11. Legal document approval and exact evidence

**F:** Maintain Terms of Service, Privacy Policy, customer DPA, retention schedule, applicable cookie notice and internal procedures. Obtain legal review before publication. Preserve exact approved legal versions and hashes with linked acceptance receipts; distinguish agreement, notice delivery/acknowledgment and optional consent.

**S / gap:** Existing [receipt service](/home/rmuya/rhoda-work/coreops_dashboard/src/server/auth/legal-acceptance.ts:23) stores version pair, URLs, first acceptance time/source and optional Clerk timestamp. [LegalAcceptance](/home/rmuya/rhoda-work/coreops_dashboard/prisma/schema.prisma:327) has no immutable document content/hash relation and cascades on local User deletion. [Configuration](/home/rmuya/rhoda-work/coreops_dashboard/src/config/auth.ts:21) uses an approval flag; the hardcoded [Privacy draft](/home/rmuya/rhoda-work/coreops_dashboard/src/app/privacy/page.tsx:7) is not finalized by that flag. Exact wording cannot be reconstructed from these fields alone. Git history alone is not a receipt-to-approved-content mapping.

Later engineering must preserve immutable approved text/assets, version/hash, effective/publication/approval provenance, stable receipts and retrieval/custody across changes and account deletion. Decide what hash covers, rendering/canonical bytes, language/paired documents and external URL handling. Do not fabricate text/hash mappings for historical receipts lacking evidence; mark uncertainty and seek reviewed treatment. This internal draft is not an accepted customer legal document and must not be loaded into the application's legal approval mechanism.

## 12. Ownership, revisions and stop boundary

Founder owns working business decisions and assignment of legal/operational reviewers. Engineering owns source evidence and proposals, not legal certification. Each future register change needs decision ID, reason, owner, evidence and date; record separate legal approval and deployment authorization when actually obtained. Reassess on new markets, data categories, suppliers, incidents, law changes and releases. No review cadence or named external reviewer is invented.

| Version/date | Change / authority | Approval boundary |
| --- | --- | --- |
| v0.1 — 11 November 2026 | Initial record of the ten founder-approved decisions from P-C2A and reconciliation through P-C1 | Internal working policy only; pending founder review of document fidelity and separate legal/operational verification. |

Only the three governance drafts were created. No source/schema/migration, environment/provider setting, legal publication, deployment, release gate or data was changed; no email, live customer access, privacy case, incident record or deletion was performed. **Stop for P-C2A review before further implementation.**
