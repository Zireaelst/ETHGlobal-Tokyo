# Coffer Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a polished Coffer landing page and institutional treasury workspace that demonstrates the existing Sui, Seal/Walrus, agent-policy, and World-authorized payment flows without overstating privacy or identity claims.

**Architecture:** Add one Next.js App Router application at `apps/web` with an editorial public surface at `/` and an operational workspace under `/app/*`. The frontend consumes immutable deployment evidence and live Sui reads through focused adapters, uses the official current Sui dApp Kit plus Enoki for Google zkLogin and standard wallets, and delegates World secrets and protected execution to the existing Render gateway. Browser-facing actions are explicitly separated into demo replay, fresh authorization, and connected-wallet contexts.

**Tech Stack:** Next.js 16.3.6, React 19.3.0, TypeScript 5.7, CSS Modules/global CSS, `@mysten/sui` 2.33.1, `@mysten/dapp-kit-react` 2.1.35, `@mysten/enoki` 1.2.28, Geist 1.7.2, Vitest 3.2.7, Testing Library, Playwright 1.63, Sharp 0.35.

## Global Constraints

- Work only in `/Users/toyguntez/Visual Studio /ETHGlobal-Tokyo/.worktrees/coffer-mvp` on `codex/coffer-mvp`.
- Keep `/` and `/app/*` in one Next.js application, deployed to Vercel.
- Browsing the demo workspace requires no wallet; money-moving or authority-changing actions require Google zkLogin or a Sui wallet.
- Use the current `@mysten/dapp-kit-react` package and gRPC client. Do not install deprecated `@mysten/dapp-kit` or use JSON-RPC.
- Enoki's TypeScript SDK is in active development. Pin `@mysten/enoki` to `1.2.28`, gate Google login behind validated public configuration, and preserve standard wallet login if Enoki is unavailable.
- Keep `WORLD_OIDC_CLIENT_SECRET`, the demo signer, Enoki private keys, and all other secrets out of `NEXT_PUBLIC_*` variables and browser bundles.
- World is fresh action-bound authorization, not login, KYC, legal identity, or general session authentication. Event proofs use mocked identities.
- Seal protects commercial document content; Walrus stores ciphertext. Recipient addresses and transfer amounts remain public on Sui.
- Mark every record as exactly one of `Live testnet`, `Verified testnet run`, or `Demo workspace data`.
- Never present an old transaction replay as a fresh execution, and never show success before a confirmed transaction digest exists.
- Sponsor marks remain labeled geometric placeholders until official Sui, World, Seal, and Walrus SVGs are supplied; do not imitate official marks.
- Use Instrument Serif for editorial headings, Inter for UI and financial data, and Geist Pixel Circle only for identifiers, section numbers, and metric symbols.
- Honor `prefers-reduced-motion`, keyboard navigation, visible focus, semantic landmarks, and WCAG AA contrast.
- Secondary institutional modules are populated and read-only. Their mutation flows remain in the approved backlog.
- Use tests first for every behavior change, verify the expected red failure, implement the minimum change, verify green, then commit.
- Make one small reviewable commit per task. Submission documentation is not part of this plan and remains the final project phase.

---

## File Map

```text
apps/web/
├── app/
│   ├── api/treasury/route.ts                 # server-side live snapshot endpoint
│   ├── app/
│   │   ├── layout.tsx                        # workspace shell
│   │   ├── overview/page.tsx
│   │   ├── requests/page.tsx
│   │   ├── approvals/page.tsx
│   │   ├── mandates/page.tsx
│   │   ├── standing-orders/page.tsx
│   │   ├── audit/page.tsx
│   │   ├── vendors/page.tsx
│   │   ├── documents/page.tsx
│   │   ├── policies/page.tsx
│   │   ├── users/page.tsx
│   │   └── settings/page.tsx
│   ├── globals.css                           # tokens, reset, shared motion
│   ├── layout.tsx                            # fonts, metadata, providers
│   └── page.tsx                              # editorial landing page
├── components/
│   ├── app-shell/                            # navigation, top bar, responsive shell
│   ├── connection/                           # action gate and wallet/Enoki controls
│   ├── landing/                              # landing sections
│   ├── requests/                             # request table and detail drawer
│   └── ui/                                   # badges, source labels, states
├── lib/
│   ├── demo/fixtures.ts                      # representative read-only data
│   ├── deployment.ts                         # typed deployment evidence
│   ├── env.ts                                # public env validation
│   ├── requests/model.ts                     # request/outcome model
│   ├── sui/dapp-kit.ts                       # browser Sui/Enoki registration
│   ├── sui/live-treasury.ts                  # transport-agnostic chain reader
│   └── world/client.ts                       # Render gateway client
├── public/assets/                            # normalized WebP brand and artwork
├── tests/                                    # unit/component tests
├── e2e/                                      # Playwright journeys
├── next.config.ts
├── package.json
├── playwright.config.ts
├── tsconfig.json
└── vitest.config.ts
```

