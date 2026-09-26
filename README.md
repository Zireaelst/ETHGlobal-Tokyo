# Coffer

**Coffer is a private, policy-enforced treasury wallet where an AI agent can pay routine invoices autonomously, while Sui mandates cap its authority and World requires a fresh human authorization for exceptional payments.**

Coffer is built for finance teams, DAOs, startups, and crypto-native operators who want automation without giving an agent unlimited custody. Invoice content is encrypted with Seal and stored as ciphertext on Walrus. The agent decrypts it only through an onchain Sui access policy, extracts the invoice fields, evaluates the live treasury mandate, and either executes, holds, rejects, or escalates the exact action to a human.

## ETHGlobal Tokyo 2026 tracks

- **Sui — DeFi & Payments:** programmable buckets, capability-based mandates, standing orders, atomic payments, revocation, policy versions, and receipts are implemented in Move.
- **Curvegrid — Best AI Agent Project:** the agent reads an encrypted commercial document, turns it into a structured financial action, evaluates live onchain constraints, and changes execution—not merely a chatbot or risk dashboard.
- **World — Best Use of World ID for Agents:** a fresh World sandbox OIDC authorization is requested only when the action exceeds delegated authority. The server validates PKCE, state, nonce, issuer, audience, signature, freshness, replay protection, and an exact action digest before payment.

MultiBaas is intentionally not used: its documented focus is EVM, while Coffer's enforcement and settlement are native Sui. Intercepta is intentionally excluded because documented native Sui transaction/address screening was not available; describing an EVM address check as Sui payment screening would be misleading.

See [the exact sponsor mapping](docs/sponsor-mapping.md) and [privacy claims](docs/privacy-claims.md).

## How the product works

1. A vendor submits an invoice. The plaintext never goes to Walrus: Seal encrypts it first, Walrus stores the ciphertext, and Sui stores only the blob ID, digest, policy ID, and payment request.
2. The agent proves its active Sui mandate to Seal, decrypts the invoice, and extracts structured fields through Ollama or Anthropic.
3. The deterministic policy engine compares the extraction with live Sui state: treasury pause/version, vendor policy, bucket balance, mandate validity, per-payment cap, period spend, and human-approval threshold.
4. A routine payment executes atomically on Sui. A low-confidence or underfunded request is held. An invalid or expired request is rejected.
5. An exceptional payment produces a World authorization URL for the exact treasury, request, vendor, amount, expiry, and nonce. Successful server-side verification mints and consumes a single-use authorization ticket in the same Sui transaction.

The LLM interprets the document; it does not get to override financial policy. Money moves only through Move entry functions.

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
- Earlier verified World sandbox callback and atomic payment: [SuiScan transaction](https://suiscan.xyz/testnet/tx/DxLrK3u1a3fXZRcLyVqRkrjsNp5pKxVyHy4EemQ9Nm9n)
- A 300 DEMO_USD request on the current package is prepared and has been verified to produce `HUMAN_APPROVAL_THRESHOLD_EXCEEDED`; its final World callback will run after stable-host credentials are installed.
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

## Demo

Follow the [three-minute judge script](docs/demo-script.md). It is deliberately structured around one autonomous success, one visible policy stop, and one freshly human-authorized exception.

## Integration feedback

World's sandbox made the fresh-authorization moment easy to understand, and standard OIDC let us validate it server-side rather than trusting the browser. Exact redirect URI matching is a strong security default, but immutable sector-hostname behavior is easy to encounter while moving from a temporary tunnel to stable hosting. A first-class “protected action payload/digest” field in the agent portal would reduce custom binding code. Event identities are mocked and Coffer treats them only as sandbox proofs, never as production identity or KYC evidence.

## Status and scope

This is hackathon software on Sui testnet. The Move package is unaudited, the World environment uses mocked event identities, and the demo token has no real value. Sui Confidential Transfers is **not** used; Coffer does not claim hidden transfer amounts or recipient addresses.
