# Coffer — continuation guide

This repository is an active ETHGlobal Tokyo 2026 hackathon project. Continue from the current implementation; do not restart or replace it with a generic scaffold.

## Product and prize strategy

Coffer is a policy-enforced autonomous treasury on Sui: agents can manage and pay from delegated capital, but Move-enforced mandates, bucket limits, approved counterparties, and fresh human authorization constrain execution. Seal protects commercial document context, Walrus stores ciphertext, and World authorizes material actions. Sui payment amounts and recipient addresses remain public.

Target tracks:

1. Sui — DeFi & Payments
2. Curvegrid — Best AI Agent Project (MultiBaas is optional and is not used)
3. World — Best Use of World ID for Agents

Do not add a sponsor merely to qualify. Do not describe access control as privacy, World sandbox identities as production identity, or Seal/Walrus as transaction-amount confidentiality.

## Repository state

- Primary visible checkout: `/Users/toyguntez/Visual Studio /ETHGlobal-Tokyo`
- Implementation branch: `codex/coffer-mvp`
- Remote: `origin/codex/coffer-mvp`
- Detailed frontend plan: `docs/superpowers/plans/2026-09-26-coffer-frontend.md`
- Frontend design spec: `docs/superpowers/specs/2026-09-26-coffer-frontend-design.md`
- Branding source: untracked user-owned `branding-spec.md` and `assets/` in the primary checkout. Preserve them.

Use small, meaningful commits and push them frequently. Never commit `.env`, private keys, World client secrets, or signer material.

## Implemented and verified

- Published Move treasury/payment system on Sui testnet.
- Real autonomous 80 DEMO_USD execution and real World-authorized 300 DEMO_USD execution.
- Seal + Walrus encrypted commercial-document workflow.
- Render World gateway with server-side OIDC validation and protected Sui execution.
- Safe fixed-origin World callback statuses: `authorized`, `cancelled`, `expired`, `replayed`, `rejected`, `failed`.
- Next.js landing page and full institutional workspace with all navigation routes.
- Four agent outcomes: auto execute, human authorization, hold, reject.
- Official gRPC Sui dApp Kit, standard wallet entry, optional Google/Enoki zkLogin.
- Live `/api/treasury` provenance with explicit verified fallback when RPC is unavailable.
- Fresh World approval UI and a separate pending onchain World action.

Latest frontend verification before handoff:

- 15 Vitest files, 57 tests passed.
- 9 Playwright journeys passed: landing anchors, mobile menu focus, all four payment outcomes, wallet gate, World callback states, external SuiScan links, and no page-level horizontal overflow at 390×844, 768×1024, 1440×900, and 1920×1080.
- ESLint passed.
- TypeScript passed.
- Next.js production build passed; 15 routes generated.
- Latest completed sprint: `60c4c84 test(web): harden responsive demo journeys` (pushed to `origin/codex/coffer-mvp`).

## Public testnet evidence

- Package: `0xe44696c1051148c0743b4f2a982353068ce72160c849af540b6e02e327d536a5`
- Treasury: `0xcc5e3867d9e7a1a24d9ad617dc97e2c18e872fa58339c192b080c3ac9eed9e18`
- Autonomous execution: `4TqsMDLyMhpRb1pnodoSQyrYaoeCu4u6CzQqLJ83txZH`
- Historical World execution: `8wPGFjnUvsh8QTwRMPwibpK9LDQUz6XTgupyPy5QyFx`
- Fresh pending World request: `0x2784156af643400c8181dcb2ad0db23c4c03cabb62eea2c4a09378b158ec2bc9`
- Pending World action digest: `ab7ce5143376b750b67fe18a9b9996dc51c4c8975a3a459ea5427a667ec05b02`
- Pending action expiry: 2026-10-04 01:32 JST. If it expires or is consumed, create a new `pendingWorldDemo` with:

```bash
COFFER_DEMO_KEY=pendingWorldDemo COFFER_DEMO_AMOUNT_BASE_UNITS=420000000 pnpm exec tsx scripts/prepare-world-payment.ts
```

## Immediate continuation point

Local browser hardening and the Vercel deployment contract are complete. The remaining work is external-account verification:

1. Deploy the updated World gateway to Render.
2. Deploy `apps/web` to Vercel with root `apps/web`; `apps/web/vercel.json` contains the monorepo install/build contract.
3. Set Vercel public variables from `apps/web/.env.example`.
4. Set Render `WORLD_APP_RETURN_URI` to the exact Vercel origin and redeploy Render.
5. Keep World portal callback unchanged: `https://coffer-tokyo-world-gateway.onrender.com/api/world/callback`.
6. Add the Vercel origin to Enoki and Google allowed origins, then manually verify Google zkLogin.
7. Run one fresh sandbox World authorization and verify return to `/app/approvals` with a SuiScan receipt.

The Render gateway is `https://coffer-tokyo-world-gateway.onrender.com`.

## Remaining engineering

- Finish the external Render/Vercel/Enoki/Google verification for Task 13 and Task 14.
- Submission documentation is intentionally last: README sponsor mapping, FEEDBACK/integration notes, setup steps, three-minute demo script, and truthful limitations.
- If time remains, refine institutional secondary screens; do not jeopardize the core demo.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm --filter @coffer/web test
pnpm --filter @coffer/web typecheck
pnpm --filter @coffer/web lint
pnpm --filter @coffer/web build
pnpm --filter @coffer/world-auth test
pnpm typecheck
```

For local frontend development:

```bash
pnpm --filter @coffer/web dev
```

Never use mocked risk/privacy claims or imply that a UI state moved funds. Success must be backed by the server callback and a valid Sui transaction digest.
