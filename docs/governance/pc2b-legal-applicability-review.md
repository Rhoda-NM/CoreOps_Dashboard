# P-C2B — Legal applicability and responsibilities review pack

**Internal Working Draft — Founder Business Policy, Pending Legal and Operational Verification**

Research date: 11 November 2026. Decision owner: Founder. Legal/accounting reviewers: not yet appointed. **Prepared for founder and qualified reviewer decisions; no compliance, exemption, retention period or legal publication is approved.**

## Read first: decisions and companion documents

P-C2A is the accepted working baseline. The founder's ten decisions remain unchanged in the [register](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/privacy-decisions-v0.1.md). This package prepares their legal evaluation, using the original 8 November audit supplied in the conversation, [11 November readiness](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-compliance-readiness.md), [P-C1](/home/rmuya/rhoda-work/coreops_dashboard/docs/privacy-checkpoint-pc1.md) and current source. No separate archived original audit was supplied; evidence custody remains open.

Companions:

- [Activity responsibilities and customer DPA questions](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-activity-responsibilities.md) — Workstream C.
- [Retention and exception decisions](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-retention-decisions.md) — Workstream D.
- [Rights, incidents and reviewer handoff](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-rights-incidents-handoff.md) — Workstreams E/F.

**Decision requests:** verify contracting proprietor; determine ODPC registration roles/exemption and DPO position; map actual countries/activities; approve purpose-specific responsibilities and lawful bases; obtain accountant/counsel retention decisions; settle rights/incident clocks and legal-evidence preservation before corresponding engineering. All remain open. An available public law or vendor DPA is not an executed review or proof of operational compliance.

Evidence labels throughout: **FACT-S** source-verified implementation (deployment unverified); **FACT-F** founder-supplied business fact, not document-verified; **LAW** verified text/guidance at the stated source/version; **INTERPRETATION** provisional application requiring counsel; **CHOICE** business position/proposal; **OPEN** missing facts or qualified determination. Labels can coexist. Isolated-only controls are explicitly identified.

## A. Contracting identity, registration and DPO

**FACT-F:** Stravect Systems is a Kenyan registered sole proprietorship. Proprietor's name/address/registration particulars have not been supplied or checked. **LAW:** BRS explains that a business name has no separate legal personality [K05]. **INTERPRETATION:** prepare contracts identifying **[verified legal name], trading as Stravect Systems**, subject to counsel confirming particulars and necessary disclosures. Do not invent a name/address or describe Stravect as a limited company.

Registration analysis: review DPA s18 and Registration Regulations rr4,13 and Third Schedule [K01,K03]. The published r13 size test combines turnover/revenue below KES 5 million **and** fewer than ten employees; activity exclusions matter. Its r13(4)/(5) wording and cross-references need counsel/ODPC reconciliation against ODPC's exemption explanation [K04]. Do not infer exemption solely from size or sole-proprietor status. Registration as controller, processor or both must follow the activity matrix, actual customer processing and applicable interpretation; no registration lookup was performed.

Review the **whole** Third Schedule. Examples relevant to scoping include financial services, property management, education, health, direct marketing and crime-prevention purposes. Whether serving customers in a listed sector, processing their records, billing subscriptions or ordinary security logging brings Stravect within an exclusion is a question, not a classification made here. An invoicing feature does not itself establish financial-services status. Exemption from registration would not establish exemption from substantive data protection duties.

DPO: s24(1) uses **“may”**, while addressing public/private bodies, systematic monitoring and sensitive-data core activities [K01]. Counsel must assess that wording with current ODPC DPO guidance [K06], any later requirements and actual operations. Founder-led internal privacy coordination is not a formal DPO designation. Assess competence, independence/conflicts, reporting/resources, alternative external/shared arrangements and publication/ODPC-contact requirements if appointed. Do not conclude either “mandatory for every private business” or “always optional for Stravect.”

If later incorporating: reopen legal identity and ODPC particulars/registration treatment, tax/accounting duties, supplier/customer contracts, assignments/novations, controller/processor identity, transfer/notices, legal-version/receipt continuity and backup/evidence custody. A changed display name or tax ID is not a completed entity transition. Counsel/accountant must decide historic proprietor liabilities/records and which agreements can transfer; no incorporation action is authorized.

## B. International-registration framework