The existing backend files remain responsible for protected execution:

- `packages/world-auth/src/gateway.ts`: HTTP response/redirect policy after verified authorization.
- `packages/world-auth/src/gateway.test.ts`: callback safety and redirect behavior.
- `scripts/run-world-gateway.ts`: production environment wiring.
- `.env.example` and `docs/deployment-render.md`: non-secret configuration contract.

---

### Task 1: Scaffold the tested Next.js application

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/tests/smoke.test.tsx`
- Modify: `package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: an `@coffer/web` workspace with `dev`, `build`, `lint`, `typecheck`, and `test` scripts.
- Produces: root scripts `web:dev`, `web:build`, and `web:test`.

- [x] **Step 1: Create the package and failing smoke test**

Pin runtime dependencies exactly and testing dependencies with compatible major versions:

```json
{
  "name": "@coffer/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "lint": "eslint . --max-warnings=0",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@mysten/dapp-kit-react": "2.1.35",
    "@mysten/enoki": "1.2.28",
    "@mysten/sui": "2.33.1",
    "geist": "1.7.2",
    "next": "16.3.6",
    "react": "19.3.0",
    "react-dom": "19.3.0"
  }
}
```

Create `tests/smoke.test.tsx` asserting `HomePage` renders `Autonomous Treasury. Within Your Rules.` and a link to `/app/overview`. Export `HomePage` as the default from `app/page.tsx` only after observing the failure.

- [x] **Step 2: Verify the test is red**

Run: `pnpm install && pnpm --filter @coffer/web test -- tests/smoke.test.tsx`

Expected: FAIL because `../app/page` does not exist.

- [x] **Step 3: Add the minimum App Router shell**

Use `next/font/google` for `Inter` and `Instrument_Serif`, `geist/font/pixel` for `GeistPixelCircle`, and expose them as `--font-sans`, `--font-serif`, and `--font-pixel` variables on `<body>`. The initial page contains one `<main>`, the approved headline, and a real `/app/overview` link. Add ESLint flat config with `eslint-config-next` because Next 16 no longer performs lint during `next build`.

- [x] **Step 4: Wire root scripts and CI**

Add these root scripts:

```json
{
  "web:dev": "pnpm --filter @coffer/web dev",
  "web:build": "pnpm --filter @coffer/web build",
  "web:test": "pnpm --filter @coffer/web test"
}
```

Add `pnpm web:build` after the existing test step in `.github/workflows/ci.yml`.

- [x] **Step 5: Verify and commit**

Run: `pnpm --filter @coffer/web test && pnpm --filter @coffer/web typecheck && pnpm --filter @coffer/web lint && pnpm web:build`

Expected: all commands exit 0 and Next reports successful static generation for `/`.

Commit: `chore(web): scaffold tested Next.js app`

---

### Task 2: Normalize and verify the supplied visual assets

**Files:**
- Create: `apps/web/scripts/prepare-assets.mjs`
- Create: `apps/web/tests/assets.test.ts`
- Create: `apps/web/public/assets/brand/logo-lockup-dark.webp`
- Create: `apps/web/public/assets/brand/app-icon-dark.webp`
- Create: `apps/web/public/assets/hero/hero-fuji.webp`
- Create: `apps/web/public/assets/sections/mandate.webp`
- Create: `apps/web/public/assets/sections/privacy.webp`
- Create: `apps/web/public/assets/sections/authorization.webp`
- Create: `apps/web/public/assets/sections/audit.webp`
- Create: `apps/web/public/assets/textures/flow.webp`
- Create: `apps/web/public/assets/textures/closing-landscape.webp`
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Consumes: supplied PNG files under `/Users/toyguntez/Visual Studio /ETHGlobal-Tokyo/assets`.
- Produces: stable public URLs matching the approved asset map and a repeatable `assets:prepare` script.

- [x] **Step 1: Write the asset contract test**

In `assets.test.ts`, iterate over the nine required relative paths, assert each file exists, starts with the RIFF/WebP signature, has width at least 900px for editorial art or 256px for brand art, and is smaller than its source PNG.

- [x] **Step 2: Verify the test is red**

Run: `pnpm --filter @coffer/web test -- tests/assets.test.ts`

Expected: FAIL on the first missing WebP output.

- [x] **Step 3: Add the deterministic Sharp conversion script**

Use a literal source-to-destination array; do not glob or infer names. Resize hero and closing art to maximum width 2400, sections to 1800, brand art to 1200, preserve aspect ratios, and encode WebP at quality 86 with smart subsampling. Fail with the exact missing source path if any input is unavailable.

