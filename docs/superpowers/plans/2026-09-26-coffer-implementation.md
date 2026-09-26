# Coffer MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a testnet-ready agentic treasury that stores encrypted invoice context, enforces agent spending mandates in Sui Move, automatically pays valid requests, blocks invalid requests, and uses fresh World authorization for exact payment exceptions.

**Architecture:** A pnpm monorepo contains a Next.js operator app, a Node agent worker, focused TypeScript packages, and one Sui Move package. The worker may interpret invoices and propose actions, but Move independently enforces treasury, vendor, limit, replay, and time rules. World validation and Seal/Walrus access are isolated behind typed adapters so their trust boundaries and failures remain explicit.

**Tech Stack:** Node 22, pnpm 10, TypeScript, Next.js App Router, React, Zod, Vitest, Sui CLI 1.52+, Move 2024 edition, `@mysten/sui`, `@mysten/dapp-kit`, `@mysten/zklogin`, `@mysten/seal`, `@mysten/walrus`, World event development environment, Playwright.

## Global Constraints

- Target exactly three fresh-project tracks: Sui DeFi & Payments, Curvegrid Best AI Agent Project, and World ID for Agents.
- MultiBaas is optional and must not be inserted into the Sui architecture merely for decoration.
- Intercepta, ENS, x402, and a second chain are out of scope for the MVP.
- AI may extract data and choose a proposed decision; Move remains the final financial enforcement boundary.
- World protects high-impact actions and exceptions; it is not the normal login mechanism, KYC, corporate-role verification, or compliance screening.
- Seal/Walrus protect commercial document content; transaction amounts and Sui addresses remain public.
- A privacy failure must hold the payment; the application must never silently fall back to plaintext.
- Support both Google-based zkLogin and a standard Sui wallet; gas sponsorship is optional until the core payment path passes.
- Use `DemoUSD` on testnet unless a verified event-provided stablecoin package is available; label it honestly as a demo asset.
- Branding, color, typography, and final visual components are excluded until the product owner supplies frontend direction.
- Every task follows TDD, ends with passing targeted tests, and creates a focused Git commit.
- Never commit secrets, private keys, zkLogin salts, World credentials, or hosted RPC credentials.
- Use the official Sui RPC by default. `SUI_RPC_URL` and `NEXT_PUBLIC_SUI_RPC_URL` may point to a confirmed free Alchemy, QuickNode, or other Sui endpoint without changing code.

---

## File map

```text
.
├── .env.example                         # Public configuration contract; no secrets
├── .github/workflows/ci.yml             # TypeScript and Move verification
├── package.json                         # Workspace scripts
├── pnpm-workspace.yaml                  # Workspace membership
├── tsconfig.base.json                   # Shared strict TypeScript settings
├── apps/
│   ├── web/                             # Functional Next.js operator interface
│   └── agent-worker/                    # Event polling, decisions, execution, schedules
├── packages/
│   ├── shared-types/                    # Zod schemas and cross-process types
│   ├── policy-engine/                   # Deterministic decision logic
│   ├── sui-client/                      # Transaction builders and object readers
│   ├── document-privacy/                # Seal/Walrus adapter
│   └── world-auth/                      # World validation and action binding
├── move/coffer/
│   ├── Move.toml
│   ├── sources/                         # DemoUSD, treasury, mandate, payments, auth, orders
│   └── tests/                           # Move unit tests
├── e2e/                                 # One-command demo acceptance tests
└── scripts/                             # Publish and deterministic demo seeding
```