**CHOICE (approved G01):** worldwide registration/inquiries; Kenya-first commercial access; independent market approval before international operational workspace creation/access. **FACT-S:** [onboarding](/home/rmuya/rhoda-work/coreops_dashboard/src/server/services/workspace-onboarding.service.ts:24) creates pending Workspace/Subscription and Owner membership without a separate market gate; [activation](/home/rmuya/rhoda-work/coreops_dashboard/src/server/commercial/service.ts:146) verifies funding/commercial authority rather than geography eligibility. The policy's inquiry-only international path is a target, not implemented behavior. Do not assess law on the fictional assumption that no international workspace can be created.

Kenyan nexus: review DPA s4 [K01]. International processing must be evaluated for accounts/inquiries even without paid workspaces. **INTERPRETATION:** worldwide accessibility alone neither proves every foreign law applies nor removes laws attached to actual activities. For an EU example, EDPB Guidelines 3/2018 assess establishment and targeting/monitoring rather than mere accessibility or citizenship [K09]. No EU applicability finding is made. UK and other countries need their own current-law review if the fact screen identifies a nexus; this is a framework, not a worldwide legal opinion.

| Separate fact | Necessary question / minimized evidence | Legal decision to record |
| --- | --- | --- |
| Customer business country | Where is the contracting business established/operating; which service is requested? Start with business declaration and approved criteria. | Commercial eligibility and customer contract, distinct from an individual's law/rights. |
| User residence / location during processing | Which country facts are actually relevant to an identified legal test? Use aggregated/self-declared facts initially where adequate. | Territorial nexus; do not substitute email TLD, currency or payment origin. |
| Nationality | Is it genuinely required by a specific rule? | Do not collect passport/nationality as a default eligibility proxy. |
| Data-subject location | Where are clients, invitees/employees whose data is processed? They may differ from customer/user location. | Applicable rights/notices/customer instructions; no assumption all subjects are Kenyan. |
| Offering/monitoring/establishment | Advertising audiences, languages/currencies, sales outreach, offices/staff/agents, tracking/profiling and actual intended users. | Counsel records jurisdiction/test, facts, reasoned result, scope, reviewer/date and review trigger. |
| Supplier processing countries | Storage, support access, logs/drains, identity/payment and backups, including onward transfers. | Transfer route/safeguards/assessment, local-copy requirements if relevant, subprocessor authorization and notices. |

For each jurisdiction flagged by facts record: applicable law and current source; account/inquiry/workspace roles; territorial basis or reasoned nonapplication; registration/representative/DPO/DPIA questions; purposes, rights/clocks, transfers, cookies/children/sensitive data, incident/retention duties; accountable reviewer and conditions before access. Do not order geolocation or nationality collection before necessity review. Reassess on targeting, incorporation, new suppliers/markets or sensitive processing.

Transfer analysis must address Kenyan DPA ss48–50 and General Regulations Part VII plus r26 [K01,K02], alongside any applicable foreign transfer rules. A Kenya-only market does not prove Kenya-only processing. Supplier account/region/contract evidence remains absent. The existing [supplier checklist E09](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/privacy-evidence-review-v0.1.md) covers Clerk, Google, Vercel, Neon, Paystack, Resend, support mail, financial and log services. **FACT-S:** live [Resend transport throws](/home/rmuya/rhoda-work/coreops_dashboard/src/server/notifications/resend/release.ts:4); simulation is not a real approved supplier transfer.

## C. Minimal founder-information checklist — no personal answers recorded here

Provide evidence privately to appointed reviewers; record a protected reference/conclusion in the decision register. Do not commit identity documents, tax identifiers, credentials, customer lists or cases to Git.

