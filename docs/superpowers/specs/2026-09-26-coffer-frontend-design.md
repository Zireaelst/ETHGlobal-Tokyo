# Coffer Frontend Design

**Date:** 2026-09-26  
**Status:** Approved design, pending implementation plan

## Objective

Build one cohesive Coffer frontend with two distinct surfaces:

- `/` is a cinematic editorial landing page that explains the product and its trust model.
- `/app/*` is an institutional treasury workspace that exposes the real Sui, Seal/Walrus, agent, and World-backed demo flows.

The product must look unmistakably like Coffer: Japanese editorial composition, institutional fintech discipline, programmable treasury infrastructure, deep forest and warm cream colors, restrained halftone texture, and calm motion. It must not resemble a generic AI or crypto template.

## Product truth and scope

The interface must preserve these claims:

- AI interprets commercial documents; deterministic policy and Move contracts decide whether money may move.
- Sui holds treasury state, mandate constraints, payment requests, and receipts.
- Seal encrypts commercial content before Walrus stores the ciphertext.
- World protects an exact exceptional action with fresh human authorization; the event identities are mocked and are not KYC or legal identity.
- Transfer amounts and recipient addresses are not confidential.

The first release makes the prize-critical paths deep and real. Secondary institutional modules are populated and credible but read-only. Full CRUD for secondary modules remains backlog work.

## Technical architecture

Use a single Next.js App Router and TypeScript application deployed to Vercel.

- Landing route: `/`
- Product routes: `/app/*`
- Sui wallet support: current official Sui dApp Kit packages compatible with the repository's pinned `@mysten/sui` version.
- Human-friendly entry: Google zkLogin and standard Sui wallet connection.
- Fonts: `geist` npm package for Geist Pixel Circle, Google-hosted Inter and Instrument Serif.
- Public chain reads may happen from the browser or Vercel server components.
- World client secret and the demo Sui signer remain on the existing Render gateway.
- No secret may be exposed through `NEXT_PUBLIC_*` or the browser bundle.

The landing and application share tokens, typography, icons, and motion primitives but use different visual density. The landing is immersive; the app is operational.

## Asset normalization

Copy only selected source assets into the frontend and convert photographic/raster artwork to WebP. Preserve the original source files outside the frontend until the converted output is visually verified.

```text
apps/web/public/assets/
├── brand/
│   ├── logo-lockup-dark.webp
│   ├── logo-lockup-light.webp
│   ├── app-icon-dark.webp
│   └── app-icon-light.webp
├── hero/
│   └── hero-fuji.webp
├── sections/
│   ├── mandate.webp
│   ├── privacy.webp
│   ├── authorization.webp
│   └── audit.webp
├── textures/
│   ├── flow.webp
│   └── closing-landscape.webp
└── integrations/
    ├── sui.svg
    ├── world.svg
    ├── seal.svg
    └── walrus.svg
```

Source mapping:

| Destination | Current source |
|---|---|
| `brand/logo-lockup-dark.webp` | `assets/coffer_logo.png`, optimized for light surfaces |
| `brand/app-icon-dark.webp` | `assets/coffer_app_icon_dark_2048.png` |
| `hero/hero-fuji.webp` | `assets/asset2.png` |
| `sections/mandate.webp` | `assets/Treasury Architecture.png` |
| `sections/privacy.webp` | `assets/asset9.png` |
| `sections/authorization.webp` | `assets/asset7.png` |
| `sections/audit.webp` | `assets/asset13.png` |
| `textures/flow.webp` | `assets/abstract flow texture.png` |
| `textures/closing-landscape.webp` | `assets/cards-full.png` |

Light logo/icon variants may be derived from the supplied transparent brand masters only when a suitable supplied variant does not exist. Sponsor logos use temporary labeled geometric placeholders until official SVGs are supplied. Placeholders must not imitate official marks.

## Shared visual system

Core colors:

```css
--bg: #061b15;
--bg-deep: #03110d;
--forest: #08291f;
--forest-2: #10372c;
--forest-soft: #25483e;
--cream: #f3ead6;
--cream-soft: #e7ddc8;
--paper: #f7f1e5;
--text: #f3ead6;
--text-dark: #0b1c17;
--muted: #a7ada5;
--muted-light: #cfc7b6;
```

- Instrument Serif is reserved for editorial display headings.
- Inter is used for navigation, copy, controls, tables, and financial data.
- Geist Pixel Circle is used sparingly for section numbers, status codes, transaction fragments, and metric symbols.
- Motion is slow and controlled. No bounce, elastic spring, dramatic zoom, glow, or animated gradient.
- `prefers-reduced-motion` reveals all content immediately and disables transforms and count interpolation.
- Focus states, contrast, semantic landmarks, keyboard navigation, and icon labels are required.

## Landing page

### First viewport

The first viewport remains a single cinematic composition within approximately `100dvh` on desktop:

- Floating logo, cream navigation pill, and dark `Launch App` action.
- Compact Sui, World, Seal, and Walrus technology row with a `Policy-enforced on Sui` label.
- Eyebrow: `COFFER`.
- Headline: `Autonomous Treasury. Within Your Rules.`
- Short copy: `AI operates within enforceable spending mandates. Humans control the exceptions.`
- Primary action: `Launch Demo` linking to `/app/overview`.
- Secondary action: `See how it works` scrolling to the mandate chapter.
- Four truthful product facts: three treasury buckets, four agent outcomes, one action-bound authorization, and two access paths.

`hero-fuji.webp` fills the viewport. A directional forest overlay protects left-aligned text without flattening the Fuji composition.

### Editorial story

The lower page must feel like one continuous publication rather than repeated SaaS cards:

1. **Mandate split:** `Give agents a mandate — not a wallet.` Text left, bucket architecture dominant on the right.
2. **Privacy band:** `Private commercial context. Verifiable financial execution.` A wider technical composition showing separated private and public layers.
3. **Authorization rail:** `Humans approve exceptions. Not every transaction.` The visual sits beside four restrained steps: evaluated, authorized, action-bound, executed.
4. **Receipt composition:** `Every decision leaves a receipt.` Real testnet evidence and SuiScan links appear with the audit artwork.
5. **Protocol rail:** compact Sui, World, Seal, and Walrus roles without generic logo-card styling.
6. **Cream closing scene:** `Autonomous capital for the agentic era.` with one dark `Launch App` action.

Each chapter changes composition—split, wide band, process rail, and receipt overlay—to avoid the repetitive rhythm of the second reference image.

### Responsive behavior

- Desktop navigation becomes a logo and accessible menu button at `720px` and below.
- The mobile sheet closes on overlay click, Escape, link activation, and resize above the breakpoint.
- The first viewport stays composed rather than forcing every desktop element above the fold on short mobile screens.
- Metrics become a 2×2 grid.
- All editorial chapters stack text before artwork.
- No horizontal overflow is allowed.

## Application workspace

### Shell

The application uses a narrow forest navigation rail, a cream operational canvas, and a compact top bar containing treasury selection, testnet status, demo-mode label, and connection controls. Halftone art is limited to onboarding, empty states, and small contextual headers so financial data remains legible.

The app opens directly into a populated demo treasury. Browsing does not require a wallet. Any action that moves money or changes authority triggers a Google zkLogin or Sui wallet connection gate.

### Routes

| Route | Purpose | Initial depth |
|---|---|---|
| `/app/overview` | Buckets, mandate headroom, next obligation, shortfall warning, recent agent actions | Operational |
| `/app/requests` | Payment requests and four outcome states | Operational |
| `/app/approvals` | Pending World authorizations and completed exceptions | Operational |
| `/app/mandates` | Limits, approved vendors, expiry, policy version, revocation | Operational |
| `/app/standing-orders` | Scheduled payments and upcoming obligations | Operational |
| `/app/audit` | Decision-to-receipt timeline and evidence links | Operational |
| `/app/vendors` | Vendor registry and status | Populated read-only |
| `/app/documents` | Encrypted commercial document references | Populated read-only |
| `/app/policies` | Policy summaries and versions | Populated read-only |
| `/app/users` | Human operators and access roles | Populated read-only |
| `/app/settings` | Network and workspace configuration | Populated read-only |

### Request detail

A payment request opens in a right-side detail panel rather than navigating away. It shows:

- Vendor, amount, due date, source bucket, and current state.
- Encrypted document reference and selective document-access state.
- Agent extraction result and confidence.
- Individual policy checks with stable reason codes.
- The chosen outcome: execute, hold, reject, or require human authorization.
- World authorization action when required.
- Final Sui digest, receipt, and explorer link when executed.

The panel is the main three-minute demo surface.

## Data and interaction model

The UI distinguishes three sources explicitly:

- **Live testnet:** freshly read Sui object or transaction state.
- **Verified testnet run:** historical evidence already committed in `deployments/testnet.json` and linked to its real transaction.
- **Demo workspace data:** representative institutional records used only to populate read-only secondary modules.

The UI must never present a replay as a newly submitted transaction.

Core behavior:

1. An autonomous-success record replays its real audit sequence and links to the verified testnet transaction.
2. A blocked request ends with a stable policy reason and no balance change.
3. A protected exception opens a fresh World authorization request for the exact action.
4. After successful server-side validation and Sui execution, the World callback returns the user to `/app/approvals` with a transaction digest.
5. An expired, cancelled, invalid, or replayed callback never displays success and never changes the balance.

Execution state is shown only after a transaction digest is returned and confirmed. RPC, gateway, or wallet failures produce calm inline errors with retry actions. No optimistic animation may imply settlement before confirmation.

## Authentication and authorization UX

- Browsing the demo workspace is immediate.
- `Continue with Google` starts zkLogin for non-crypto-native users.
- `Connect Sui Wallet` remains available for crypto-native users.
- The interface explains that wallet connection grants an account context, not unlimited agent authority.
- World is not a login mechanism. It appears only at the protected action boundary.
- The World callback should return to the application rather than leaving the user on raw JSON, while preserving a JSON response mode for integration tests and debugging.

## Testing and verification

Automated coverage must include:

- Landing navigation, mobile menu, anchor behavior, reduced motion, and semantic accessibility.
- App route navigation and responsive shell behavior.
- Demo-mode browsing without a wallet.
- Connection gate for money-moving and authority-changing actions.
- Request detail states for execute, hold, reject, and human authorization.
- Separation of live, verified-run, and demo workspace labels.
- World success, cancellation, expiry, invalid state, and replay behavior.
- RPC/gateway failure handling without false success.

Before completion, verify production build, typecheck, unit/component tests, and desktop/mobile visual captures. Inspect the resulting pages at wide desktop, laptop, tablet, and narrow mobile widths.

## Backlog

Implement only after the prize-critical product is stable:

- Full vendor CRUD and allowlist administration.
- Document upload and lifecycle management from the UI.
- Policy builder and version publishing.
- Multi-user invitations and role administration.
- General settings mutation.
- Multiple organizations and treasury switching beyond the demo workspace.
- Additional theme/logo variants and final official integration SVGs.

## Delivery discipline

- Use small, frequent commits because ETHGlobal evaluates repository history.
- Each commit should represent one independently reviewable slice and include its relevant verification.
- Do not combine asset normalization, landing structure, app shell, wallet integration, and live demo wiring into one final commit.
- Submission documentation remains the final phase after implementation and demo hardening.