Add `sharp@0.35.4` and the script:

```json
{
  "assets:prepare": "node scripts/prepare-assets.mjs"
}
```

- [x] **Step 4: Generate, inspect, and verify**

Run: `pnpm --filter @coffer/web assets:prepare && pnpm --filter @coffer/web test -- tests/assets.test.ts`

Expected: PASS for all nine files. Open the generated hero, mandate, privacy, authorization, audit, and closing images and confirm no crop, alpha, or color corruption before removing no source file.

- [x] **Step 5: Commit**

Commit: `assets(web): normalize Coffer artwork`

---

### Task 3: Establish the Coffer design system and landing header

**Files:**
- Create: `apps/web/components/landing/landing-header.tsx`
- Create: `apps/web/components/landing/landing-header.module.css`
- Create: `apps/web/components/landing/mobile-menu.tsx`
- Create: `apps/web/tests/landing-header.test.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Produces: `<LandingHeader />` with anchors `#product`, `#how-it-works`, `#security`, and `/app/overview`.
- Produces: a keyboard-safe `<MobileMenu />` controlled by `open`, `onOpenChange`, and viewport changes.

- [x] **Step 1: Write failing interaction tests**

Test that desktop links use the approved destinations; the menu button exposes `aria-expanded`; Escape, overlay click, and link activation close the menu; and `Launch App` points to `/app/overview`.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/landing-header.test.tsx`

Expected: FAIL because `LandingHeader` is missing.

- [x] **Step 3: Implement the header and shared tokens**

Define the approved forest/cream variables verbatim in `globals.css`, add a restrained focus ring, use a real `<header>` and `<nav>`, render the supplied Coffer mark through `next/image`, and implement the mobile sheet at `720px`. Lock body scrolling only while the mobile sheet is open.

- [x] **Step 4: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/landing-header.test.tsx && pnpm --filter @coffer/web typecheck`

Expected: PASS.

Commit: `feat(web): add Coffer navigation system`

---

### Task 4: Build the cinematic first viewport

**Files:**
- Create: `apps/web/components/landing/hero.tsx`
- Create: `apps/web/components/landing/hero.module.css`
- Create: `apps/web/components/landing/integration-mark.tsx`
- Create: `apps/web/tests/hero.test.tsx`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Produces: `<Hero />` with truthful copy, two calls to action, four product facts, and four clearly labeled temporary integration marks.

- [x] **Step 1: Write the semantic hero test**

Assert one level-one heading with the exact copy `Autonomous Treasury. Within Your Rules.`, description `AI operates within enforceable spending mandates. Humans control the exceptions.`, `/app/overview` primary action, `#how-it-works` secondary action, and facts `3 Treasury Buckets`, `4 Agent Outcomes`, `1× Action-bound Authorization`, `2 Access Paths`.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/hero.test.tsx`

Expected: FAIL because `Hero` is missing.

- [x] **Step 3: Implement the full-bleed composition**

Use `hero-fuji.webp` as a cover image beneath a left-to-right forest overlay. Keep the content readable at short desktop heights, convert metrics to 2×2 below 720px, and let normal document flow continue on narrow/short screens instead of clipping. Integration placeholders must be circles containing the text `Sui`, `World`, `Seal`, and `Walrus`, each with an accessible name and no counterfeit logo glyph.

- [x] **Step 4: Add motion rules**

Use opacity/translate entrance only, with maximum duration 700ms. Under `prefers-reduced-motion: reduce`, set all animation durations to `0.01ms`, disable smooth scrolling, and show final states immediately.

- [x] **Step 5: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/hero.test.tsx && pnpm --filter @coffer/web lint`

Expected: PASS with no accessibility-role ambiguity.

Commit: `feat(web): build Coffer landing hero`

---

### Task 5: Complete the editorial landing story

**Files:**
- Create: `apps/web/components/landing/editorial-story.tsx`
- Create: `apps/web/components/landing/editorial-story.module.css`
- Create: `apps/web/components/landing/receipt-evidence.tsx`
- Create: `apps/web/components/ui/external-link.tsx`
- Create: `apps/web/tests/editorial-story.test.tsx`
- Create: `apps/web/lib/deployment.ts`
- Modify: `apps/web/app/page.tsx`

**Interfaces:**
- Produces: `TESTNET_DEPLOYMENT` typed from `deployments/testnet.json` at build time.
- Produces: `suiScanTransactionUrl(digest: string): string` and `suiScanObjectUrl(id: string): string`.
- Produces: `<EditorialStory />` with mandate, privacy, authorization, audit, protocol rail, and closing chapters.

- [x] **Step 1: Write failing copy and evidence tests**

