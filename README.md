# Coffer

**Coffer is a policy-enforced autonomous treasury where an agent can pay routine invoices, while Sui mandates cap its authority and World requires fresh human authorization for protected exceptions.**

Coffer is built for finance teams, DAOs, startups, and crypto-native operators who want automation without giving an agent unlimited custody. Invoice content is encrypted with Seal and stored as ciphertext on Walrus. The agent decrypts it only through an onchain Sui access policy, extracts the invoice fields, evaluates the live treasury mandate, and either executes, holds, rejects, or escalates the exact action to a human.

- **Live app:** [eth-global-tokyo-web.vercel.app](https://eth-global-tokyo-web.vercel.app/)
- **Network:** Sui testnet
- **Demo modes:** reliable Guided Replay and optional fresh Live Testnet execution
- **Submission copy:** [`docs/submission-copy.md`](docs/submission-copy.md)

## ETHGlobal Tokyo 2026 tracks

- **Sui — DeFi & Payments:** programmable buckets, capability-based mandates, standing orders, atomic payments, revocation, policy versions, and receipts are implemented in Move.
- **World — Best Use of World ID for Agents:** a fresh World sandbox OIDC authorization is requested only when the action exceeds delegated authority. The server validates PKCE, state, nonce, issuer, audience, signature, freshness, replay protection, and an exact action digest before payment.

We are not applying for Curvegrid: MultiBaas is not used and we will not claim a sponsor integration that does not exist. Intercepta is also excluded because documented native Sui transaction/address screening was unavailable; describing an EVM address check as Sui payment screening would be misleading.

See [the exact sponsor mapping](docs/sponsor-mapping.md) and [privacy claims](docs/privacy-claims.md).

## How the product works

1. A vendor submits an invoice. The plaintext never goes to Walrus: Seal encrypts it first, Walrus stores the ciphertext, and Sui stores only the blob ID, digest, policy ID, and payment request.
2. The agent proves its active Sui mandate to Seal, decrypts the invoice, and extracts structured fields through Ollama or Anthropic.
3. The deterministic policy engine compares the extraction with live Sui state: treasury pause/version, vendor policy, bucket balance, mandate validity, per-payment cap, period spend, and human-approval threshold.
4. A routine payment executes atomically on Sui. A low-confidence or underfunded request is held. An invalid or expired request is rejected.
5. An exceptional payment produces a World authorization URL for the exact treasury, request, vendor, amount, expiry, and nonce. Successful server-side verification mints and consumes a single-use authorization ticket in the same Sui transaction.

The LLM interprets the document; it does not get to override financial policy. Money moves only through Move entry functions.

```text
Encrypted invoice reference
        ↓
Seal-authorized document access ← Walrus ciphertext
        ↓
Structured invoice extraction
        ↓
Deterministic policy engine ← live Sui treasury + mandate + vendor state
        ↓
AUTO EXECUTE | WORLD AUTH | HOLD | REJECT
        ↓
Move enforcement + auditable receipt
```

## What makes the agent real

The agent is not a chat interface. It receives a payment request, retrieves protected commercial context, extracts structured invoice facts, reads current treasury state, and selects an execution consequence. `AUTO_EXECUTE` submits a Sui transaction; `HUMAN_AUTH_REQUIRED` creates a fresh protected authorization; `HOLD` and `REJECT` stop signing and preserve the balance. The worker is idempotent, fails closed when document access or extraction fails, and records the decision inputs and resulting transaction evidence.

The application exposes the same lifecycle in two modes:

- **Guided Replay** demonstrates all four outcomes with clearly labelled historical testnet evidence.
- **Live Testnet** creates a fresh approved request, evaluates current onchain policy, and produces new submission and payment transactions. It is deliberately restricted to the approved autonomous path.

## Backend map

- [`move/coffer/sources/mandate.move`](move/coffer/sources/mandate.move) — delegated limits, validity, revocation, period accounting, and enforced human threshold.
- [`move/coffer/sources/payment_request.move`](move/coffer/sources/payment_request.move) — vendor requests, autonomous execution, and World-authorized exception execution.
- [`move/coffer/sources/document_policy.move`](move/coffer/sources/document_policy.move) — Seal key-server approval based on the active agent capability.
- [`apps/agent-worker/src/process-request.ts`](apps/agent-worker/src/process-request.ts) — fail-closed orchestration and decision application.
- [`apps/agent-worker/src/live-sui-adapter.ts`](apps/agent-worker/src/live-sui-adapter.ts) — live Sui snapshots, transaction execution, exact World escalation, and audit events.
- [`packages/document-privacy/src/seal-walrus.ts`](packages/document-privacy/src/seal-walrus.ts) — encrypt-before-upload, authorized decrypt, and plaintext integrity verification.
- [`packages/world-auth/src/verifier.ts`](packages/world-auth/src/verifier.ts) — fresh action-bound OIDC verification.
- [`scripts/run-world-gateway.ts`](scripts/run-world-gateway.ts) — deployable World callback and atomic Sui executor.

## Verified testnet evidence

- Network: Sui testnet
- Deployment registry: [`deployments/testnet.json`](deployments/testnet.json)
- Current hardened package: [SuiScan package](https://suiscan.xyz/testnet/object/0xe44696c1051148c0743b4f2a982353068ce72160c849af540b6e02e327d536a5)
- Live Seal → Walrus → local AI → policy → autonomous payment: [SuiScan transaction](https://suiscan.xyz/testnet/tx/4TqsMDLyMhpRb1pnodoSQyrYaoeCu4u6CzQqLJ83txZH)
- Live 300 DEMO_USD policy stop → fresh World authorization → atomic exception payment: [SuiScan transaction](https://suiscan.xyz/testnet/tx/8wPGFjnUvsh8QTwRMPwibpK9LDQUz6XTgupyPy5QyFx)
- The World callback is action-bound and single-use: replaying the consumed callback returned `400 invalid_callback` without executing another payment.
- The repository also includes a live Seal/Walrus integration test; it is opt-in because it writes a paid testnet blob.

## Local backend setup

Requirements: Node 22, pnpm 10.12.1, the Sui CLI, a funded Sui testnet key, and either local Ollama or an Anthropic key. Copy `.env.example` to `.env`; never expose the Sui key or World client secret in browser code.

For a free local extractor on macOS:

```bash
brew install ollama
ollama serve
ollama pull qwen2.5:0.5b
```

Set `OLLAMA_MODEL=qwen2.5:0.5b`. The live structured-output path has been exercised with this model.

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm move:test
pnpm world:gateway
```

To process one live request:

```bash
pnpm agent:once 0xPAYMENT_REQUEST_OBJECT_ID
```

`fixture` extraction is rejected outside tests. Live runs require `INVOICE_EXTRACTOR_MODE=ollama` or `anthropic`. Decisions are idempotent through libSQL and appended to an ignored local JSONL audit file.

## Deployment

The included [`render.yaml`](render.yaml) creates a free Render web service with a stable HTTPS callback and `/health` check. Follow [the Render and World deployment guide](docs/deployment-render.md). Free Render services sleep after inactivity, so warm `/health` shortly before the demo.

The web application deploys from `apps/web` on Vercel. Browser-safe Enoki values use `NEXT_PUBLIC_` prefixes. The optional live agent runner uses the server-only variables below and must never receive public prefixes:

```text
COFFER_LIVE_DEMO_ENABLED=true
COFFER_TESTNET_PRIVATE_KEY=<server-only suiprivkey>
```

Each Live Testnet run moves 80 DEMO_USD from the configured vendor-committed bucket, so use it intentionally.

## Demo

Follow the [time-coded demo video script](docs/demo-script.md). It uses three short opening slides, one fresh autonomous success, one visible policy stop, and the World-protected exception path.

## Integration feedback

World's sandbox made the fresh-authorization moment easy to understand, and standard OIDC let us validate it server-side rather than trusting the browser. Exact redirect URI matching is a strong security default, but immutable sector-hostname behavior is easy to encounter while moving from a temporary tunnel to stable hosting. A first-class “protected action payload/digest” field in the agent portal would reduce custom binding code. Event identities are mocked and Coffer treats them only as sandbox proofs, never as production identity or KYC evidence.

## Status and scope

This is hackathon software on Sui testnet. The Move package is unaudited, the World environment uses mocked event identities, and the demo token has no real value. Sui Confidential Transfers is **not** used; Coffer does not claim hidden transfer amounts or recipient addresses.