| ID | Minimum information / why needed | Recipient |
| --- | --- | --- |
| F01 | Verified proprietor/trade-name registration particulars and appropriate service/public address; establishment evidence only as necessary. | Counsel; accountant for tax identity. |
| F02 | Prior-year turnover/revenue and employee count, period/measurement and material changes; existing ODPC application/certificate/role/expiry if any. Accountant confirmation or ranges adequate for screening; no bank statements by default. | Counsel + accountant for registration determination. |
| F03 | Actual/planned customer activities/sectors, sensitive/children's processing, systematic monitoring and marketed features; aggregate description rather than customer records. | Counsel for exclusion/DPO/DPIA/role screen. |
| F04 | Intended markets, actual registration/inquiry countries in aggregate if lawfully available, targeting/establishments/staff and intended customer/subject locations. Do not access live records for this checkpoint. | Counsel for territorial map; founder for eligibility. |
| F05 | Actual provider products/accounts/entities and regions, terms acceptance/protected contract references, support/log/backup arrangements. No secrets or database URLs with credentials. | Supplier reviewer + counsel. |
| F06 | Tax obligations/status, Stravect versus customer invoice purposes, reporting periods, current disputes/holds described minimally and protected references. | Accountant + counsel; not engineering by default. |
| F07 | Privacy-channel availability/monitoring and proposed backup/rights/incident owners; whether any formal DPO appointment exists. | Founder/operations + counsel. |
| F08 | Existing approved legal versions/contracts/archives and receipt custody, relevant insurer/customer incident/rights terms, historic evidence gaps. Supply references, not live personal cases. | Counsel + evidence custodian. |

## D. Unresolved legal questions and approval register

All rows **OPEN**. Source links and limitations are in §E. “Decision preparation” is not an approval. On review append reviewer/date, relevant fact references, written conclusion, conditions, scope/effective date and reassessment trigger; retain superseded reasoning.

| ID / baseline mapping | Decision required / authoritative starting point | Required signer / evidence |
| --- | --- | --- |
| L01 / E03,G10 | Proprietor identity/disclosures and future incorporation transition [K05]. | Founder facts F01; counsel; accountant for tax transition. |
| L02 / E01,G02 | Controller/processor/both registration; r13(5) and schedule interpretation, renewal/change particulars [K01 ss18–22; K03 rr4,9,13,15; K04]. | Counsel/ODPC clarification as needed, accountant F02, founder F03; no exemption presumed. |
| L03 / E01,G02 | Formal DPO necessity/arrangement/conflicts under current guidance [K01 s24; K06]. | Counsel; founder resources/appointment decision. |
| L04 / E02,G01 | Territory/market/registration/inquiry nexus and foreign requirements [K01 s4; K09]; customer sector/sensitive/children's/DPIA screen [K01 ss31,33,44–46]. | Counsel by jurisdiction, founder F03/F04; no automatic all-country opinion. |
| L05 / E04,G03 | Purpose-specific basis/roles, indirect collection and customer DPA [K01 ss28–32,42; K02 rr4–6,24–25]. | Counsel + founder; [activity matrix](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-activity-responsibilities.md). |
| L06 / E09,G06 | Actual transfers, suppliers, authorization and local-copy rules if triggered [K01 ss48–50; K02 r26,Part VII]. | Counsel + supplier owner, F05; provider documents/settings absent. |
| L07 / E05,G04 | Category schedules, evidence/claims holds and release tests [K01 ss39–40; K02 rr19,35]; applicable tax periods [K07/K08]. | Counsel + accountant + founder; [retention matrix](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-retention-decisions.md). |
| L08 / E06,G05 | Rights applicability, clocks, exceptions, representation, controller coordination [K01 ss26–27,34–40; K02 rr7–13]. | Counsel + rights owner; [rights matrix](/home/rmuya/rhoda-work/coreops_dashboard/docs/governance/pc2b-rights-incidents-handoff.md). |
| L09 / E07,G07 | Breach thresholds, clocks, dual controller/processor duties, encryption/notification exceptions [K01 s43; K02 rr37–38; K10]. | Counsel + incident lead/backup, provider/customer contracts. |
| L10 / E08,G08 | Exact legal content/acceptance custody and User cascade; historic missing evidence; agreement versus notice/consent [K01 ss30,32,39–40]. | Counsel + founder + later isolated engineering approval. |
| L11 / E15,G08,G09 | Cookie/tracking scope, children/sensitive/free-text restrictions and required public disclosures [K01 ss25,29,33,44–46; K02 rr4–6]. | Counsel + future deployed inventory; no live inspection here. |

## E. Authoritative source register and currency limits

All links checked/researched 11 November 2026. Statutory summaries are paraphrases for decision preparation; only the single word “may” above is quoted. No unverified long provision is quoted. Statutes outrank guidance; public guidance may require interpretation. **A search crawl date, URL upload month or source filename is not proof of enactment, publication or legal currency.** Counsel must check amendments, commencement, litigation/orders and current regulator position before final advice.

