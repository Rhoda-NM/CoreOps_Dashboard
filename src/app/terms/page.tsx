import { LegalDocument } from "@/components/auth/LegalDocument";

export const dynamic = "force-dynamic";

const sections = [
  {
    title: "1. Who provides WorkflowConnect",
    paragraphs: [
      'WorkflowConnect is a business workflow and project management service offered by Rhoda N Muya, trading as Stravect Systems, a business name registered in Kenya ("Stravect", "we", "us" or "our"). Stravect Systems is currently a sole proprietorship, not a limited liability company. Business/service address: [To be confirmed]. Contact: info@stravectsystems.com.',
      'These Terms govern access to WorkflowConnect’s website, accounts, workspaces and related services (the "Service"). Our Privacy Policy explains personal-data processing. Where applicable, an accepted quotation, order, service schedule and customer Data Processing Agreement ("DPA") supplement these Terms. Any conflict is resolved in the order expressly agreed in the applicable signed documents; mandatory law always prevails.',
    ],
  },
  {
    title: "2. Who may register and use the Service",
    paragraphs: [
      "An individual registering or accepting a subscription for a business must have legal capacity and authority to act for that business. The business is responsible for its authorized users, their permissions and actions taken through their accounts, except to the extent applicable law provides otherwise.",
      "Account registration may be available worldwide, but paid service availability is initially Kenya-first. During onboarding, the applicant selects the business’s country of operation. This is a self-declaration, not independently verified proof of location. Stravect may ask for proportionate clarification where necessary and may decline or defer service eligibility for a country or use case.",
      "An applicant in an open market may proceed to a restricted pending workspace. Applicants in markets requiring review may register and submit an account-only subscription inquiry, but do not receive operational workspace access until market eligibility and the subscription are separately approved. A market approval is not a payment verification or an active subscription. Changes in the business’s country or material use case may require reassessment. We will not treat an individual’s nationality, email suffix or payment currency alone as proof of business location.",
    ],
  },
  {
    title: "3. Accounts, identity and access security",
    paragraphs: [
      "You must provide accurate account and business details, keep them reasonably current, protect authentication factors and promptly report suspected unauthorized access. Do not share credentials or bypass security controls. Identity services may be supplied by third parties such as Clerk and, where offered, Google sign-in.",
      "Workspace access depends on active membership, assigned role, applicable market eligibility, subscription state and other security restrictions. A workspace Owner may manage authorized users only within the permissions provided. Being an account holder, workspace Owner or person who has paid does not independently confer operational access. Stravect’s platform administration rights do not provide a general entitlement to inspect customer business records.",
    ],
  },
  {
    title: "4. Workspaces and subscription activation",
    paragraphs: [
      "A restricted pending workspace may be created after market eligibility is established, to support quotation, subscription and payment processing. It does not confer permission to create or access ordinary client, project, task, business-invoice or staff-assignment records.",
      "Operational access begins only when the applicable quotation and subscription requirements, payment verification, administrative activation and access checks have been satisfied. We may verify, reject or request correction of a subscription or payment request where necessary. We may restrict access following payment reversals, suspected fraud, security concerns, legal requirements or a verified breach of these Terms, subject to applicable law and fair process.",
    ],
  },
  {
    title: "5. Fees, quotations, taxes and payments",
    paragraphs: [
      "Plan descriptions and quotations specify the applicable scope, charges, billing period, payment method, and any approved changes. A submitted subscription request or proof of transfer is not confirmation of payment. For supported payment methods, we may use an external payment provider or manual bank/mobile-money verification. Payments are not automatically treated as approved or refunded merely because a market decision changes.",
      "Taxes and fees will be shown as legally applicable on the relevant quotation or invoice; we will not charge or describe VAT as included or payable unless applicable to our registration and the transaction. Unless a quotation expressly says otherwise, subscriptions do not auto-renew merely because a previous period ends. Cancellation, credits, disputes and refunds are governed by the accepted order, applicable law and any separately agreed policy; no blanket waiver of statutory rights is created here.",
    ],
  },
  {
    title: "6. Customer records and permitted instructions",
    paragraphs: [
      "The customer remains responsible for the accuracy, legitimacy and lawful collection of the clients’, employees’, suppliers’ and other individuals’ information it enters. The customer must have an appropriate legal basis, supply notices where required, manage authorized users and correct inaccurate records.",
      "As between the parties, the customer retains its rights in its business information. The customer authorizes Stravect and approved service providers to host, transmit, secure, back up and otherwise process that information solely to provide, maintain, protect and support the contracted Service and fulfill lawful documented instructions, as further governed by the customer DPA where applicable. This does not give Stravect permission to sell customer data or use identifiable customer workspace data for unrelated advertising or training third-party AI models without a separately approved lawful arrangement.",
    ],
  },
  {
    title: "7. Acceptable use and product restrictions",
    paragraphs: [
      "You must not use the Service for unlawful activity, harassment, fraud, unauthorized surveillance, credential theft, malicious code, security testing without authorization, access to another tenant’s records, or circumvention of technical and commercial limits. Do not upload content you lack authority to process or disclose.",
      "WorkflowConnect’s initial scope is general business workflow and project management. Specialized processing of health, biometric, children’s or other higher-risk sensitive personal data is not an approved launch use case without a separate assessment and express agreement. Because free-text fields exist, customers should avoid unnecessary sensitive information, follow data-minimization guidance and promptly report accidental or inappropriate entry for reviewed handling. We may restrict an unsafe use case while assessing its lawfulness and security.",
    ],
  },
  {
    title: "8. Availability, changes and third-party services",
    paragraphs: [
      "We aim to operate the Service with reasonable care and appropriate security, but cannot promise uninterrupted availability or that every feature will be available in every market. We may undertake maintenance, make security changes, introduce restrictions or discontinue functionality with appropriate notice where reasonably practicable. Preview or experimental features may be subject to additional terms and may be unavailable in production.",
      "Third-party identity, infrastructure and payment providers may be involved in delivering the Service. Their own terms may apply to services they provide directly to you. We remain responsible for our obligations under our agreement and applicable law; third-party involvement does not erase those responsibilities.",
    ],
  },
  {
    title: "9. Service intellectual property and feedback",
    paragraphs: [
      "Stravect and its licensors retain rights to the Service, software, design, trademarks and documentation, excluding customer-owned content. During an authorized subscription, we grant the customer a limited, nonexclusive, nontransferable right to use the Service for its internal business operations under these Terms and the applicable plan. No source-code, resale or sublicensing right is granted unless separately agreed.",
      "You may submit suggestions voluntarily. We may use general suggestions to improve the Service without disclosing confidential customer information or personal data unlawfully. A suggestion does not transfer ownership of the customer’s underlying business records.",
    ],
  },
  {
    title: "10. Confidentiality and security",
    paragraphs: [
      "Each party must use reasonable care to protect the other’s nonpublic business information, use it only for authorized purposes and disclose it only to people or providers with an appropriate need and duty of confidentiality, subject to lawful disclosures. This does not prevent disclosures of information lawfully public, independently developed or required by law. Customer data and security commitments are further addressed in the applicable DPA and approved security documentation.",
      "Report suspected security incidents and access problems promptly to info@stravectsystems.com until a separately tested security/privacy contact is published. We may require proportionate identity or authority verification before disclosing account or customer details.",
    ],
  },
  {
    title: "11. Expiry, suspension, cancellation and retention",
    paragraphs: [
      "Access rights depend on actual paid coverage and the Service’s approved lifecycle policy. The planned standard business lifecycle, subject to production verification and a published retention schedule, is: a seven-day grace period after qualifying paid coverage ends; archival when that grace period ends; cancellation 60 calendar days after coverage expiry; and ordinary operational-data eligibility for reviewed deletion 90 days after cancellation. These are not a promise of immediate physical deletion or of unlimited access during retention.",
      "A shorter deletion obligation may arise from a valid privacy request, while some financial, legal, dispute, audit or security evidence may lawfully require restricted retention. Never-paid, suspended, disputed and exceptional workspaces may require different documented treatment. Workspaces are not guaranteed to remain accessible after cancellation. Restoration, where offered, requires independent identity, authority, market and commercial checks. Any customer export feature is available only where specifically activated and authorized; do not assume a self-service export or recovery route is live.",
      "Publication condition: This section must be reconciled with the actual deployed lifecycle, deletion, backup and customer-notice controls before these Terms take effect.",
    ],
  },
  {
    title: "12. Account closure and consequences of termination",
    paragraphs: [
      "A user account and a business workspace are different records. Closing a user’s account does not automatically delete the customer’s records or remove another customer’s shared-user data. On termination we may disable access, preserve the records required by law or an approved hold, and process remaining information under the published retention schedule and customer DPA. Requests for access, correction, export or erasure will be reviewed under our Privacy Policy and applicable law, including the rights of other people and customers.",
    ],
  },
  {
    title: "13. Disclaimers and limits of liability",
    paragraphs: [
      "WorkflowConnect is a workflow-management tool and does not provide legal, accounting, medical or regulated professional advice. Customers remain responsible for reviewing their entries, invoices, commercial decisions and statutory obligations. Nothing in these Terms excludes liability or remedies that cannot lawfully be excluded.",
      "[Legal review required before publication: define proportionate warranties, any permitted liability cap and exclusions, direct/indirect-loss treatment, remedies, indemnities and applicable statutory exceptions. No unreviewed limitation is adopted by this draft.]",
    ],
  },
  {
    title: "14. Changes to Terms",
    paragraphs: [
      "We will keep approved versions of these Terms and the applicable effective dates. For material changes, we will provide notice and request a new agreement where required. We will not silently replace the historical wording of a version already accepted. Continued use is not treated as consent to processing that legally requires separate consent.",
    ],
  },
  {
    title: "15. Governing law and disputes",
    paragraphs: [
      "These Terms are intended to be governed by the laws of Kenya, subject to mandatory laws and rights that apply to the customer or user. Parties should first contact info@stravectsystems.com to seek a practical resolution. [Counsel to confirm court jurisdiction, dispute-resolution procedure, notices, consumer-protection applicability and cross-border contract treatment before publication.]",
    ],
  },
  {
    title: "16. Contact and notices",
    paragraphs: [
      "Service provider: Rhoda Muya, trading as Stravect Systems",
      "General and contractual contact: info@stravectsystems.com",
      "Service website: stravectsystems.com",
      "Privacy contact: info@stravectsystems.com",
    ],
  },
];

export default function TermsPage() {
  return <LegalDocument title="WorkflowConnect — Terms of Use" kind="terms" documentMetadata={{ version: "Draft 0.1", preparedAt: "11 November 2026", effectiveDate: "[To be confirmed after approval]" }}>
    {sections.map(section => <section key={section.title}>
      <h2>{section.title}</h2>
      {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
    </section>)}
  </LegalDocument>;
}
