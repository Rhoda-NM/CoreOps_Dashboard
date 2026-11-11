# P-C1 — minimum privacy-safe application logging contract

11 November 2026. Implemented for quick invoice only; this is an engineering standard, not proof of deployed cloud logging controls or a new retention/legal policy.

## Implemented boundary

`src/server/privacy/safe-failure.ts` accepts an unknown exception but emits only a closed code, fixed event name and freshly generated UUID reference:

```json
{"event":"QUICK_INVOICE_OPERATION_FAILED","code":"QUICK_INVOICE_FAILED","reference":"<server-generated UUID>"}
```

The record is serialized as one JSON line. No exception object, message, stack, cause, SQL/Prisma metadata, URL, request body, form contents, resource/customer/user ID, provider response, token, credential or connection information is passed to this sink. Incoming request/correlation headers do not supply the reference. A reference is for troubleshooting, not authorization or idempotency; no public log-lookup endpoint is provided. Platform-added request metadata is a separate verification boundary.

| Code | Meaning / public outcome |
| --- | --- |
| `QUICK_INVOICE_VALIDATION` | Fixed schema/field messages; no persistence and no ordinary error log. |
| `QUICK_INVOICE_UNAVAILABLE` | Typed authorization/unavailable-record denial. Forbidden/not-found distinctions and resource identifiers are not exposed. |
| `QUICK_INVOICE_CONFLICT` | Typed conflict or genuine Prisma P2002; no constraint/target/value details. Does not claim invoice-number uniqueness exists. |
| `QUICK_INVOICE_FAILED` | Unexpected create/database/provider/validation/transaction failure; generic message, success=false. |
| `QUICK_INVOICE_REFRESH_FAILED` | Creation already committed; refresh failed. Public response truthfully reports creation with refresh guidance and a reference; it does not initiate a second insertion. |

Next.js redirect/not-found control flow is rethrown before application logging/mapping. Installed Next 16.2.4 exports `unstable_rethrow`; this version-specific API is covered by tests and needs revalidation on SDK/framework upgrades. It is not a general bypass for arbitrary failure messages.

Logging-sink failure does not cause a raw-exception fallback, turn failed creation into success, or undo a committed invoice. This is not a guarantee that the provider accepted/stored a log. Sink availability/alerting requires operational verification. Transactional invoice audit writes remain separate and authoritative: failure rolls back the invoice.

## Minimum standard for future logging reviews

1. Public responses use approved fixed messages/codes and necessary field validation only. Never serialize arbitrary errors or `error.message`. Return true success only for committed operations.
2. Ordinary logs use allowlisted event/code fields and server-generated references. Do not spread user/context objects. Do not log authorization cookies/headers, invite/download tokens, OAuth material, payment credentials, full callback URLs, client contacts or unnecessary business records.
3. Debugging requires an authorized, isolated synthetic reproducer. P-C1 adds no environment switch that dumps raw exceptions in production. Any separately approved restricted diagnostic facility needs explicit access, minimization/redaction, purpose, retention and destruction controls; it is not an ordinary console fallback.
4. Authenticate support users and establish authority before discussing a reference. Keep diagnostic access distinct from workspace/platform roles: app roles do not automatically authorize Vercel/Neon consoles or log drains.
5. Before deployment, record actual log destinations, IAM readers/exporters, MFA/access reviews, ingestion/redaction, region/transfer arrangements, retention duration and drain/backup deletion behavior. Choose a documented purpose-limited retention period, not an invented indefinite default. Correlation/time metadata is not automatically anonymous.
6. Confirm real hosting serializers, automatic framework logs, HTTP access logs, request/body capture, third-party monitoring and incident export copies. Sanitizing one console call does not sanitize all infrastructure logging.
7. Restrict local evidence at creation (`umask 077`, mode 0600), keep backups protected, and move approved evidence to durable access-controlled custody. Do not open or copy customer logs/secrets into test fixtures. No bulk cleanup or modification of older evidence is authorized by this standard.

## Local observations for this checkpoint

New `/tmp/workflowconnect-pc1-*` evidence is created with `umask 077`; observed test logs have mode 0600. Existing sampled N-X/N-D logs remain 0664; the sampled lifecycle backup remains 0600. Only file metadata was reviewed; older logs and backup contents were not inspected, re-permissioned or deleted. Parent ACL/container/host isolation affects effective access. These observations establish neither real customer exposure nor cloud retention/IAM controls.

There is no claim that Vercel filtering, privileged log access, retention or log-drain configuration has been verified or changed. See the P-C1 acceptance report for source coverage and remaining URL/provider boundaries.