Assert that each approved chapter heading is present, the privacy chapter contains `Amounts and recipient addresses remain public on Sui`, the World chapter contains `Event authorization uses mocked identities`, and the receipt chapter links the existing auto and World execution digests to `https://suiscan.xyz/testnet/tx/<digest>`.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/editorial-story.test.tsx`

Expected: FAIL because deployment helpers and story components are missing.

- [x] **Step 3: Add typed immutable deployment evidence**

Import `../../../deployments/testnet.json`, validate required string fields at module initialization, freeze the normalized value, and expose only public identifiers. Do not copy signer material or `.env` values into the web package.

- [x] **Step 4: Implement varied editorial chapters**

Use the exact approved source mapping. Alternate split, wide-band, vertical process rail, and receipt-overlay compositions. Every `next/image` instance must include meaningful alt text unless purely decorative, in which case use empty alt text and `aria-hidden` on its wrapper.

- [x] **Step 5: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/editorial-story.test.tsx && pnpm --filter @coffer/web build`

Expected: PASS; `/` is statically generated and all real evidence links contain testnet digests from `deployments/testnet.json`.

Commit: `feat(web): complete editorial product story`

---

### Task 6: Define the workspace domain model and demo records

**Files:**
- Create: `apps/web/lib/requests/model.ts`
- Create: `apps/web/lib/demo/fixtures.ts`
- Create: `apps/web/tests/demo-fixtures.test.ts`

**Interfaces:**
- Produces: `type DataSource = 'live' | 'verified' | 'demo'`.
- Produces: `type AgentOutcome = 'auto_execute' | 'hold' | 'reject' | 'human_authorization'`.
- Produces: `type PaymentRequestRecord` with `id`, `vendor`, `amountBaseUnits`, `currency`, `dueAt`, `sourceBucket`, `dataSource`, `outcome`, `reasonCode`, `document`, `checks`, and optional `transactionDigest`/`actionDigest`.
- Produces: `DEMO_REQUESTS`, `DEMO_VENDORS`, `DEMO_DOCUMENTS`, `DEMO_POLICIES`, `DEMO_USERS`, `DEMO_STANDING_ORDERS`, and `DEMO_AUDIT_EVENTS` as readonly arrays.

- [x] **Step 1: Write failing invariant tests**

Test there is at least one request for each outcome, only execute records may contain an execution digest, the verified auto and World records use the exact digests in `TESTNET_DEPLOYMENT`, hold/reject records contain stable reason codes and no digest, every document explicitly states encrypted/commercial metadata state, and every record has one valid `dataSource`.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/demo-fixtures.test.ts`

Expected: FAIL because fixture exports are missing.

- [x] **Step 3: Implement minimal coherent fixtures**

Use three buckets named `Operating`, `Reserve`, and `Vendor committed`. Include one verified 80 DEMO_USD autonomous payment, one verified 300 DEMO_USD World-authorized payment, one held request caused by projected reserve shortfall, and one rejected request caused by an unapproved counterparty. Keep secondary records rich enough to populate tables but do not provide mutation handlers.

- [x] **Step 4: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/demo-fixtures.test.ts && pnpm --filter @coffer/web typecheck`

Expected: PASS.

Commit: `feat(web): model treasury workspace data`

---

### Task 7: Build the responsive institutional app shell

**Files:**
- Create: `apps/web/app/app/layout.tsx`
- Create: `apps/web/app/app/page.tsx`
- Create: `apps/web/components/app-shell/app-shell.tsx`
- Create: `apps/web/components/app-shell/app-shell.module.css`
- Create: `apps/web/components/app-shell/navigation.tsx`
- Create: `apps/web/components/app-shell/top-bar.tsx`
- Create: `apps/web/components/ui/data-source-badge.tsx`
- Create: `apps/web/tests/app-shell.test.tsx`

**Interfaces:**
- Produces: `<AppShell>{children}</AppShell>` and grouped navigation for all eleven approved routes.
- Produces: `<DataSourceBadge source={DataSource} />` with exact visible labels.

- [x] **Step 1: Write failing navigation tests**

Assert the shell exposes the six operational routes, five read-only institutional routes, testnet status, demo-workspace label, a treasury selector labelled `Tokyo Operations Treasury`, and a skip link to the main content. Assert `/app` redirects to `/app/overview`.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/app-shell.test.tsx`

Expected: FAIL because the shell does not exist.

- [x] **Step 3: Implement shell and responsive navigation**

Use a narrow forest rail on desktop and an accessible modal drawer below 960px. The cream canvas must remain independently scrollable, active routes use `aria-current="page"`, and secondary routes display `Read-only` without disabling navigation.

- [x] **Step 4: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/app-shell.test.tsx && pnpm --filter @coffer/web build`