## Task 1: Establish the tested monorepo foundation

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/src/index.ts`
- Create: `packages/shared-types/src/index.test.ts`

**Interfaces:**
- Produces: `BucketName`, `AgentDecision`, `InvoiceExtraction`, `PolicyResult`, `ActionAuthorizationPayload`, and `PaymentStatus` schemas/types.
- Consumed by: all TypeScript packages, worker, and web app.

- [x] **Step 1: Create workspace manifests and install the test toolchain**

```json
// package.json
{
  "name": "coffer",
  "private": true,
  "packageManager": "pnpm@10.12.1",
  "scripts": {
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck",
    "move:build": "cd move/coffer && sui move build",
    "move:test": "cd move/coffer && sui move test"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

Run: `pnpm install`

Expected: a lockfile is created and installation exits 0.

- [x] **Step 2: Write failing shared-schema tests**

```ts
// packages/shared-types/src/index.test.ts
import { describe, expect, it } from "vitest";
import { invoiceExtractionSchema, policyResultSchema } from "./index";

describe("shared schemas", () => {
  it("rejects an invoice with a non-positive amount", () => {
    expect(() => invoiceExtractionSchema.parse({
      vendorCandidate: "Tokyo Cloud Ltd.",
      invoiceNumber: "INV-001",
      amount: 0,
      currency: "DEMO_USD",
      dueAtMs: 1,
      confidence: 0.99,
      anomalies: [],
    })).toThrow();
  });

  it("requires reason codes for non-executing decisions", () => {
    expect(() => policyResultSchema.parse({
      decision: "REJECT",
      reasonCodes: [],
      selectedBucket: null,
      policyVersion: 1,
    })).toThrow();
  });
});
```

- [x] **Step 3: Run the test and verify the missing-module failure**

Run: `pnpm --filter @coffer/shared-types test`

Expected: FAIL because `./index` and package scripts are not defined.

- [x] **Step 4: Implement the shared schemas**

```ts
// packages/shared-types/src/index.ts
import { z } from "zod";

export const bucketNameSchema = z.enum(["OPERATING", "RESERVE", "VENDOR_COMMITTED"]);
export const agentDecisionSchema = z.enum(["AUTO_EXECUTE", "HUMAN_AUTH_REQUIRED", "HOLD", "REJECT"]);
export const paymentStatusSchema = z.enum([
  "PENDING", "AUTO_APPROVED", "AUTHORIZATION_REQUIRED", "HELD", "REJECTED", "PAID", "EXPIRED",
]);

export const invoiceExtractionSchema = z.object({
  vendorCandidate: z.string().min(1),
  invoiceNumber: z.string().min(1),
  amount: z.number().positive(),
  currency: z.literal("DEMO_USD"),
  dueAtMs: z.number().int().nonnegative(),
  purchaseOrder: z.string().optional(),
  confidence: z.number().min(0).max(1),
  anomalies: z.array(z.string()),
});

export const policyResultSchema = z.object({
  decision: agentDecisionSchema,
  reasonCodes: z.array(z.string()),
  selectedBucket: bucketNameSchema.nullable(),
  policyVersion: z.number().int().positive(),
}).superRefine((value, ctx) => {
  if (value.decision !== "AUTO_EXECUTE" && value.reasonCodes.length === 0) {
    ctx.addIssue({ code: "custom", message: "A non-executing decision needs a reason code" });
  }
});

export const actionAuthorizationPayloadSchema = z.object({
  treasuryId: z.string().min(1),
  paymentRequestId: z.string().min(1),
  vendor: z.string().min(1),
  amount: z.string().regex(/^\d+$/),
  expiresAtMs: z.number().int().positive(),
  nonce: z.string().min(16),
});

export type BucketName = z.infer<typeof bucketNameSchema>;
export type AgentDecision = z.infer<typeof agentDecisionSchema>;
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;
export type InvoiceExtraction = z.infer<typeof invoiceExtractionSchema>;
export type PolicyResult = z.infer<typeof policyResultSchema>;
export type ActionAuthorizationPayload = z.infer<typeof actionAuthorizationPayloadSchema>;
```

Add a package manifest with `test: vitest run` and `typecheck: tsc --noEmit`.

- [x] **Step 5: Verify and commit**

Run: `pnpm --filter @coffer/shared-types test && pnpm --filter @coffer/shared-types typecheck`

Expected: 2 tests pass and TypeScript exits 0.

```bash
git add package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json .gitignore .env.example packages/shared-types
git commit -m "chore: initialize Coffer workspace"
```

## Task 2: Implement DemoUSD and bucketed treasury custody

**Files:**
- Create: `move/coffer/Move.toml`
- Create: `move/coffer/sources/demo_usd.move`
- Create: `move/coffer/sources/treasury.move`
- Create: `move/coffer/tests/treasury_tests.move`

**Interfaces:**
- Produces: `DemoUSD`, `Treasury<DemoUSD>`, `TreasuryAdminCap`, bucket constants, `create`, `deposit`, `rebalance`, `pause`, and balance readers.
- Consumed by: policy, payment, standing-order, publish, and seed tasks.

- [x] **Step 1: Generate the Move package and write failing custody tests**

Run: `sui move new move/coffer`

Write tests that create a treasury, deposit 1,000 units into operating, move 300 to vendor-committed, and assert balances `700/0/300`. Add expected-failure tests for reserve reallocation beyond admin authority and all reallocation while paused.

- [x] **Step 2: Run the failing tests**

Run: `cd move/coffer && sui move test`

Expected: FAIL because `demo_usd` and `treasury` APIs do not exist.

- [x] **Step 3: Implement the minimal treasury API**

```move
public struct Treasury<phantom T> has key {
    id: UID,
    organization: String,
    operating: Balance<T>,
    reserve: Balance<T>,
    vendor_committed: Balance<T>,
    paused: bool,
    policy_version: u64,
    total_paid: u64,
}

public struct TreasuryAdminCap has key, store {
    id: UID,
    treasury_id: ID,
}
```

Implement `create<T>`, `deposit_operating<T>`, `admin_rebalance<T>`, `pause<T>`, `unpause<T>`, and immutable balance getters. All mutations verify `object::id(treasury) == cap.treasury_id`.

- [x] **Step 4: Run Move verification**

Run: `cd move/coffer && sui move test && sui move build`

Expected: all treasury tests pass and the package builds.

- [x] **Step 5: Commit**

```bash
git add move/coffer
git commit -m "feat(move): add bucketed treasury custody"
```

## Task 3: Enforce vendors, mandates, and payment replay protection

**Files:**
- Create: `move/coffer/sources/mandate.move`
- Create: `move/coffer/sources/vendor_registry.move`
- Create: `move/coffer/sources/payment_request.move`
- Create: `move/coffer/sources/receipt.move`
- Create: `move/coffer/tests/payment_policy_tests.move`
- Modify: `move/coffer/sources/treasury.move`

**Interfaces:**
- Produces: `AgentCap`, `AgentMandate`, `VendorPolicy`, `PaymentRequest`, `DecisionReceipt`, `execute_within_mandate`.
- Consumes: treasury balances and Sui `Clock`.

- [x] **Step 1: Write failing policy tests**

Create tests for: an 80-unit approved-vendor payment succeeds under a 100-unit single limit; 101 units aborts; an unknown vendor aborts; a second execution of the same request aborts; a period total above the mandate aborts; an obsolete policy version aborts.

- [x] **Step 2: Confirm the tests fail before implementation**

Run: `cd move/coffer && sui move test payment_policy_tests`

Expected: FAIL with missing modules/functions.

- [x] **Step 3: Implement policy objects and a single atomic payment entry point**

```move
public struct AgentMandate has key {
    id: UID,
    treasury_id: ID,
    agent: address,
    max_per_payment: u64,
    period_limit: u64,
    period_spent: u64,
    period_started_at_ms: u64,
    period_duration_ms: u64,
    valid_from_ms: u64,
    valid_until_ms: u64,
    approval_threshold: u64,
    max_rebalance: u64,
    policy_version: u64,
    revoked: bool,
}
```

`execute_within_mandate<T>` must check treasury pause state, sender/AgentCap binding, clock range, vendor status, request state, exact policy version, single limit, period limit, due time, expiration, and bucket balance before taking a coin and transferring it. It then increments period spend, marks the request paid, and emits a receipt event in the same transaction.

- [x] **Step 4: Prove each guard with targeted tests**

Run: `cd move/coffer && sui move test payment_policy_tests`

Expected: success plus all expected-abort cases pass.

- [x] **Step 5: Commit**

```bash
git add move/coffer
git commit -m "feat(move): enforce agent payment mandates"
```

## Task 4: Add action-bound World authorization tickets

**Files:**
- Create: `move/coffer/sources/authorization.move`
- Create: `move/coffer/tests/authorization_tests.move`
- Modify: `move/coffer/sources/payment_request.move`

**Interfaces:**
- Produces: `WorldVerifierCap`, `AuthorizationTicket`, `mint_ticket`, `execute_with_authorization`.
- Consumes: a 32-byte action digest computed from the canonical authorization payload.

- [x] **Step 1: Write failing authorization tests**

Cover exact successful exception payment, wrong request ID, changed amount, changed vendor digest, expired ticket, reused ticket, and an unauthorized ticket minter.

- [x] **Step 2: Run the failing tests**

Run: `cd move/coffer && sui move test authorization_tests`

Expected: FAIL because authorization types are missing.

- [x] **Step 3: Implement single-use tickets**

```move
public struct AuthorizationTicket has key {
    id: UID,
    treasury_id: ID,
    payment_request_id: ID,
    action_digest: vector<u8>,
    max_amount: u64,
    expires_at_ms: u64,
    nonce: vector<u8>,
}
```

Consume the ticket by value during `execute_with_authorization`; verify every binding before payment and delete the ticket after successful execution. A failed transaction must preserve all state atomically.

- [x] **Step 4: Run all Move tests**

Run: `pnpm move:test`

Expected: treasury, policy, and authorization suites all pass.

- [x] **Step 5: Commit**

```bash
git add move/coffer
git commit -m "feat(move): add World-bound payment authorization"
```

## Task 5: Add standing orders and deterministic cash obligations

**Files:**
- Create: `move/coffer/sources/standing_order.move`
- Create: `move/coffer/tests/standing_order_tests.move`
- Modify: `move/coffer/sources/receipt.move`

**Interfaces:**
- Produces: `StandingOrder`, `create_order`, `execute_due_order`, `pause_order`, `cancel_order`.
- Consumes: active mandate, vendor policy, treasury, and Sui `Clock`.

- [x] **Step 1: Write failing time and replay tests**

Cover early execution, exact due-time execution, repeated execution at the same due time, mandate revocation, insufficient bucket balance, maximum execution count, and cancellation.

- [x] **Step 2: Verify red tests**

Run: `cd move/coffer && sui move test standing_order_tests`

Expected: FAIL because the module is absent.

- [x] **Step 3: Implement deterministic scheduling state**

```move
public struct StandingOrder has key {
    id: UID,
    treasury_id: ID,
    vendor: address,
    amount: u64,
    bucket: u8,
    interval_ms: u64,
    next_execution_at_ms: u64,
    end_at_ms: u64,
    execution_count: u64,
    max_executions: u64,
    active: bool,
}
```

Advance `next_execution_at_ms` only in the same successful transaction that transfers funds.

- [x] **Step 4: Verify the complete Move package**

Run: `pnpm move:test && pnpm move:build`

Expected: all suites pass and package builds.

- [x] **Step 5: Commit**

```bash
git add move/coffer
git commit -m "feat(move): add enforceable standing orders"
```

## Task 6: Build the deterministic policy engine

**Files:**
- Create: `packages/policy-engine/package.json`
- Create: `packages/policy-engine/src/evaluate-payment.ts`
- Create: `packages/policy-engine/src/evaluate-payment.test.ts`
- Create: `packages/policy-engine/src/forecast.ts`
- Create: `packages/policy-engine/src/forecast.test.ts`

**Interfaces:**
- Produces: `evaluatePayment(input): PolicyResult` and `forecastShortfall(input): CashForecast`.
- Consumes: parsed invoice and an exact onchain snapshot.

- [x] **Step 1: Write table-driven failing decision tests**

```ts
it.each([
  ["approved request", baseInput, "AUTO_EXECUTE", []],
  ["unknown vendor", { ...baseInput, vendorApproved: false }, "HUMAN_AUTH_REQUIRED", ["VENDOR_NOT_ALLOWED"]],
  ["single limit", { ...baseInput, amount: 101n }, "HUMAN_AUTH_REQUIRED", ["PER_PAYMENT_LIMIT_EXCEEDED"]],
  ["low confidence", { ...baseInput, extractionConfidence: 0.69 }, "HOLD", ["LOW_EXTRACTION_CONFIDENCE"]],
  ["expired mandate", { ...baseInput, mandateActive: false }, "REJECT", ["MANDATE_INACTIVE"]],
])("evaluates %s", (_name, input, decision, reasonCodes) => {
  expect(evaluatePayment(input)).toMatchObject({ decision, reasonCodes });
});
```

- [x] **Step 2: Run and confirm failure**

Run: `pnpm --filter @coffer/policy-engine test`

Expected: FAIL because `evaluatePayment` is missing.

- [x] **Step 3: Implement explicit ordered rules**

Rules execute in this order: invalid extraction → inactive treasury/mandate → expired request → policy version mismatch → vendor rule → per-payment limit → period limit → bucket balance → due-time check → auto-execute. No LLM call occurs inside this package.

- [x] **Step 4: Add and pass cash forecast tests**

`forecastShortfall` accepts current bucket balance and dated obligations, sums obligations within the horizon, and returns `shortfall = max(0, obligations - balance)` plus the first shortage date.

Run: `pnpm --filter @coffer/policy-engine test`

Expected: all decision and forecast tests pass.

- [x] **Step 5: Commit**

```bash
git add packages/policy-engine
git commit -m "feat: add deterministic treasury policy engine"
```

## Task 7: Integrate Seal and Walrus behind a fail-closed adapter

**Files:**
- Create: `packages/document-privacy/package.json`
- Create: `packages/document-privacy/src/types.ts`
- Create: `packages/document-privacy/src/seal-walrus.ts`
- Create: `packages/document-privacy/src/seal-walrus.test.ts`
- Create: `packages/document-privacy/src/memory-adapter.ts`

**Interfaces:**
- Produces: `DocumentPrivacy.put`, `DocumentPrivacy.get`, and `EncryptedDocumentRef`.
- Consumes: Sui client, Seal client, Walrus client, package ID, and policy object ID.

- [x] **Step 1: Define the adapter and failing fail-closed tests**

```ts
export type EncryptedDocumentRef = {
  blobId: string;
  plaintextDigest: string;
  sealPolicyId: string;
};

export interface DocumentPrivacy {
  put(input: Uint8Array, policyId: string): Promise<EncryptedDocumentRef>;
  get(ref: EncryptedDocumentRef): Promise<Uint8Array>;
}
```

Tests must assert ciphertext differs from plaintext, a valid policy round-trip succeeds, a wrong policy fails, a corrupted blob fails digest verification, and no method returns plaintext after a network/decryption error.

- [x] **Step 2: Install verified official packages and run red tests**

Run: `pnpm --filter @coffer/document-privacy add @mysten/sui @mysten/seal @mysten/walrus && pnpm --filter @coffer/document-privacy test`

Expected: tests fail because the adapter is not implemented.

- [x] **Step 3: Implement the real adapter using the installed SDK's exported clients**

Keep all SDK-specific code in `seal-walrus.ts`. Encryption occurs before upload; `get` fetches ciphertext, requests Seal decryption under the configured onchain policy, then verifies the SHA-256 plaintext digest before returning bytes. Throw typed `PrivacyUnavailableError`, `AccessDeniedError`, or `IntegrityError`; never return partial data.

- [x] **Step 4: Run a real testnet integration script (beta SDKs)**

Run: `pnpm --filter @coffer/document-privacy test:integration`

Expected: upload returns a non-empty Walrus blob ID, authorized decrypt reproduces the original bytes, and an unauthorized identity is rejected. If official devnet infrastructure is unavailable, stop this task and keep payment execution disabled; do not substitute a fake production claim.

- [x] **Step 5: Commit**

```bash
git add packages/document-privacy
git commit -m "feat: protect invoices with Seal and Walrus"
```

## Task 8: Validate World authorization and bind it to an exact action

**Files:**
- Create: `packages/world-auth/package.json`
- Create: `packages/world-auth/src/canonical-action.ts`
- Create: `packages/world-auth/src/verifier.ts`
- Create: `packages/world-auth/src/verifier.test.ts`

**Interfaces:**
- Produces: `canonicalActionDigest(payload): Uint8Array`, `beginFreshAuthorization(input): Promise<AuthorizationRequest>`, and `verifyOidcCallback(input): Promise<VerifiedAuthorization>`.
- Consumes: World sandbox OIDC discovery metadata, client ID, redirect URI, authorization-code response, PKCE verifier, expected pairwise subject, and exact pending action.

- [x] **Step 1: Write failing binding and failure-path tests**

Tests cover deterministic canonical digest, changed amount producing a different digest, successful authorization-code validation, cancellation, expired ID token, invalid issuer/audience/signature, stale `auth_time`, mismatched OIDC nonce/state, mismatched pending action, and reused action nonce.

- [x] **Step 2: Confirm tests fail**

Run: `pnpm --filter @coffer/world-auth test`

Expected: FAIL because verifier functions are absent.

- [x] **Step 3: Implement canonical action binding and server-only validation**

```ts
export function canonicalActionDigest(payload: ActionAuthorizationPayload): Uint8Array {
  const canonical = JSON.stringify({
    amount: payload.amount,
    expiresAtMs: payload.expiresAtMs,
    nonce: payload.nonce,
    paymentRequestId: payload.paymentRequestId,
    treasuryId: payload.treasuryId,
    vendor: payload.vendor,
  });
  return new Uint8Array(createHash("sha256").update(canonical).digest());
}
```

`beginFreshAuthorization` creates PKCE, OIDC `state`, OIDC `nonce`, and a short `max_age`, then stores them with the exact action payload. `verifyOidcCallback` runs only in server code, exchanges the code, validates the ID token with discovery/JWKS, checks `iss`, `sub`, audience, expiration, nonce, state, and `auth_time`, recomputes the expected action digest, and atomically marks the action nonce used before authorizing ticket minting.

- [ ] **Step 4: Exercise official event development environment**

Run: `pnpm --filter @coffer/world-auth test:integration`

Expected: one official sandbox identity completes fresh OIDC authentication and one cancelled/stale/invalid journey returns a typed rejection without creating a ticket request. Log only the issuer and a redacted pairwise subject; never log tokens.

- [x] **Step 5: Commit**

```bash
git add packages/world-auth
git commit -m "feat: validate action-bound World authorizations"
```

## Task 9: Build typed Sui readers and transaction builders

**Files:**
- Create: `packages/sui-client/package.json`
- Create: `packages/sui-client/src/config.ts`
- Create: `packages/sui-client/src/readers.ts`
- Create: `packages/sui-client/src/transactions.ts`
- Create: `packages/sui-client/src/transactions.test.ts`
- Create: `scripts/publish-testnet.ts`
- Create: `scripts/seed-demo.ts`

**Interfaces:**
- Produces: `readTreasurySnapshot`, `buildCreateTreasury`, `buildSubmitRequest`, `buildExecuteWithinMandate`, `buildMintAuthorizationTicket`, `buildExecuteWithAuthorization`, and `buildExecuteStandingOrder`.
- Consumes: package/object IDs and the Move interfaces from Tasks 2–5.

- [x] **Step 1: Write transaction-shape tests with a fake client**

Assert each builder targets the exact published module/function, uses the Sui Clock where required, passes policy version and request ID, and never embeds a private key.

- [x] **Step 2: Run red tests**

Run: `pnpm --filter @coffer/sui-client test`

Expected: FAIL because builders are missing.

- [x] **Step 3: Implement builders using `Transaction` from `@mysten/sui/transactions`**

Each function returns an unsigned transaction. Browser callers sign with zkLogin or a connected wallet; the worker signs only with its configured agent key. Configuration validates network, package ID, object IDs, and RPC URL on startup.

- [x] **Step 4: Publish and seed testnet deterministically**

Run: `pnpm move:test && pnpm move:build && pnpm publish:testnet && pnpm seed:demo`

Expected: commands print package, treasury, cap, mandate, vendor, and standing-order object IDs and save only public IDs to `deployments/testnet.json`.

- [x] **Step 5: Commit**

```bash
git add packages/sui-client scripts deployments/testnet.json package.json
git commit -m "feat: add typed Sui transactions and testnet deployment"
```

## Task 10: Implement the idempotent treasury agent worker

**Files:**
- Create: `apps/agent-worker/package.json`
- Create: `apps/agent-worker/src/index.ts`
- Create: `apps/agent-worker/src/process-request.ts`
- Create: `apps/agent-worker/src/process-request.test.ts`
- Create: `apps/agent-worker/src/scheduler.ts`
- Create: `apps/agent-worker/src/scheduler.test.ts`
- Create: `apps/agent-worker/src/job-store.ts`
- Create: `apps/agent-worker/src/invoice-extractor.ts`

**Interfaces:**
- Produces: `processPaymentRequest(requestId)` and `runDueStandingOrders(nowMs)`.
- Consumes: privacy adapter, invoice extractor, policy engine, Sui client, and a persistent idempotency store.

- [x] **Step 1: Write failing orchestration tests**

Cover auto-execute, human-auth escalation, hold after decryption failure, hold after low-confidence extraction, rejection after inactive mandate, and duplicate delivery causing exactly one submitted transaction.

Install the worker's explicit runtime dependencies:

```bash
pnpm --filter @coffer/agent-worker add @libsql/client zod
```

- [x] **Step 2: Run red tests**

Run: `pnpm --filter @coffer/agent-worker test`

Expected: FAIL because the worker is absent.

- [x] **Step 3: Implement the orchestration boundary**

```ts
export async function processPaymentRequest(requestId: string, deps: WorkerDeps): Promise<PolicyResult> {
  return deps.jobs.once(`payment:${requestId}`, async () => {
    const request = await deps.sui.readPaymentRequest(requestId);
    const document = await deps.privacy.get(request.documentRef);
    const extraction = await deps.extractor.extract(document);
    const snapshot = await deps.sui.readTreasurySnapshot(request.treasuryId);
    const result = evaluatePayment(toPolicyInput(request, extraction, snapshot));
    await applyDecision(request, result, deps);
    return result;
  });
}
```

The job store uses `@libsql/client` with `file:./coffer-worker.db` by default and a unique `job_key` column so `once()` is atomic across restarts. The invoice extractor implements three explicit modes: `ollama` and `anthropic` for live use, and `fixture` only when `NODE_ENV=test`. No OpenAI API key is required by the repository.

- [x] **Step 4: Implement scheduler and forecast tests**

The scheduler reads due orders and submits unsigned/agent-signed transactions; it does not decide whether time is valid. The Move contract remains authoritative. The forecast job writes a structured shortfall result consumed by the web app.

Run: `pnpm --filter @coffer/agent-worker test`

Expected: all orchestration, replay, schedule, and forecast tests pass.

- [x] **Step 5: Commit**

```bash
git add apps/agent-worker
git commit -m "feat: add policy-aware treasury agent worker"
```

## Task 11: Build the functional web journey without final branding

**Files:**
- Create: `apps/web/` via Next.js scaffold
- Create: `apps/web/src/app/providers.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/treasury/page.tsx`
- Create: `apps/web/src/app/payments/[id]/page.tsx`
- Create: `apps/web/src/app/mandate/page.tsx`
- Create: `apps/web/src/app/orders/page.tsx`
- Create: `apps/web/src/app/audit/page.tsx`
- Create: `apps/web/src/app/api/world/verify/route.ts`
- Create: `apps/web/src/lib/auth/zklogin.ts`
- Create: `apps/web/src/lib/queries.ts`
- Create: `apps/web/src/components/decision-reason.tsx`
- Create: `apps/web/src/components/world-authorization.tsx`

**Interfaces:**
- Produces: functional onboarding, treasury actions, payment review, World escalation, standing-order controls, and audit inspection.
- Consumes: shared types, Sui transaction builders, World verifier, and public deployment configuration.

- [ ] **Step 1: Scaffold and write failing component/route tests**

Run:

```bash
pnpm create next-app@latest apps/web --ts --eslint --app --src-dir --use-pnpm --import-alias '@/*'
pnpm --filter web add @mysten/sui @mysten/dapp-kit @mysten/zklogin @tanstack/react-query zod
```

Tests assert that a blocked request displays its exact reason, World cancellation does not call the ticket builder, and an approved response calls a builder bound to the current request ID and amount.

- [ ] **Step 2: Confirm tests fail**

Run: `pnpm --filter web test`

Expected: FAIL because functional pages/components are absent.

- [ ] **Step 3: Implement provider and login choices**

Expose `Continue with Google` and `Connect Sui Wallet`. Keep zkLogin ephemeral key material in session-scoped storage, never commit a salt, and show a plain-language failure state. Use business terms from the design spec; hide raw object IDs behind an optional technical-details disclosure.

- [ ] **Step 4: Implement the minimum operational screens**

Treasury overview must show three buckets, remaining mandate limit, next obligation, shortfall, pending approvals, and recent actions. Payment detail must show extracted fields, access-controlled document action, decision codes, automatic execution state, and World escalation. Mandate and order pages must create/revoke/pause real onchain objects.

- [ ] **Step 5: Verify functional quality and commit**

Run: `pnpm --filter web test && pnpm --filter web typecheck && pnpm --filter web build`

Expected: tests, strict typecheck, and production build pass. Visual branding is deliberately not judged at this checkpoint.

```bash
git add apps/web
git commit -m "feat: add functional Coffer operator journey"
```

## Task 12: Add the full demo acceptance path and sponsor-ready documentation

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/coffer-demo.spec.ts`
- Create: `docs/demo-script.md`
- Create: `docs/privacy-claims.md`
- Create: `docs/sponsor-mapping.md`
- Modify: `README.md`
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: one-command verification and exact code pointers for judges.
- Consumes: every preceding task.

- [ ] **Step 1: Write the failing end-to-end demo test**

```ts
test("automatic payment, blocked payment, and human exception", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Load demo organization" }).click();
  await page.getByRole("link", { name: "80 DemoUSD invoice" }).click();
  await expect(page.getByText("Paid within mandate")).toBeVisible();
  await page.getByRole("link", { name: "240 DemoUSD invoice" }).click();
  await expect(page.getByText("Payment blocked")).toBeVisible();
  await expect(page.getByText("Vendor is not approved")).toBeVisible();
  await page.getByRole("button", { name: "Request human authorization" }).click();
  await expect(page.getByText("Authorization required")).toBeVisible();
});
```

- [ ] **Step 2: Run the test and verify failure before demo fixtures exist**

Run: `pnpm exec playwright test e2e/coffer-demo.spec.ts`

Expected: FAIL at `Load demo organization`.

- [ ] **Step 3: Add deterministic demo seeding and complete the journey**

Seed one treasury, three funded buckets, an approved Tokyo Cloud vendor, an 80-unit encrypted invoice, a 240-unit unknown-vendor request, one mandate, and one upcoming standing order. Seed scripts must be repeatable and print explorer links.

- [ ] **Step 4: Write judge-facing documentation**

README must include setup, environment variables, Move package path, test commands, deployment IDs, demo flow, architecture, privacy boundaries, and direct links to Sui, agent, World, Seal, and Walrus integration files. Include 3–5 lines of integration feedback for each sponsor where requested.

- [ ] **Step 5: Run the complete verification matrix**

Run:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm move:build
pnpm move:test
pnpm --filter web build
pnpm exec playwright test
git diff --check
```

Expected: every command exits 0; the E2E report shows the successful and blocked journeys.

- [ ] **Step 6: Commit**

```bash
git add README.md docs e2e playwright.config.ts .github scripts
git commit -m "docs: finalize Coffer demo and sponsor evidence"
```

## Execution checkpoints

1. **After Task 1:** workspace and types can be reviewed independently.
2. **After Task 5:** all financial enforcement exists and passes Move tests before external integrations begin.
3. **After Task 8:** Seal/Walrus and World risks are known; if either official environment is unavailable, the corresponding track risk is escalated before UI work.
4. **After Task 10:** the agent can demonstrate meaningful action without relying on the frontend.
5. **After Task 12:** run the live three-minute script twice from a clean seeded state.

## External development services

- No hosted RPC is mandatory. Start with the official Sui testnet endpoint.
- A free Alchemy or QuickNode endpoint may replace the RPC URL only after its current Sui support, limits, and event reliability are confirmed; no application code should depend on provider-specific APIs.
- MCP servers may accelerate repository inspection or documentation lookup, but they are development tools and must not appear as product integrations or prize claims.
- The authenticated Sui documentation MCP is `https://sui.mcp.kapa.ai`; the authenticated World sandbox MCP is `https://sandbox.auth.world.org/mcp`. They assist development but are not runtime product dependencies.
- No OpenAI API key is required. The invoice-extractor interface can use a configured provider selected during implementation; tests and the demo fallback use deterministic fixtures without pretending those fixtures are a live AI integration.

For the first implementation, the worker uses `@libsql/client` with `file:./coffer-worker.db` for durable local job and nonce state. The same interface accepts a hosted libSQL URL later without changing orchestration code.

The live invoice extractor supports two explicit modes:

- `ollama`: calls a local OpenAI-compatible Ollama endpoint and requires no cloud API key.
- `anthropic`: calls Claude only when `ANTHROPIC_API_KEY` is supplied through the local environment, never through chat or committed files.

`INVOICE_EXTRACTOR_MODE=fixture` is permitted only in unit and E2E tests. The live prize demo must show either the Ollama or Anthropic path and record the model/provider in the agent activity log.
