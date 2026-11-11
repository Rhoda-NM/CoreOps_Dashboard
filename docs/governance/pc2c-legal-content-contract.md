# P-C2C — Exact-content and acceptance evidence contract

**Internal Working Draft — Pending Legal and Operational Verification**

11 November 2026. Implemented for isolated **synthetic** rehearsals only. This is an engineering preservation contract, not customer legal terms, counsel approval, a retention schedule or public publication authorization. See [implementation/evidence report](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2c-legal-evidence-implementation.md).

## Authoritative bytes and identifiers

A LegalDocumentVersion preserves an immutable byte array, kind, stable version label, language, format, rendering version, creator/time, algorithm, digest and byte length. The version identity is the row ID plus the unique (kind, version, language) tuple; content identity can be expressed as `sha256:<contentHash>`. Identical bytes may occur under different document/version identities. Neither identity is a user credential or a declaration of legal approval.

The authoritative document wording is **the exact archived UTF-8 body**, including its headings, punctuation, whitespace and trailing newline. Authors must include the complete substantive wording there. The service accepts valid round-trippable UTF-8 with LF line endings, no BOM, NUL or CR, between 1 byte and 256 KiB. It rejects invalid input; it does not normalize Unicode, rewrite CRLF or silently repair text. This release additionally requires the body to begin `SYNTHETIC TEST`, and SQL requires synthetic=true. No current draft was copied or marked approved.

`SHA-256` hashes those exact body bytes, not a URL, Git commit, JavaScript string character count, screenshot or browser DOM. byteLength is the number of bytes, not characters. PostgreSQL independently checks the digest/length against ByteA, and the reconstruction reader rechecks algorithm, format, rendering version, length, digest and UTF-8 rules. Corruption or an unsupported format fails closed; there is no mutable-URL or plaintext fallback. Contents and metadata cannot be UPDATEd even while staged; changed wording needs a new version. A conflicting reuse of a version/language/type is rejected.

`TEXT_UTF8` / `PLAIN_UTF8-v1` means display as escaped plain text in a whitespace-preserving, wrapping preformatted block. HTML/Markdown and URLs inside the body are not executed or expanded. The synthetic body containing script markup is tested as text. Ordinary page navigation, fonts, responsive layout and test banners are application chrome, not hashed legal wording. This contract preserves text and semantic/version metadata, not pixel-identical screens or proof that someone read the text. A future different substantive rendering contract requires a newly reviewed rendering/version format; never silently change an old contract's interpretation.

## Publication manifest and provenance

A LegalVersionReview records the exact version, real database-backed administrator, recorded time, protected evidence reference, reason and action. The only positive action admitted here is `SIMULATED_APPROVE`; references start `SYNTHETIC:`. This is a test attestation, not a lawyer's approval. A configuration boolean/date/version pair cannot create that provenance. Actual counsel authority, approved documents and independent custody remain unverified and require a separate release.

A LegalPublication seals exactly one reviewed TERMS version and one reviewed PRIVACY version of the same language. DPA/cookie/retention documents cannot be substituted for either. Its immutable `LEGAL-SET-v1` manifest is UTF-8 bytes produced by the server's fixed JSON field order, with no insignificant reformatting after sealing. It contains:

- Publication ID and stable set version.
- Each document's ID, kind, version, language, format, renderer, hash algorithm, body hash and byte length.
- Exact review IDs, server-recorded published/effective timestamps.
- Terms=AGREEMENT, Privacy=ACKNOWLEDGMENT, optionalConsent=false, customerDpaExecuted=false, synthetic=true.

The manifest's own SHA-256 and bytes are stored. Reconstruction derives the same manifest from immutable references and compares bytes/hash, then validates each document. This binds body hashes to metadata and provenance. It does not make a database owner, administrator clock or external approval reference independently trustworthy.

Publishing in this release means **recording a rehearsal publication**, not publishing to `/terms` or `/privacy`. The service chooses current database time for publication/effectiveness; it accepts no caller-supplied backdate. Scheduled/future public publication is not implemented. Supersession is represented by immutable SUPERSEDED/PUBLISHED events and the new publication identity in the operation key; withdrawal appends a review/event and clears the active control when relevant. Previous version/publication/receipt rows are not rewritten. The active control is a mutable, revisioned pointer, not the content archive. Withdrawn/superseded sets cannot be silently selected again through that pointer; source approval refuses withdrawn versions.

## Presentation and authenticated acceptance

