import { LegalDocument } from "@/components/auth/LegalDocument";

export const dynamic = "force-dynamic";

type PolicyBlock = { type: "paragraph"; text: string } | { type: "list"; items: string[] };
const sections: { title: string; blocks: PolicyBlock[] }[] = [
  {
    "title": "1. Who we are and the scope of this Policy",
    "blocks": [
      {
        "type": "paragraph",
        "text": "WorkflowConnect is offered by [verified proprietor legal name], trading as Stravect Systems, a registered business name operated as a sole proprietorship in Kenya (\"Stravect\", \"we\", \"us\" or \"our\").  Contact: info@stravectsystems.com."
      },
      {
        "type": "paragraph",
        "text": "This Policy explains how personal information is handled when people register for WorkflowConnect, submit a subscription inquiry, administer a business workspace, receive support or otherwise interact with the Service. It applies to individuals in Kenya and elsewhere who interact with our registration and inquiry channels; it does not mean paid workspace access is offered in every country."
      }
    ]
  },
  {
    "title": "2. Our responsibilities and those of customers",
    "blocks": [
      {
        "type": "paragraph",
        "text": "For account administration, subscription sales, our payment records, direct support, platform security and our own compliance activities, Stravect generally determines relevant purposes and acts as a data controller, subject to activity-specific legal review."
      },
      {
        "type": "paragraph",
        "text": "For customer workspace data, such as information about a customer's clients, employees, project participants, tasks and business invoices, the customer generally determines why that information is collected and acts as data controller; Stravect generally processes it on the customer's documented instructions. A customer DPA will govern this relationship where applicable. A person's data may appear in a workspace even when that person has never created a WorkflowConnect account. Some activities have mixed or separate responsibilities, which must be assessed by purpose rather than assumed from a single label."
      }
    ]
  },
  {
    "title": "3. Categories of information",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Depending on your relationship with the Service and features actually enabled, we process:"
      },
      {
        "type": "list",
        "items": [
          "Identity and account details: name, verified email, account and identity-provider identifiers, profile image where supplied, account status, membership and security-related verification/session information. We do not need customers' authentication passwords or MFA secrets in our application database.",
          "Business onboarding and eligibility details: selected country of business operation, product interest, a brief business use case, authority/accuracy attestation, market inquiry and review status, and restricted decision/audit references. A selected country is self-declared unless expressly checked; nationality or identity documents are not required by default.",
          "Customer workspace information: client and project contact details, assignments, tasks, comments or descriptions, customer business invoices, amounts, roles, changes and other content entered by authorized users. Free-text fields may inadvertently contain sensitive details.",
          "Subscription and financial administration: plan requests, quotations, accepted terms, transaction/payment references, amounts, tax information where applicable, verification status, receipts, reversals and relevant review reasons. Ordinary customer invoice records are not automatically shared with the platform's subscription payment provider.",
          "Privacy, legal and support evidence: requests, support correspondence, reviewed recovery information, legal document versions/acknowledgments, relevant audit history and case outcomes, where actually recorded.",
          "Technical and usage information: IP address or other connection/request metadata handled by infrastructure providers, device/browser details where available, authentication/session cookies, selected-workspace cookie, security and error events, URLs/search terms and basic rate-limiting data.",
          "Feature-specific security evidence, when enabled: encrypted export artifacts, short-lived download authorization hashes, request/attempt metadata, lifecycle journals, notification delivery/suppression records and recovery grants. Their existence in engineering tests does not establish that these features are live for all customers."
        ]
      }
    ]
  },
  {
    "title": "4. How information is obtained",
    "blocks": [
      {
        "type": "paragraph",
        "text": "We obtain personal information directly from account holders and business representatives; from their selected identity providers; from business customers who enter details about other people; from subscription/payment providers when a transaction is initiated; from customer support communications; and from our service infrastructure, security controls and authorized application actions. Individuals who are clients, employees or invitees of a customer may need to contact that customer about the information it has entered. We will assist with requests appropriately where we act as processor."
      }
    ]
  },
  {
    "title": "5. Why we process information",
    "blocks": [
      {
        "type": "paragraph",
        "text": "We process personal information only for defined and appropriate purposes, including:"
      },
      {
        "type": "list",
        "items": [
          "Creating and protecting accounts, authenticating users and administering roles and business access.",
          "Receiving and evaluating subscription inquiries, determining current market availability and providing quotations and supported subscription services.",
          "Hosting customer-directed workflow records, enforcing tenant and role boundaries, and providing requested functions.",
          "Recording and verifying payments, managing subscriptions, accounting and legally required records.",
          "Providing customer support, managing authorized recovery and responding to privacy rights requests.",
          "Detecting misuse, resolving service faults, maintaining security, documenting relevant incidents and protecting the Service.",
          "Providing essential service notices and other communications authorized by law or the relevant customer agreement when the capability is enabled."
        ]
      },
      {
        "type": "paragraph",
        "text": "The applicable legal basis depends on the activity and our role. It may include necessity for an agreement with an individual, a legal obligation, a properly assessed legitimate interest, or valid consent where consent is legally required. Accepting Terms or acknowledging this Policy does not amount to blanket consent for every processing purpose. Customers remain responsible for their own lawful bases and required notices for information they control."
      }
    ]
  },
  {
    "title": "6. Use of customer data, AI and advertising",
    "blocks": [
      {
        "type": "paragraph",
        "text": "We do not authorize selling identifiable customer workspace data or using it for unrelated advertising. We will not use identifiable customer workspace data to train third-party AI models without a separately documented, legally justified arrangement and any required customer authorization. We do not currently authorize an optional marketing program as part of the WorkflowConnect engineering reviewed here. If promotional messages are introduced, they will be governed by an appropriate lawful basis and unsubscribe/objection mechanism, separate from essential service communications."
      }
    ]
  },
  {
    "title": "7. Service providers and other disclosures",
    "blocks": [
      {
        "type": "paragraph",
        "text": "We disclose or make information available only as necessary for the Service, contractual support, lawful instructions, security, payment processing or legal obligations. Recipients may include:"
      },
      {
        "type": "list",
        "items": [
          "Identity providers: Clerk and, where selected, Google sign-in, subject to their own security and identity processing.",
          "Hosting/database providers: infrastructure such as Vercel and managed PostgreSQL/Neon where confirmed as the actual service arrangement.",
          "Payment-related services: Paystack where subscription checkout is enabled, and relevant banking/mobile-money institutions for manual payments and reconciliation.",
          "Email and support providers: the actual business mailbox provider and, if separately activated, a transactional email provider such as Resend.",
          "Authorized support, professional advisers and public authorities: only where appropriately necessary and permitted or required by law."
        ]
      },
      {
        "type": "paragraph",
        "text": "Provider names above reflect the current architecture and procurement-review list, not a claim that every provider is already transmitting live customer information. Before publication we will verify and disclose the actual active providers, applicable roles, countries, contractual safeguards and relevant subprocessor information. We do not permit a provider to receive unrelated customer business data merely because an integration exists in source code."
      }
    ]
  },
  {
    "title": "8. International transfers and locations",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Account registration may be available internationally, and support, authentication, hosting, payment or security services may involve processing or access outside Kenya. Data storage region alone does not determine every location where logs, backups, technical support or supplier personnel may process information. Where personal information is transferred across borders, Stravect and the relevant customer will assess applicable law, contracts and appropriate safeguards. We will not promise that all information remains in Kenya or any other single country unless verified for the complete processing chain."
      }
    ]
  },
  {
    "title": "9. Cookies and browser technologies",
    "blocks": [
      {
        "type": "paragraph",
        "text": "We use or may use strictly necessary session and authentication technologies to sign users in, protect accounts and remember the selected workspace. The application also sets a selected-workspace cookie with security attributes appropriate to its purpose, and identity providers may set their own cookies or equivalent browser data. Infrastructure providers may collect request/security metadata."
      },
      {
        "type": "paragraph",
        "text": "The exact deployed cookies, expiration periods, third-party scripts, logs and browser storage require a production inspection. We will document any nonessential analytics or marketing technologies and provide choices where required before enabling them. Disabling necessary authentication cookies may prevent use of the Service."
      }
    ]
  },
  {
    "title": "10. Security and access safeguards",
    "blocks": [
      {
        "type": "paragraph",
        "text": "We use technical and organizational controls designed to reduce unauthorized use, including authenticated access, tenant and assignment permissions, role-based restrictions, payment/activation checks, limited administrative pathways and security/audit records. Certain sensitive engineering features use encryption and additional authorization when enabled. We seek to limit employee, operator and supplier access to authorized purposes, and to minimize sensitive information in ordinary error messages and logs."
      },
      {
        "type": "paragraph",
        "text": "No online service can guarantee absolute security. Application role checks do not by themselves restrict a database administrator or external infrastructure operator. We periodically assess and improve these controls and investigate reported incidents. We do not claim that every read is audited, every record uses the same encryption method or all provider logs are automatically sanitized."
      }
    ]
  },
  {
    "title": "11. How long we keep information",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Retention depends on why the information is held, whose instructions apply, applicable law, and any justified claim or security exception. Our planned standard paid-workspace lifecycle, subject to verified production rollout, is seven days of grace after qualifying paid coverage ends; archival when that grace ends; cancellation at 60 days after expiry; and review for controlled deletion of ordinary operational records 90 days after cancellation. The resulting E+150 date is an eligibility milestone, not unconditional deletion of every related record."
      },
      {
        "type": "paragraph",
        "text": "Customer financial records may be subject to the customer's own statutory duties. Stravect's subscription/payment/tax evidence, approved legal acceptance records, security/audit records, support and rights cases, and lawful hold evidence require separately justified, documented schedules. Account deletion does not automatically erase customer records belonging to another business or another authorized user."
      },
      {
        "type": "paragraph",
        "text": "Where a secure export feature is specifically enabled, its planned encrypted download artifact is accessible for no more than 24 hours after successful generation, with a separate shorter single-use download authorization; expiry of access does not necessarily mean immediate physical removal of all ciphertext, metadata or backup copies. An exported file saved on a customer's device is no longer controlled by our server cleanup. These features and timelines must be reconciled with live controls before publication."
      },
      {
        "type": "paragraph",
        "text": "We will evaluate lawful requests for earlier correction or erasure separately from commercial subscription expiry. Backups and restores require documented retention and safeguards to prevent records already lawfully deleted from being silently reinstated. We do not promise instantaneous destruction from every backup."
      }
    ]
  },
  {
    "title": "12. Your privacy rights and how to exercise them",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Subject to applicable law and our actual role, individuals may have rights to receive information, access, rectify, restrict, object to, obtain portable copies of, or request erasure of their personal data, and to withdraw consent where consent applies. Some rights are subject to lawful exceptions, including preservation of evidence or the rights of others."
      },
      {
        "type": "paragraph",
        "text": "Email info@stravectsystems.com with the subject \"WorkflowConnect privacy request\" until a dedicated, tested privacy address has been published. We will use proportionate identity and authority checks, keep a record of the request and respond within the applicable legal timeframe. Do not send passwords, MFA codes, session tokens or unnecessary identity documents. If the information is controlled by a customer business, we will identify and coordinate with that business as appropriate; we will not give one person's data to another customer or user simply because they are a workspace Owner."
      },
      {
        "type": "paragraph",
        "text": "For Kenyan privacy matters, individuals may also contact the Office of the Data Protection Commissioner (ODPC) using its official channels at https://www.odpc.go.ke/. Different jurisdictions may provide additional rights and complaint routes where their laws apply."
      }
    ]
  },
  {
    "title": "13. Account deletion, workspace exit and legal evidence",
    "blocks": [
      {
        "type": "paragraph",
        "text": "A global user account, membership in a business workspace and the business's underlying operational data are distinct. Requests to close an account or exit a workspace are evaluated with the continuing rights of other authorized users and customers. Some legal acceptance, payment, security or dispute evidence may need to be preserved in minimized or restricted form for a justified period rather than immediately deleted. The Service's current engineering does not yet provide unrestricted self-service erasure of all data stores. Contact us to begin a managed request."
      }
    ]
  },
  {
    "title": "14. Children and higher-risk information",
    "blocks": [
      {
        "type": "paragraph",
        "text": "WorkflowConnect is intended for ordinary business use, not specialized processing of children's information or sensitive health/biometric information. We ask customers not to enter such details without an appropriate need, lawful basis and separately approved safeguards. We may review and restrict an unsuitable use case. A business field's availability does not imply that every kind of personal information is appropriate to enter."
      }
    ]
  },
  {
    "title": "15. Notices, document versions and changes",
    "blocks": [
      {
        "type": "paragraph",
        "text": "We aim to maintain approved, identifiable versions of our public legal documents and give appropriate notice of material changes. Where an agreement is required, the Service will request and record the applicable agreement; providing this Privacy Policy is primarily a transparency obligation, not universal consent. A historical acknowledgment should remain linked to its actual approved wording when that evidence system is operational. We will not present simulated legal-version tests as real customer approvals."
      }
    ]
  },
  {
    "title": "16. Contact",
    "blocks": [
      {
        "type": "paragraph",
        "text": "Business: Stravect Systems, Kenya"
      },
      {
        "type": "paragraph",
        "text": "Email for privacy and general inquiries: info@stravectsystems.com"
      },
      {
        "type": "paragraph",
        "text": "Website: https://stravectsystems.com"
      },
      {
        "type": "paragraph",
        "text": "Proposed dedicated privacy email: privacy@stravectsystems.com"
      }
    ]
  }
];

export default function PrivacyPage() {
  return <LegalDocument title="WorkflowConnect — Privacy Policy" kind="privacy" documentMetadata={{ version: "Draft 0.1", preparedAt: "11 November 2026", effectiveDate: "[To be confirmed after approval]" }}>
    {sections.map(section => <section key={section.title}>
      <h2>{section.title}</h2>
      {section.blocks.map((block, index) => block.type === "paragraph"
        ? <p key={index}>{block.text}</p>
        : <ul key={index} className="list-disc space-y-2 pl-6">{block.items.map(item => <li key={item}>{item}</li>)}</ul>)}
    </section>)}
  </LegalDocument>;
}
