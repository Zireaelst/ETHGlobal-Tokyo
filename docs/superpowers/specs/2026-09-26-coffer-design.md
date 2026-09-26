# Coffer — Agentic Treasury Design

**Status:** Approved design baseline
**Event:** ETHGlobal Tokyo 2026  
**Target tracks:** Sui — DeFi & Payments; Curvegrid — Best AI Agent Project; World — World ID for Agents

## 1. Product definition

Coffer is an agentic treasury platform for companies, startups, DAOs, and institutional-style finance teams. It receives encrypted invoices and payment requests, evaluates them against enforceable spending policies, automatically executes permitted payments on Sui, and requests fresh human authorization through World only for protected exceptions.

One-line pitch:

> Coffer lets AI manage organizational capital within enforceable Sui spending mandates while humans retain control over critical exceptions and commercial documents remain encrypted.

The product is not a chatbot with a wallet. The agent has an ongoing financial mandate, manages scheduled obligations, detects future cash shortfalls, and initiates real onchain actions. Move contracts—not the AI model—provide the final financial safety boundary.

## 2. Target users and core problem

Coffer supports multiple organization types without changing its core workflow:

- Small and medium businesses handling vendor invoices.
- Startups managing contractors, SaaS subscriptions, and operating expenses.
- DAOs automating recurring contributor and service-provider payments.
- Institutional-style treasury teams that need separation of duties, policy controls, audit trails, and human escalation.

The hackathon build must be described as using **institutional-grade policy controls**, not as production-ready banking infrastructure. It does not provide regulated custody, legal entity verification, KYC, AML screening, or production HSM key management.

The painful problem is that organizations cannot safely give an AI unrestricted wallet access. Human approval for every routine payment eliminates automation, while unlimited agent authority creates unacceptable financial risk. Invoice details and commercial contracts may also be too sensitive to publish onchain.

## 3. Design principles

1. **AI proposes and initiates; Move enforces.** The agent cannot bypass onchain limits.
2. **Human authorization protects high-impact actions, not login.** World is used at a meaningful trust moment.
3. **Privacy claims remain precise.** Coffer protects commercial document content, not Sui transaction amounts or addresses.
4. **Every sponsor is part of the main workflow.** Removing Sui, the agent, or World materially changes the product.
5. **Non-crypto-native users do not need seed phrases or gas management.** Crypto-native wallet access remains available.
6. **Failure is visible and safe.** Cancelled authorization, invalid policy, failed decryption, and duplicate execution never result in payment.
7. **The three-minute demo shows one successful action and one blocked action.**

## 4. Sponsor alignment

### 4.1 Sui — DeFi & Payments

Sui is the financial execution and policy layer:

- Treasury custody and bucketed balances.
- Capability-based roles.
- Enforceable agent mandates.
- Vendor allowlists and spending limits.
- Standing orders and time checks.
- Atomic payment execution.
- Onchain decision receipts.
- zkLogin and optional sponsored transactions for accessible onboarding.
- Seal and Walrus for encrypted commercial context.

The project moves and manages money programmatically. Sui is not used as a decorative settlement rail.

### 4.2 Curvegrid — Best AI Agent Project

MultiBaas is optional and will not be forced into a Sui-native architecture. The Curvegrid submission focuses on the working policy-aware treasury agent:

- It reads blockchain state.
- It extracts structured invoice data.
- It chooses a policy outcome.
- It initiates real onchain payments.
- It refuses or escalates unsafe requests.
- It forecasts obligations and proposes treasury actions.

The dashboard is an operational surface for the agent, not the submission's core achievement.

### 4.3 World — World ID for Agents

World protects material financial actions:

- Activating or expanding an agent mandate.
- Raising a spending limit.
- Adding a new vendor when policy requires it.
- Approving a payment outside the normal mandate.
- Creating or changing a standing order.

The complete flow is request, user completion, secure backend validation of an OIDC authorization-code response, action-bound authorization, and protected onchain execution. Cancellation, expiration, invalid validation, and denial must prevent execution.

The event environment uses mocked identities. Coffer must not describe an event identity or authentication result as real-world identity, corporate authority, KYC, or legal representation.