Expected: PASS and all `/app/*` links resolve after the pages in the next tasks are added; during this task, use only the `/app/overview` link as active and render other links normally.

Commit: `feat(web): add institutional workspace shell`

---

### Task 8: Implement overview and request decision surfaces

**Files:**
- Create: `apps/web/app/app/overview/page.tsx`
- Create: `apps/web/app/app/requests/page.tsx`
- Create: `apps/web/components/requests/request-table.tsx`
- Create: `apps/web/components/requests/request-detail-drawer.tsx`
- Create: `apps/web/components/requests/policy-check-list.tsx`
- Create: `apps/web/components/requests/outcome-state.tsx`
- Create: `apps/web/tests/overview.test.tsx`
- Create: `apps/web/tests/request-detail.test.tsx`

**Interfaces:**
- Produces: query-param drawer contract `/app/requests?request=<id>` so a request is deep-linkable without a route change.
- Consumes: `PaymentRequestRecord` and fixture arrays from Task 6.

- [x] **Step 1: Write failing overview tests**

Assert bucket balances, mandate headroom, next obligation, a proactive shortfall warning, and recent agent actions render without any wallet context. Assert every financial datum carries or inherits a visible source badge.

- [x] **Step 2: Write failing request-detail tests**

For each outcome, assert the drawer shows vendor, amount, bucket, document reference, extraction confidence, named policy checks, stable reason code, and the correct terminal action. Blocked and rejected records must render `No transaction submitted`; verified records must show `Verified testnet run` and a SuiScan link.

- [x] **Step 3: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/overview.test.tsx tests/request-detail.test.tsx`

Expected: FAIL because the pages and components are missing.

- [x] **Step 4: Implement the overview and drawer**

Keep the dashboard operational rather than decorative: each summary links to a relevant route, the shortfall warning names the date and affected bucket, and the audit list uses deterministic timestamps from fixtures. Implement drawer focus trapping, Escape close, close-button label, and focus restoration.

- [x] **Step 5: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/overview.test.tsx tests/request-detail.test.tsx && pnpm --filter @coffer/web typecheck`

Expected: PASS.

Commit: `feat(web): add treasury decisions workspace`

---

### Task 9: Add operational and institutional read-only routes

**Files:**
- Create: `apps/web/app/app/approvals/page.tsx`
- Create: `apps/web/app/app/mandates/page.tsx`
- Create: `apps/web/app/app/standing-orders/page.tsx`
- Create: `apps/web/app/app/audit/page.tsx`
- Create: `apps/web/app/app/vendors/page.tsx`
- Create: `apps/web/app/app/documents/page.tsx`
- Create: `apps/web/app/app/policies/page.tsx`
- Create: `apps/web/app/app/users/page.tsx`
- Create: `apps/web/app/app/settings/page.tsx`
- Create: `apps/web/components/ui/read-only-notice.tsx`
- Create: `apps/web/tests/workspace-routes.test.tsx`

**Interfaces:**
- Produces: stable renderable pages for every route in the approved navigation.
- Consumes: Task 6 fixtures and Task 5 evidence helpers.

- [x] **Step 1: Write the failing route contract test**

Import every page and assert its unique heading and expected content. Approvals must distinguish pending versus completed; mandates must show cap, approved vendors, expiry, policy version, and revocation status; standing orders must show next run and bucket; audit must show decision-to-receipt sequence; every secondary page must show `Demo workspace data` and `Read-only in this build`.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/workspace-routes.test.tsx`

Expected: FAIL on the first missing page.

- [x] **Step 3: Implement focused pages**

Share table primitives but vary page composition by job: approvals use a queue, mandates use policy sections, standing orders use a schedule, audit uses a timeline, vendors/documents/policies/users use tables, and settings uses definition lists. Do not render inactive edit/create buttons that imply unsupported behavior.

- [x] **Step 4: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/workspace-routes.test.tsx && pnpm web:build`

Expected: PASS and Next lists all eleven `/app/*` routes.

Commit: `feat(web): populate Coffer operations workspace`

---

### Task 10: Integrate Sui dApp Kit, standard wallets, and Enoki Google login

**Files:**
- Create: `apps/web/lib/env.ts`
- Create: `apps/web/lib/sui/dapp-kit.ts`
- Create: `apps/web/components/connection/sui-provider.tsx`
- Create: `apps/web/components/connection/connection-control.tsx`
- Create: `apps/web/components/connection/action-gate.tsx`
- Create: `apps/web/tests/env.test.ts`
- Create: `apps/web/tests/action-gate.test.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/components/app-shell/top-bar.tsx`
- Modify: `apps/web/.env.example`