| ID | Official source / pinpoint | Established date or version / retrieval limitation |
| --- | --- | --- |
| K01 | [ODPC-hosted Data Protection Act No.24 of 2019](https://www.odpc.go.ke/wp-content/uploads/2024/02/TheDataProtectionAct__No24of2019.pdf) | Original enactment PDF; cover 11 November 2019. Full relevant provisions inspected. Not certified a consolidation through November 2026. Kenya Law indexed revision 31 December 2022 was identified, but direct pages challenged automated access; no claim all later amendments were excluded. |
| K02 | [ODPC General Regulations, LN263/2021](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-GENERAL-REGULATIONS-2021-1.pdf) | Gazette cover dated 31 December 2021; text states made 7 December 2021; relevant rights/contract/retention/breach/transfer provisions inspected. Recheck amendments/commencement/current text with counsel. |
| K03 | [ODPC Registration Regulations, LN265/2021](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-REGISTRATION-OF-DATA-CONTROLLERS-AND-DATA-PROCESSORS-REGULATIONS-2021.pdf) | Made 7 December 2021; r1 states six months after publication. Actual commencement/application and later changes need final verification. |
| K04 | [ODPC registration FAQ](https://www.odpc.go.ke/faqs/) | No revision date established. Describes combined size test and exceptions; not a substitute for resolving statutory wording. |
| K05 | [BRS registered entity descriptions](https://brs.go.ke/entities-registered/) | No revision date established; describes business name versus corporate entities. Not Stravect registration evidence. |
| K06 | [ODPC DPO guidance](https://www.odpc.go.ke/wp-content/uploads/2026/04/Guidance-Notes-on-DPO.pdf) | Official indexed introduction/conflict text located; full PDF fetch timed out twice. No exact issue/revision date or complete guidance verified; URL month is not an issue date. Reviewer must obtain full current document. No reliance on private proposed certification frameworks. |
| K07 | [KRA record-keeping FAQ](https://www.kra.go.ke/component/kra_faq/faq/449), [KRA tax-record explanation](https://www.kra.go.ke/news-center/blog/2174-kra%E2%80%99s-perspective-on-the-burden-and-standard-of-proof-in-tax-and-customs-cases) | FAQ undated; explanatory blog dated 2 May 2025. Official guidance describes five-year tax retention; applicability/start event/exceptions remain accounting/legal decisions. |
| K08 | [Tax Procedures Act s23, Kenya Law 1 July 2025 version](https://new.kenyalaw.org/akn/ke/act/2015/29/eng@2025-07-01/source.pdf) | Version identified in official index/search; full retrieval challenged automated access. Exact current statutory text/amendments and reporting-period/assessment/proceeding extensions **not fully verified here**. No statutory quotation or operative Stravect schedule approved. |
| K09 | [EDPB territorial Guidelines 3/2018](https://www.edpb.europa.eu/documents/guideline/guidelines-32018-on-the-territorial-scope-of-the-gdpr-article-3-version-adopted_en) and [final PDF](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_3_2018_territorial_scope_after_public_consultation_en_1.pdf) | Final page dated 12 November 2019; official PDF inspected for territorial framework. EU example only. EUR-Lex direct retrieval challenged access; no full foreign-law opinion. |
| K10 | [ODPC Complaints/Enforcement Regulations LN264/2021](https://www.odpc.go.ke/wp-content/uploads/2024/03/THE-DATA-PROTECTION-COMPLAINTS-HANDLING-AND-ENFORCEMENT.pdf), [official complaint route](https://www.odpc.go.ke/file-a-complaint/) | Official regulations retrieved, 2021 title. Complaint web page identified but current direct retrieval presented CAPTCHA; verify functioning channel before publishing. Breach reporting is a separate route; no form submitted. |

No primary-source date/interpretation is inferred from commercial commentary. Research limitations are unresolved handoff tasks, not permission to bypass access controls.

## F. Change and stop record

Created this report plus the three companion matrices; appended a P-C2B cross-reference to the existing evidence checklist. G01–G10 and historical audits were not rewritten. Document labels, source links and cross-references checked; no application tests/builds/migrations needed or run. No application/schema, live data, `.env`, account/provider/payment/deployment settings, public legal text, export/lifecycle/notification/deletion gate changed. No emails, actual cases, customer access or supplier activation occurred. **Stop for founder and legal review.**