The isolated account page renders archived bodies from a validated active set; it does not link to mutable public drafts as its authority. LegalPresentation binds an opaque ID to the evidence subject, publication, control revision, server presentation time and five-minute expiry. This is a technical authorization window, **not** a legal retention period. At most 20 presentations/hour per subject are admitted. Presentation creation proves server preparation of those bytes, not completed browser delivery, display or reading.

The POST requires live verified Clerk identity and matching current local external-ID binding, the exact subject-bound presentation/set/hash, and two separate true values: Terms agreement and Privacy acknowledgment. There is no optional marketing/processing-consent value in this API. A presentation ID, URL or known content hash alone grants no access. No posted accepting-party ID is trusted.

User and active-control locks serialize binding/repeated acceptance with publication changes. After locks, server database time checks effectivity and presentation freshness. A replaced/withdrawn/mismatched set or wrong subject fails. The unique subject/publication key preserves the first receipt/time on valid current-set retries; replay does not create a new acceptance or extend an authorization. An old accepted receipt remains reconstructable historically, but does not satisfy a newer active set. A stale set is rejected even if it was accepted before.

Receipt, exact publication/presentation references and independent TERMS_AGREED_PRIVACY_ACKNOWLEDGED event commit atomically. A deferred database check rejects a receipt without its event. The event stores identifiers/type/time, not duplicate profile/contact/session/IP data. Own-receipt detail is authenticated and subject-scoped; detached subjects are not publicly discoverable. There is no general acceptance-evidence browser/API for support or tenant administrators.

## Historical evidence and later gap review

Original LegalAcceptance rows retain their labels, URLs, time, source and optional Clerk timestamp exactly as stored. No new body/hash/publication mapping or approval is backfilled. The rehearsal historical projection labels them `LABEL_URL_ONLY`, with `reconstructableFromReceipt=false`. That describes the receipt alone; independent approved archives may exist outside the repository but were not supplied/verified here. Current drafts, mutable URLs or Git similarity cannot establish accepted text automatically. Legacy labels are never treated as catalog receipts.

A later authorized process should inventory the exact affected target privately, locate genuinely preserved approved artifacts and custody/provenance, and have counsel review any potential mapping. Keep the original receipt unchanged; record separately whether a mapping is proven or remains unknown. Do not hash guessed text, backdate decisions or replace old acceptance times. Counsel must decide whether a new prospective notice/agreement/acknowledgment is needed and who must receive it. A new event would have a new current timestamp and exact set. No communications, historical customer assessment or re-acknowledgment campaign is authorized here.

## Account erasure, retention and customer contracts

Legacy receipt→User cascade is tightened to RESTRICT. New evidence uses a minimal opaque LegalEvidenceSubject whose User link is also restrictive. An ordinary User deletion cannot silently destroy that evidence. A separately invoked **synthetic-only** detachment requires an independent active SUPER_ADMIN, recent MFA, current administrator binding, explicit synthetic retention-review reference and no legacy, business, market, security or other User relations. It removes only the subject's User link, records detachment and commits an independent event. Rebinding a detached subject is rejected. It does not delete a User, contact Clerk, erase business records or execute a lawful retention decision.

After synthetic detachment, exact documents/receipts/event times remain, with an opaque subject ID and no duplicated name/email/provider identifier. The detached record cannot prove a particular natural person's identity from its retained fields alone. That is an explicit minimization/evidence tradeoff requiring legal approval before any real process. Pseudonymous identifiers/times may remain personal data through other evidence; detachment is not irreversible anonymization or deletion from backups.

Legacy or business-linked targets remain blocked pending a reviewed workflow. General account-erasure orchestration, last-owner/provider deletion coordination, legal holds, evidence schedules, suppression/restore reconciliation and lawful disposal remain outside this executor. `disposeLegalEvidence()` fails explicitly; no indefinite retention is approved. Update immutability and restrictive FKs do not create permanent DELETE-denial triggers: a future approved category-specific disposal can remove dependent records in reviewed order while preserving other customers' evidence. No such production cleanup service or schedule is implemented.

A CUSTOMER_DPA version may be archived as a synthetic catalog document, but cannot enter an individual's Terms/Privacy set. `executeCustomerDpa()` is explicitly unavailable. The required future business-contract model is separate: business/Workspace and correct contracting parties, exact DPA version/publication, verified signatory subject and authority evidence, Stravect counter-approval/contract reference, scope/instructions, effectivity, execution event and reviewed retention. Owner membership alone is not automatically legal signing authority. No executed-contract status, customer DPA acceptance or processing consent is inferred from an individual sign-up receipt. These open legal/authority decisions are deliberately blocked rather than fabricated in schema or UI.