## 5. User experience

Brand identity, color, typography, component styling, landing-page visuals, and final frontend art direction are intentionally excluded from this document and will be supplied separately by the product owner.

The functional UX supports two entry paths:

- **Continue with Google:** Sui zkLogin for users who should not manage seed phrases.
- **Connect Sui Wallet:** A standard Sui wallet path for crypto-native users.

If sponsored transactions are enabled, users do not need to acquire SUI for routine application interactions.

The interface uses business language:

- Treasury, not shared object.
- Budget, not `Balance<T>`.
- Agent authority, not capability object.
- Payment policy, not contract guard.
- Human approval, not proof flow.
- Private document, not encrypted blob.
- Audit receipt, not transaction event.

### 5.1 Initial setup

1. Sign in with Google or connect a Sui wallet.
2. Create an organization and treasury.
3. Deposit demo stablecoin funds.
4. Allocate funds to operating, reserve, and vendor-committed budgets.
5. Add an approved vendor.
6. Select or customize an agent policy.
7. Use World to authorize the initial financial delegation.
8. Receive the first encrypted invoice.

### 5.2 Required application screens

1. Onboarding and organization creation.
2. Treasury overview.
3. Payment inbox.
4. Payment detail and policy explanation.
5. Agent mandate management.
6. Standing-order management.
7. Human authorization review.
8. Audit and decision receipt history.

The treasury overview must support actions, not merely display balances. It exposes upcoming obligations, cash shortfalls, pending approvals, blocked requests, and agent recommendations.

## 6. Treasury model

### 6.1 Buckets

The treasury holds three balances:

- `operating`: general operating capital.
- `reserve`: protected capital not normally available to the agent.
- `vendor_committed`: capital reserved for approved invoices and standing orders.

Buckets are internal `Balance<T>` values inside the treasury rather than freely transferable standalone objects. This reduces accidental fragmentation and keeps policy enforcement atomic.

### 6.2 Agent mandate

An agent mandate defines:

- Authorized agent address.
- Allowed buckets.
- Maximum amount per payment.
- Total limit per period.
- Current period spend.
- Period duration.
- Validity start and end times.
- Allowed coin type.
- Approved vendors.
- Human-approval threshold.
- Maximum autonomous bucket reallocation.
- Policy version.
- Paused and revoked status.

Changing a policy increments its version. A payment evaluated against an obsolete version cannot execute after the policy changes.

### 6.3 Vendor policy

A vendor policy defines:

- Vendor payment address.
- Active status.
- Allowed source bucket.
- Vendor-specific limit.
- Expiration time.
- Hashes or commitments for encrypted metadata.

The vendor's legal name, contract, purchase order, and invoice line items remain encrypted offchain.

### 6.4 Standing orders

A standing order defines:

- Vendor.
- Amount.
- Source bucket.
- Recurrence interval.
- Next valid execution time.
- End time.
- Maximum number of executions.
- Active status.

An offchain scheduler triggers execution. Sui Clock verifies that execution is due. The product never claims that the blockchain wakes itself up.

## 7. Move object and module design

The Move package is split into focused modules.

### 7.1 `treasury.move`

Owns `Treasury<T>`, internal balances, deposits, admin withdrawals, funding, reallocation, pause, and unpause.

### 7.2 `mandate.move`

Owns `AgentMandate` and validates agent identity, time, policy version, per-payment limit, period limit, bucket access, reallocation limit, and revocation.

### 7.3 `vendor_registry.move`

Owns `VendorPolicy` records and vendor activation, expiration, bucket selection, and limits.

### 7.4 `payment_request.move`

Owns the payment lifecycle. A request contains:

- Requester and vendor addresses.
- Visible settlement amount.
- Source bucket.
- Due and expiration times.
- Invoice digest.
- Walrus blob identifier.
- Current status.
- Policy version.

Statuses are:

- `Pending`
- `AutoApproved`
- `AuthorizationRequired`
- `Held`
- `Rejected`
- `Paid`
- `Expired`

Terminal requests cannot be executed again.

### 7.5 `authorization.move`

Owns single-use `AuthorizationTicket` objects. Each ticket binds:

- An action digest.
- Treasury ID.
- Payment request ID.
- Maximum approved amount.
- Expiration time.
- Unique nonce.
- Used status.

The ticket cannot approve a different vendor, amount, request, or treasury.

### 7.6 `standing_order.move`

Owns standing orders, next execution times, maximum execution count, activation, pausing, and cancellation.

### 7.7 `receipt.move`

Produces auditable `DecisionReceipt` records containing request ID, decision code, policy version, actor, visible settlement amount, time, transaction reference, and an optional encrypted reason blob.

Decision codes include:

- `PAID_WITHIN_MANDATE`
- `VENDOR_NOT_ALLOWED`
- `PER_PAYMENT_LIMIT_EXCEEDED`
- `PERIOD_LIMIT_EXCEEDED`
- `INSUFFICIENT_BUCKET_BALANCE`
- `MANDATE_EXPIRED`
- `HUMAN_AUTHORIZED_EXCEPTION`
- `HUMAN_AUTH_CANCELLED`
- `AUTHORIZATION_EXPIRED`

### 7.8 Capability separation

- `TreasuryAdminCap`: policy changes, pause, and admin withdrawal.
- `AgentCap`: payments and bounded reallocation under an active mandate.
- `WorldVerifierCap`: action-bound authorization ticket creation only.
- `VendorCap`: payment request creation for the associated vendor.
- `AuditorCap`: read/decrypt eligibility without payment authority.

Capability separation is access control, not privacy.

## 8. Agent architecture

The agent worker performs the following loop:

1. Observe a new payment-request event.
2. Fetch the encrypted document from Walrus.
3. Request decryption through the Seal policy.
4. Extract structured invoice fields.
5. Read the current onchain treasury, vendor, and mandate state.
6. Run the deterministic policy engine.
7. Choose `AUTO_EXECUTE`, `HUMAN_AUTH_REQUIRED`, `HOLD`, or `REJECT`.
8. Submit the appropriate transaction or escalation.
9. Store an encrypted detailed explanation and create an onchain receipt.
10. Update the obligation forecast.

The AI extraction result contains vendor candidate, invoice number, amount, currency, due date, purchase-order reference, confidence, and anomalies.

The deterministic policy result contains decision, reason codes, selected bucket, and policy version. Missing required fields or low model confidence always yields `HOLD`; it never defaults to payment.

Every request has an idempotency key. Worker retries and scheduler retries cannot create duplicate payments. The Move contract independently prevents replay.

## 9. Payment flows

### 9.1 Automatic payment

An approved vendor submits an encrypted 80-unit invoice. The agent decrypts it, extracts the data, and finds that the vendor is approved, the amount is under the 100-unit per-payment limit, the period limit remains sufficient, the invoice is due, and the vendor-committed bucket has enough funds. It submits execution. Move repeats the enforceable checks, transfers funds, updates period spend, marks the request paid, and emits a receipt.

### 9.2 Blocked payment

An unknown vendor submits a 240-unit request while the mandate allows 100 units per payment. The policy engine returns `HUMAN_AUTH_REQUIRED` or `REJECT`, with explicit reason codes. A direct execution attempt also fails in Move. No funds move.

### 9.3 Human-authorized exception

The authorized operator reviews the protected action and completes a fresh World authorization. The backend validates it securely, binds it to the exact action payload, and uses `WorldVerifierCap` to create a short-lived, single-use ticket. Move validates and consumes the ticket while executing the exact payment.

If authorization is cancelled, denied, invalid, replayed, or expired, the ticket is not created or cannot be consumed, and payment does not occur.

### 9.4 Standing-order execution

The scheduler detects a due standing order and sends an execution transaction. Move verifies time, active policy, vendor validity, remaining limits, balance, and prior execution state before paying and advancing the next execution time.

### 9.5 Proactive cash-flow warning

The agent sums scheduled obligations over a defined horizon and compares them with available bucket balances. It reports a projected shortfall and proposes a concrete reallocation. It may execute reallocation only if the mandate explicitly grants sufficient reallocation authority; otherwise it waits for a human action.

## 10. World authorization boundary