**Interfaces:**
- Produces: `getPublicConfig(): { network: 'testnet'; grpcUrl: string; enoki?: { apiKey: string; googleClientId: string } }`.
- Produces: client-only `<SuiProvider />`, `<ConnectionControl />`, and `<ActionGate actionLabel onConnectedAction>`.
- Registers Google Enoki wallets only when both Enoki public API key and Google client ID are present.

- [x] **Step 1: Write failing configuration tests**

Assert testnet and the official testnet gRPC URL are defaults, one missing Enoki variable disables only Google login, two valid variables enable it, and no returned configuration contains a key named `secret`, `privateKey`, or `signer`.

- [x] **Step 2: Write failing action-gate tests**

Assert browsing content renders without an account; triggering a protected action while disconnected opens choices `Continue with Google` and `Connect Sui Wallet`; when Enoki is unconfigured, the Google choice explains setup is unavailable while standard wallet remains usable; a connected account runs the supplied action exactly once.

- [x] **Step 3: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/env.test.ts tests/action-gate.test.tsx`

Expected: FAIL because config and connection components are missing.

- [x] **Step 4: Register the official clients in a client-only module**

Create `SuiGrpcClient({ network: 'testnet', baseUrl: grpcUrl })`, pass it through `createDAppKit`, and call `registerEnokiWallets` with the public API key, the same client, the current-network getter, and Google client ID. Use dynamic client import/provider boundaries required by the official Next.js guide so wallet discovery never runs during server rendering.

- [ ] **Step 5: Add the manual Enoki checkpoint**

In Enoki Developer Portal, create a testnet app, configure Google as an auth provider, add `http://localhost:3000` and the eventual Vercel origin to allowed origins, create a public zkLogin API key, and set only these browser-safe values:

```dotenv
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_GRPC_URL=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_ENOKI_API_KEY=<public Enoki zkLogin key>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google OAuth client id>
```

Do not add an Enoki private API key because Coffer's existing gateway performs sponsored protected execution.

- [ ] **Step 6: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/env.test.ts tests/action-gate.test.tsx && pnpm --filter @coffer/web build`

Expected: PASS. Manually verify Google opens the Enoki OAuth popup and a browser Sui wallet appears in the same connection surface.

Commit: `feat(web): add Sui and Google account entry`

---

### Task 11: Add live Sui reads with explicit fallback provenance

**Files:**
- Create: `apps/web/lib/sui/live-treasury.ts`
- Create: `apps/web/app/api/treasury/route.ts`
- Create: `apps/web/components/ui/live-status.tsx`
- Create: `apps/web/tests/live-treasury.test.ts`
- Modify: `apps/web/app/app/overview/page.tsx`
- Modify: `apps/web/app/app/audit/page.tsx`

**Interfaces:**
- Produces: `readTreasurySnapshot(client: ClientWithCoreApi, deployment: PublicDeployment): Promise<TreasurySnapshot>`.
- Produces: `GET /api/treasury` returning `{ source: 'live', fetchedAt, treasury, transactions }` or `{ source: 'verified', reason: 'rpc_unavailable', treasury, transactions }` with HTTP 200.
- `TreasurySnapshot` contains only data actually decoded from Sui objects/transactions plus deployment identifiers; demo fixture fields never enter the live result.

- [ ] **Step 1: Write failing reader tests**

Pass a fake `ClientWithCoreApi` whose `core.getObject` and `core.getTransaction` return known objects. Assert the treasury ID, package ID, auto execution digest, and World execution digest are requested; assert parsed results are marked `live`; and assert an RPC exception yields a separately constructed `verified` fallback with reason `rpc_unavailable`.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/live-treasury.test.ts`

Expected: FAIL because `readTreasurySnapshot` is missing.

- [ ] **Step 3: Implement transport-agnostic reads**

Accept `ClientWithCoreApi`; call `client.core.getObject({ objectId, include: { content: true } })` and `client.core.getTransaction({ digest, include: { effects: true, events: true } })`. Treat absence of requested content or an unsuccessful transaction as an error, not live confirmation.

- [ ] **Step 4: Implement the server route and UI state**

Instantiate `SuiGrpcClient` only in the route, return `cache-control: no-store`, set an 8-second abort timeout, and transform errors into the explicit verified fallback. The overview shows `Live testnet` only after a successful response and `Verified testnet run · RPC unavailable` otherwise.

- [ ] **Step 5: Verify and commit**

Run: `pnpm --filter @coffer/web test -- tests/live-treasury.test.ts && pnpm --filter @coffer/web build`

Expected: PASS. With network access, `curl http://localhost:3000/api/treasury` returns a source and the configured treasury ID without any secret fields.

Commit: `feat(web): surface live Sui treasury evidence`

---

### Task 12: Return World authorization to the app safely

