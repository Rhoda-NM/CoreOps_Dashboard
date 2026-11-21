# Phase 4C — Staging acceptance assessment

21 November 2026. Read-only investigation of business implementation; disposable local synthetic tests only. No payment, entitlement, clock configuration, schema, migration, live target or provider setting changed.

## Finding and correction to the earlier report

**RC-TIME-1 / high priority: paid-period start instants depend on the database session timezone in the tested stack.** This blocks staging acceptance until separately fixed and verified. Phase 4B's explanation that the automatic-activation assertions were stale is not supported by current source. This assessment supersedes that causal explanation; the historical report is retained unchanged.

[Paystack reconciliation](../src/server/payments/paystack.ts) independently verifies the payer's current Clerk identity, persists a matching verified receipt and calls [activateStandardPayment](../src/server/commercial/standard.ts). STANDARD staging activation is conditional and automatic. It requires current environment, market, Owner, quote, exact funding, capacity, receipt and history checks; upgrades remain reviewed. Other commercial paths retain their own activation requirements. Consequently, tests expecting automatic activation of a qualifying STANDARD Test Mode purchase are appropriate.

The activation service reads `SELECT clock_timestamp() AS now`, derives a period start and persists the paid period. [commercialAccess](../src/server/commercial/access.ts) correctly requires an existing nonrevoked period whose start is no later than the current application instant. An ACTIVE Workspace/Subscription alone does not authorize business access.

## Controlled reproduction and evidence

Same application source, unchanged `tests/staging.integration.cjs`, final 38-migration chain, fresh PostgreSQL 16 loopback clusters, synthetic Clerk/Paystack substitutions and outbound-provider tripwires. The test target never uses the ordinary `.env` database URL. Each private cluster stops in its harness's finally block.

| Database session timezone | Result |
| --- | --- |
| UTC | 20 passing TAP nodes, zero failures. |
| Africa/Nairobi | 12 passing nodes, eight failed nodes: seven scenarios plus their parent container. |

A temporary test-process-only wrapper logged booleans, without customer data, IDs, credentials or exception bodies:

- Workspace and Subscription were ACTIVE, but commercial access found no currently started period.
- A stored nonrevoked period existed; its start was approximately three hours in the future.
- Database epoch time matched the Node clock within the diagnostic tolerance.
- The raw timestamp returned as a Date was approximately three hours ahead of that clock.

This isolates a raw timestamp transport/normalization discrepancy in the tested stack, rather than actual clock drift or missing activation in every failing case. It does not yet identify the exact driver/adapter conversion responsible. Setting a test session to UTC is a controlled comparison, **not** an approved deployment workaround or a waiver of non-UTC compatibility.

Evidence: `/tmp/workflowconnect-phase4c-staging-{utc,nairobi}.log`; temporary guarded cluster harnesses and boolean-only hook use the same prefix. These are protected temporary engineering evidence, not durable release custody. They do not establish the timezone or behavior of actual Preview/Production.

## Failing scenarios and expected guarantees

| Scenario in the unchanged suite | Expected guarantee / observed boundary |
| --- | --- |
| Concurrent signed webhook and reconciliation | One receipt/period and immediate authorized access for qualifying STANDARD funding. Receipt/activation can commit while the future start denies access. |
| Returning subscribed customer | Existing eligible member can operate; foreign tenant remains denied. The current-period predicate denies the legitimate member. |
| Renewal | Contiguous future period without duplicate or premature entitlement. The incorrectly future initial period invalidates current-entitlement assumptions. |
| Abandoned/failed payment later reconciled | Verified eventual success may activate once; the resulting start can remain future. |
| Independently failed checkout replaced | Preserve history and activate a later valid attempt once; current-period availability fails. |
| Upgrade remains reviewed | Existing paid entitlement remains effective until the reviewed change; the missing current period cascades into this assertion. |
| Admin suspension/restoration | Suspension denies operations and permitted restoration restores existing eligibility; future period start continues denying access. |

These are seven failing scenarios, not seven independently established payment bugs. Negative signature/amount/currency/metadata checks, international inquiry, market-revocation financial preservation, audit rollback, annual duration, reversal and raw automatic-period integrity tests pass in the non-UTC run. Passing portions do not override the acceptance blocker.

## Proposed separate task: RC-TIME-1

1. Trace PostgreSQL timestamp types, raw-query decoding and Prisma/adapter Date serialization using synthetic instants and UTC/Nairobi sessions. Review other raw clock uses for the same conversion class without assuming they all fail.
2. Preserve absolute instants through raw reads and persisted periods; retain all current-start, market, identity, funding, reversal and lifecycle conditions. Do not ignore `startsAt`, trust ACTIVE alone, backdate paid evidence or edit historical periods to make tests pass.
3. Add a timezone matrix covering initial activation, renewal, callbacks/reconciliation concurrency, retries, replay, future-period denial and reversal. Prove identical instants and consistent authorization across sessions.
4. Separately authorize actual staging timezone/target inspection and decide whether any existing synthetic periods require a reviewed correction. No live data assessment was performed here.
5. Re-run the complete staging suite and signed-in Test Mode journey before release-candidate acceptance. Any repair of persisted evidence needs explicit scope and provenance.

No business fix is implemented by Phase 4C. Actual Clerk/MFA, Paystack delivery, deployed runtime, provider settings and Production prerequisites remain separate acceptance work.
