# Transactional template proposals — N-D

10 November 2026. **DRAFT FOR APPROVAL; not published, rendered by a production sender, or approved legal-notice evidence.** Runtime HTTP-mock tests continue using explicitly simulated `.test` copy. This catalog does not change source identities or enable new producers.

All proposed versions are `PROPOSED-TRANSACTIONAL-v1`. Proposed sender: `WorkflowConnect <updates@notify.workflowconnect.io>`. Proposed reply-to: `info@stravectsystems.com`; mailbox ownership/monitoring must be confirmed. Replies go to human support, never an automated inbound agent. They do not verify payment, recover identity, or authorize access.

For every row, proposed body is: **“{subject}. Sign in to WorkflowConnect to review the current status and available next steps. {secure central link}. Need help? Reply to this email.”** The subject in the row supplies `{subject}`. Do not interpolate workspace/client names, payment amounts, account identifiers, review reasons or customer content. No tokens, artifacts, attachments, tracking pixels or tracking redirects.

Use configured HTTPS central origins only: customer commercial `/dashboard`; export/recovery `/account/data`; administrator review `/platform/notifications`. Links confer no authority: live Clerk, role, tenant and MFA checks still apply. Proposed HTML uses a single heading, descriptive secure-link text, readable contrast, language metadata, mobile spacing and an equivalent plain-text body. Approval includes screen-reader and actual email-client testing.

Global suppression for every row: unverified/conflicting/changed frozen binding; recipient no longer eligible; stale source, missed delivery deadline, paused kind/account; active bounce/complaint suppression or missing lookup keys; historical review/cutover; unavailable restore admission; UNKNOWN outside reconciliation; EXPORT_AVAILABLE regardless of controls. Temporary identity/provider failure defers within the existing deadline. Factual evidence remains stored after loss of send authority. Required lead-time/evidence and retention policies require separate approval; these proposed useful delays do not satisfy legal obligations.

| Kind / version | Authoritative source and required current state | Recipient policy | Proposed subject / body prefix | Maximum useful delay (proposal) |
| --- | --- | --- | --- | --- |
| `QUOTE_READY` / v1 proposal | Approved current unaccepted quote | Verified active owners | Your quotation is ready for review | 48 h; before quote ceases to be current |
| `QUOTE_ACCEPTED` / v1 proposal | Committed accepted quote | Verified active owners | Quotation acceptance recorded | 24 h; while request remains current |
| `PAYMENT_CLAIM_RECEIVED` / v1 proposal | Committed payer submission pending review | Verified active owners | Payment details received for review | 24 h; stop when review finishes |
| `PAYMENT_REVIEW_REQUIRED` / v1 proposal | Committed pending payment claim | Active Billing/Super administrators | A payment case needs review | 4 h; stop when review finishes |
| `PAYMENT_VERIFIED` / v1 proposal | Independently verified unreversed receipt | Verified active owners | A payment receipt has been verified | 48 h; stop on reversal |
| `PAYMENT_REVIEW_UPDATED` / v1 proposal | Rejected claim and matching platform audit | Verified active owners | Your payment review status changed | 48 h; still matching decision |
| `PAYMENT_STATUS_CHANGED` / v1 proposal | Immutable receipt reversal | Verified active owners and independent billing review intent | Your payment record status changed | 24 h; preserve fact, generic copy only |
| `COMMERCIAL_REQUEST_CLOSED` / v1 proposal | Closed request and matching audit | Verified active owners | Your subscription request is closed | 48 h; closure still applicable |
| `SUBSCRIPTION_CONFIRMED` / v1 proposal | Activated non-revoked paid period | Verified active owners plus independently eligible restoration claimant, deduplicated | Your paid subscription period is recorded | 48 h; paid period still applicable |
| `RENEWAL_APPROACHING` / v1 proposal | Paid-period E−7 milestone | Verified active owners | Review your upcoming renewal | 24 h; before E; suppress continuous renewal |
| `EXPIRED_GRACE_STARTED` / v1 proposal | Paid-period E milestone | Verified active owners | Your subscription grace period has started | 24 h; within grace; suppress renewal |
| `GRACE_ENDING` / v1 proposal | Paid-period E+5 milestone | Verified active owners | Your subscription grace period is ending | 12 h; before archive; suppress renewal |
| `WORKSPACE_ARCHIVED` / v1 proposal | Paid-period E+7 plus matching committed archive event | Verified active owners | Your workspace is archived | 24 h; still archived |
| `CANCELLATION_WARNING` / v1 proposal | Paid-period E+46 milestone | Verified active owners | Review your workspace cancellation deadline | 24 h; before E+60; required lead-time policy unapproved |
| `WORKSPACE_CANCELED` / v1 proposal | Paid-period E+60 plus committed cancellation event | Verified active owners under approved notice policy | Your workspace is canceled | 24 h; still canceled |
| `RETENTION_END_APPROACHING_30` / v1 proposal | E+120 and matching cancellation episode | Verified active owners under approved notice policy | Review your data-retention deadline | 24 h; before E+150; notice does not authorize deletion |
| `RETENTION_END_APPROACHING_7` / v1 proposal | E+143 and matching cancellation episode | Verified active owners under approved notice policy | Your data-retention deadline is approaching | 12 h; before E+150; notice does not authorize deletion |
| `EXPORT_REQUEST_ACCEPTED` / v1 proposal | Committed export request | Independently verified requester with current owner/reviewed authority | Your export request was received | 5 min; request still usable |
| `EXPORT_AVAILABLE` / v1 proposal | Committed READY artifact | Independently verified authorized requester | Your export is ready | DISABLED until N-X; no usable 24-hour window exists |
| `EXPORT_PREPARATION_FAILED` / v1 proposal | Committed failed export | Independently verified original requester | Your export could not be prepared | 24 h; generic failure status |
| `EXPORT_UNAVAILABLE` / v1 proposal | Committed expired/unavailable export | Independently verified original requester | Your export is no longer available | 24 h; no ready or download assertion |
| `RECOVERY_REQUEST_ACCEPTED` / v1 proposal | Committed recovery request | Independently verified original claimant | Your recovery request was received | 24 h; request still awaiting review |
| `RECOVERY_REVIEW_REQUIRED` / v1 proposal | Committed pending recovery request | Active Super administrators only | A recovery request needs review | 4 h; still pending |
| `RECOVERY_REVIEW_UPDATED` / v1 proposal | Committed recovery decision | Independently verified original claimant | Your recovery review status changed | 4 h; approved variant requires current unrevoked unexpired grant |
| `RECOVERY_ACCESS_WITHDRAWN` / v1 proposal | Committed grant revocation | Independently verified original claimant | Your recovery access was withdrawn | 24 h; verification does not require withdrawn grant |
| `RECOVERY_ACCESS_EXPIRED` / v1 proposal | Committed grant-expiry event | Independently verified original claimant | Your recovery access expired | 24 h; verification does not require expired grant |

The current source registry has 26 kinds. WORKSPACE_REACTIVATED/RESTORED coalesce with subscription confirmation and remain audit-only as separate notification sources. EXPORT_DOWNLOAD_AUTHORIZED and checkout initialization remain audit-only; no email claims successful download, refund or deletion. No invitations, marketing, abandoned checkout, incomplete registration, routine tasks, app-owned global security or membership-subject producer is added. Clerk retains responsibility for its own authentication messages. Final copy must reflect the approved deployment's actual lifecycle: live day-60 enforcement remains disabled.