**Files:**
- Modify: `packages/world-auth/src/gateway.ts`
- Modify: `packages/world-auth/src/gateway.test.ts`
- Modify: `packages/world-auth/src/verifier.ts`
- Modify: `packages/world-auth/src/verifier.test.ts`
- Modify: `scripts/run-world-gateway.ts`
- Modify: `.env.example`
- Modify: `docs/deployment-render.md`

**Interfaces:**
- Extends: `WorldGatewayConfig` with optional `appReturnUri?: string`.
- Extends: `WorldGatewayOptions<TResult>` with optional `redirectResult?: (result: TResult) => Record<string, string>`.
- Preserves: JSON responses when `appReturnUri` is absent or request header `Accept` contains `application/json`.
- Produces: stable callback categories `authorized | cancelled | expired | replayed | rejected | failed` without exposing raw verifier errors in the browser URL.
- Produces: browser redirects to the fixed configured origin only; no request parameter controls the redirect origin.

- [ ] **Step 1: Write failing redirect tests**

Add tests for: verified callback redirects to `https://app.example/app/approvals?world_status=authorized&action_digest=abcd&transaction_digest=0xticket`; cancelled, expired, replayed, and rejected callbacks redirect with their matching stable status; `Accept: application/json` preserves the existing JSON body; an invalid `appReturnUri` is rejected at gateway construction; and `onVerified` is never called on cancellation/expiry/rejection/replay. Add `AuthorizationExpiredError` verifier tests for an expired pending OIDC request and an expired protected action. Preserve the existing `AuthorizationReplayError` assertion for a consumed nonce.

- [ ] **Step 2: Verify red**

Run: `pnpm --filter @coffer/world-auth test -- src/gateway.test.ts`

Expected: FAIL because redirect configuration is unsupported.

- [ ] **Step 3: Implement fixed-origin redirect responses**

Add `AuthorizationExpiredError` beside the existing cancellation, validation, and replay errors; throw it for the three explicit expiry checks without changing their human-readable messages. Import and handle `AuthorizationReplayError` separately in the gateway instead of allowing it to become a generic 500. Validate `appReturnUri` as HTTPS except `http://localhost`, normalize it once when creating the gateway, and build the `/app/approvals` URL only from server-owned configuration. Allow only the status, action digest, safe result fields returned by `redirectResult`, and a stable error category in the query string. Continue to set `cache-control: no-store`.

- [ ] **Step 4: Wire Render configuration**

Read `WORLD_APP_RETURN_URI` in `run-world-gateway.ts` and map the known `transactionDigest` to `transaction_digest`. Add this example:

```dotenv
WORLD_APP_RETURN_URI=https://coffer.vercel.app
```

Keep `WORLD_OIDC_REDIRECT_URI=https://coffer-tokyo-world-gateway.onrender.com/api/world/callback` unchanged in the World portal.

- [ ] **Step 5: Verify and commit**

Run: `pnpm --filter @coffer/world-auth test && pnpm typecheck`

Expected: PASS, including existing JSON callback tests.

Commit: `feat(world): return protected actions to app`

---

### Task 13: Wire the fresh World approval journey

**Files:**
- Create: `apps/web/lib/world/client.ts`
- Create: `apps/web/components/requests/world-authorization-button.tsx`
- Create: `apps/web/components/requests/authorization-result.tsx`
- Create: `apps/web/tests/world-client.test.ts`
- Create: `apps/web/tests/world-authorization.test.tsx`
- Modify: `apps/web/app/app/approvals/page.tsx`
- Modify: `apps/web/components/requests/request-detail-drawer.tsx`
- Modify: `apps/web/.env.example`

**Interfaces:**
- Produces: `beginWorldAuthorization(action: ActionAuthorizationPayload, fetcher?: typeof fetch): Promise<{ authorizationUrl: string; actionDigest: string }>`.
- Produces: callback query parser with statuses `authorized | cancelled | expired | replayed | rejected | failed` and strict digest validation.
- Consumes: `NEXT_PUBLIC_WORLD_GATEWAY_URL=https://coffer-tokyo-world-gateway.onrender.com`.

- [ ] **Step 1: Write failing client tests**

Assert the client POSTs the exact canonical action to `/api/world/authorize`, rejects non-HTTPS gateways except localhost, rejects malformed gateway responses, and never accepts a client-provided success result.

- [ ] **Step 2: Write failing component tests**

Assert the protected request action first passes through `ActionGate`, then opens the returned World URL; approved callback parameters render success only with valid action and transaction digests; cancelled/expired/replayed/rejected/failed states render no success language and no balance change; malformed or missing digests downgrade an `authorized` query to an invalid result; and the verified historical World record is labelled as history rather than executable again.