World Human Continuity is integrated through OpenID Connect. The application stores the OIDC issuer together with the pairwise subject (`iss`, `sub`) to bind a private, service-specific human relationship to the local operator account. A protected payment requests fresh authentication rather than treating an old login session as sufficient.

The backend starts an authorization-code flow with PKCE and stores `state`, `nonce`, the exact pending action, and its expiration server-side. The callback validates the ID token signature against discovered JWKS and checks issuer, audience, expiration, nonce, state, and authentication freshness (`auth_time` against the requested `max_age`). The browser callback alone is never trusted.

The pending authorization payload includes treasury ID, request ID, vendor, amount, expiration, and a unique action nonce. After successful fresh authentication, the backend recomputes the canonical action digest and mints the matching onchain ticket through `WorldVerifierCap`. The pairwise subject authorizes only the local account relationship; it does not prove a legal company role.

For the hackathon build, the configured backend authority mints the onchain authorization ticket after successful official sandbox validation. This backend is an explicit trust boundary. Production improvements such as threshold signing, HSM custody, organizational role attestations, or direct onchain verification are future work, not demo claims.

## 11. Seal and Walrus privacy boundary

Encrypted content can include:

- Invoice PDF or JSON.
- Vendor agreement.
- Purchase order.
- Payment description.
- Internal cost center.
- Detailed agent reasoning.

Seal policies permit authorized treasury operators, an active designated agent, or an auditor to decrypt the relevant content. Walrus stores ciphertext and returns a blob identifier committed into the payment request.

Coffer provides:

- Commercial document confidentiality.
- Policy-based access control.
- Selective document access for agents and auditors.
- Publicly auditable settlement and decision codes.

Coffer does not provide:

- Confidential transfer amounts.
- Hidden sender or recipient addresses.
- Transaction confidentiality.
- Identity anonymity.
- Compliance or sanctions screening.
- KYC or AML verification.

The correct claim is **encrypted commercial context with auditable onchain settlement**, not private payments.

Seal and Walrus are isolated behind a document-privacy adapter because their current SDK and network behavior must be validated early. A failed privacy dependency must safely hold the payment rather than silently use plaintext.

## 12. Backend and repository boundaries

Proposed monorepo layout:

```text
apps/
  web/
  agent-worker/
packages/
  sui-client/
  policy-engine/
  document-privacy/
  world-auth/
  shared-types/
move/
  coffer/
docs/
  superpowers/specs/
```

Recommended baseline:

- pnpm workspace.
- Next.js and TypeScript web application.
- Sui TypeScript SDK and dApp Kit.
- A separate Node/TypeScript agent worker.
- Zod schemas shared across frontend, backend, and worker.
- A minimal persistent database for offchain job state and idempotency.
- Move unit tests and TypeScript integration tests.

The visual frontend system will be implemented only after receiving separate branding and frontend direction.

## 13. Failure behavior

- Invoice extraction failure or low confidence: `HOLD`; no payment.
- Seal decryption failure: retry safely, then `HOLD`; no plaintext fallback.
- Missing Walrus blob: `HOLD`.
- World callback without server-side OIDC validation: rejected.
- Cancelled or expired World authorization: no payment.
- Expired or replayed authorization ticket: Move rejects execution.
- Revoked or expired mandate: Move rejects execution.
- Duplicate scheduler trigger: idempotency and Move replay protection reject the duplicate.
- Insufficient bucket balance: no payment; show a reallocation or funding action.
- Policy version changed after evaluation: execution rejected and re-evaluated.
- Agent service unavailable: automation pauses; funds remain protected.
- Treasury paused: agent payments and standing orders stop.
- Unsupported or unexpected coin type: transaction rejected.

## 14. Testing strategy

### 14.1 Move unit tests

- Successful payment within mandate.
- Per-payment limit exceeded.
- Period limit exceeded.
- Unauthorized vendor.
- Wrong bucket.
- Expired mandate.
- Revoked mandate.
- Reused payment request.
- Reused World ticket.
- Expired World ticket.
- Incorrect action digest.
- Standing order executed too early.
- Standing order executed twice.
- Payment attempted while paused.
- Policy version changed before execution.
- Reallocation within and beyond the allowed bound.