- [ ] **Step 3: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/world-client.test.ts tests/world-authorization.test.tsx`

Expected: FAIL because the client and components are missing.

- [ ] **Step 4: Implement the fresh journey**

Use `window.location.assign(authorizationUrl)` only after successful server response. On return, display the transaction digest, a SuiScan link, and `World event identity is mocked; server validation and action binding are real.` Clear callback query parameters only after the result has been rendered and acknowledged.

- [ ] **Step 5: Verify locally and against Render**

Run: `pnpm --filter @coffer/web test -- tests/world-client.test.ts tests/world-authorization.test.tsx && pnpm --filter @coffer/web build`

Expected: PASS. After Render receives `WORLD_APP_RETURN_URI`, a fresh sandbox authorization returns to `/app/approvals` and a replay returns a non-success state without a new transaction.

- [ ] **Step 6: Commit**

Commit: `feat(web): connect fresh World approvals`

---

### Task 14: Add browser-level journeys, visual checks, and Vercel delivery

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/landing.spec.ts`
- Create: `apps/web/e2e/workspace.spec.ts`
- Create: `apps/web/e2e/responsive.spec.ts`
- Create: `apps/web/vercel.json`
- Create: `docs/deployment-vercel.md`
- Modify: `apps/web/package.json`
- Modify: `.github/workflows/ci.yml`
- Modify: `pnpm-lock.yaml`

**Interfaces:**
- Produces: `pnpm --filter @coffer/web test:e2e` for critical browser journeys.
- Produces: a Vercel deployment contract with `apps/web` as project root and no server secret in frontend configuration.

- [ ] **Step 1: Write Playwright journeys before final styling fixes**

Cover: landing hero and editorial anchors; mobile menu open/close; `/app/overview` browsing without a wallet; request drawer for all four outcomes; connection gate; live-versus-verified source display; World success/cancel/reject query states; external SuiScan links; and no horizontal overflow at 390×844, 768×1024, 1440×900, and 1920×1080.

- [ ] **Step 2: Verify at least one journey fails for the intended missing browser behavior**

Run: `pnpm --filter @coffer/web test:e2e`

Expected: at least one RED assertion from viewport, focus, or callback behavior that unit tests do not cover. Record the failing assertion in the implementation notes before changing production code.

- [ ] **Step 3: Make only the CSS/interaction corrections required by the red journeys**

Keep visual corrections inside the owning component module. Do not introduce a page-wide `overflow-x: hidden` to mask layout defects; fix the overflowing element. Verify keyboard focus order and reduced-motion emulation.

- [ ] **Step 4: Configure Vercel**

Set the Vercel project root to `apps/web`, framework preset to Next.js, install command to `cd ../.. && pnpm install --frozen-lockfile`, and build command to `cd ../.. && pnpm --filter @coffer/web build`. Add only these public environment values in Vercel:

```dotenv
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_GRPC_URL=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_WORLD_GATEWAY_URL=https://coffer-tokyo-world-gateway.onrender.com
NEXT_PUBLIC_ENOKI_API_KEY=<public Enoki zkLogin key>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google OAuth client id>
```

After the first deployment, add the exact Vercel origin to Enoki and Google allowed origins, set Render `WORLD_APP_RETURN_URI` to that origin, and redeploy Render without changing World’s callback URI.

- [ ] **Step 5: Run final verification**

Run:

```bash
pnpm typecheck
pnpm test
pnpm --filter @coffer/web lint
pnpm --filter @coffer/web build
pnpm --filter @coffer/web test:e2e
git diff --check
```

Expected: every command exits 0. Capture screenshots at the four target viewports and inspect the landing hero, every editorial section, overview, request drawer, approvals, and one secondary institutional route.

- [ ] **Step 6: Commit and push**

Commit: `test(web): harden responsive demo journeys`

Push: `git push origin codex/coffer-mvp`

---

## Manual account actions required during execution

1. Create/configure the Enoki testnet application and public zkLogin key; no private key is needed for this frontend plan.
2. Confirm Google OAuth client configuration accepts localhost and the final Vercel origin.
3. Create the Vercel project from the same GitHub repository, select branch `codex/coffer-mvp`, and set root directory `apps/web`.
4. Add the five public Vercel variables listed in Task 14.
5. Add `WORLD_APP_RETURN_URI=<final Vercel origin>` on Render and redeploy.
6. Keep the existing World portal callback exactly `https://coffer-tokyo-world-gateway.onrender.com/api/world/callback`.

## Completion gate

The frontend phase is complete only when the landing and all app routes build, the protected-action callback returns to the app, standard wallet and Google entry are both manually demonstrated, live/verified/demo provenance is visible, replay and failure states cannot display success, desktop/mobile captures are inspected, CI is green, and the final Vercel URL is reachable. Sponsor submission copy, feedback forms, and final submission documentation start only after this gate.