### 14.2 Backend tests

- Invoice schema validation.
- Low confidence produces `HOLD`.
- Stable policy reason codes.
- Job idempotency.
- World server-side validation.
- Nonce replay prevention.
- Action-payload binding.
- Seal and Walrus error handling.
- Scheduler retry behavior.

### 14.3 End-to-end acceptance flows

1. Sign in, create a treasury, fund buckets, and authorize a mandate.
2. Receive and automatically pay an encrypted 80-unit invoice.
3. Receive and block a 240-unit request from an unknown vendor.
4. Complete World authorization and pay the exact approved exception.
5. Cancel or expire a separate authorization and demonstrate that no payment occurs.
6. Trigger a due standing order exactly once.
7. Detect a projected cash shortfall and display an actionable reallocation proposal.

## 15. Three-minute demo

### 0:00–0:25 — Problem

Organizations want AI agents to handle routine payments but cannot safely provide unlimited wallet access, and their invoices contain commercially sensitive information.

### 0:25–0:50 — Treasury

Enter through the accessible login flow and show the three budgets, remaining agent limit, next obligation, pending approvals, and agent activity.

### 0:50–1:20 — Automatic payment

An encrypted 80-unit invoice arrives. The agent decrypts it, explains the applicable policy, and executes the Sui payment. The budget and audit receipt update.

### 1:20–1:50 — Enforced safety boundary

A 240-unit request from an unknown vendor arrives. The agent blocks it. A direct execution attempt is also rejected by Move.

### 1:50–2:25 — Human-authorized exception

The operator reviews the exact action and completes fresh World authorization. Secure backend validation produces a single-use ticket, and the exact payment executes.

### 2:25–2:45 — Proactive treasury agent

The agent detects an upcoming shortfall caused by standing orders and proposes a budget reallocation.

### 2:45–3:00 — Closing statement

> AI decides, Move enforces, humans retain control, and commercial context stays encrypted.

## 16. MVP scope

Required for the submission:

- Google-based zkLogin and standard Sui wallet access.
- Treasury with operating, reserve, and vendor-committed buckets.
- Agent mandate with per-payment and period limits.
- Vendor allowlist.
- One real encrypted invoice stored through Seal and Walrus.
- One successful automatic Sui payment.
- One blocked payment with a visible reason.
- One securely validated World authorization flow.
- One failed, cancelled, denied, or expired authorization path.
- Onchain decision receipts.
- One standing order.
- A simple deterministic cash-shortfall forecast.

Features deferred until the core is stable:

- Multiple organizations per account.
- Complex multi-user role administration.
- Multiple cooperating agents.
- General agent-to-agent service marketplace.
- Autonomous rebalancing beyond a small bounded rule.
- Multiple production coin types.
- Advanced OCR pipelines.
- Confidential transfer amounts.
- Compliance and sanctions screening.

## 17. Completion criteria

The hackathon project is complete when:

- At least one real Sui testnet token transfer occurs through the treasury contract.
- Move independently rejects an out-of-policy payment.
- At least one document is genuinely encrypted with Seal and stored/retrieved through Walrus.
- World authorization is securely validated server-side.
- A cancelled, invalid, or expired authorization does not result in payment.
- The agent changes its action based on actual onchain state.
- The live demo shows a successful and a blocked path.
- Sui, World, Seal, and Walrus integrations are functional rather than hard-coded simulations; the Curvegrid track is entered on the strength of the working AI agent, with MultiBaas explicitly omitted because it is optional and not native to the Sui architecture.
- The README links directly to the relevant code for each track.
- Repository history contains incremental implementation commits.

## 18. Explicit non-goals and claims to avoid

- Do not call ordinary capabilities or allowlists privacy.
- Do not claim transaction or amount confidentiality.
- Do not claim World provides KYC or corporate-role verification.
- Do not describe the AI as the final security boundary.
- Do not claim an onchain cron service.
- Do not add Intercepta, x402, ENS, or a second chain solely for prize eligibility.
- Do not use a risk score that does not affect execution.
- Do not turn the dashboard into the product's central technical contribution.
- Do not describe the hackathon build as production-ready institutional custody.
