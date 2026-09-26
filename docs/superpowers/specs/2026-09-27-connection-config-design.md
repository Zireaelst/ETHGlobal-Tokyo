# Coffer connection configuration and modal design

## Goal

Make Google zkLogin available in the deployed browser build when valid public Enoki and Google configuration exists, and replace the provider-owned wallet chooser with a centered Coffer connection dialog.

## Root cause and boundary

`NEXT_PUBLIC_*` values are compiled into a Next.js browser bundle only when referenced as direct `process.env.NEXT_PUBLIC_*` expressions. The current public-config helper passes `process.env` through an object and then performs an indirect property lookup, so Vercel values are absent in the client bundle despite being configured at build time.

The fix reads every browser-safe value directly at module initialization, while retaining an optional injected environment object for unit tests. Only the existing public Enoki API key and Google OAuth client ID may reach the browser. Private Enoki keys, Google client secrets, World credentials, and signer material remain server-only.

## Connection experience

The existing full-screen backdrop remains. Its dialog is centered in the viewport and becomes a contained connection chooser:

1. **Google** is the primary, full-width button when Enoki and the Google wallet have both registered. It is labeled `Continue with Google` and explains that it uses Enoki zkLogin without a seed phrase.
2. **Sui wallets** are rendered as Coffer-styled secondary buttons from the detected wallet-standard list, excluding Enoki wallets so Google is not duplicated.
3. If no standard Sui wallet is detected, the dialog explains that users can install a Sui wallet; it does not show an uncontrolled provider modal.
4. If the public configuration is incomplete, Google is not rendered as a disabled action. A concise non-success state explains that Google sign-in is unavailable while ordinary wallet access remains available.

The dialog retains focus-on-open, Escape dismissal, accessible labels, and the existing action gate: browsing is account-free and a protected action proceeds only after connection.

## Interfaces

- `getPublicConfig()` continues to return a typed public configuration and accepts a test-only environment override.
- `ConnectionDialog` resolves both the Google wallet and ordinary wallet-standard options from `useWallets`.
- A selected standard wallet calls the existing `kit.connectWallet({ wallet })` API. No application-owned wallet connection protocol is introduced.
- The provider-owned `ConnectButton` wrapper is removed because it produces a visual system outside Coffer control.

## Verification

- Unit test: public Enoki/Google values are discoverable through the direct browser environment path.
- Component tests: Google appears only when registered; standard wallet options are listed; no-wallet and incomplete-config states are explicit.
- Browser journey: the dialog is centered, has no provider-owned modal trigger, and Google/wallet choices are keyboard reachable.
- Run the full existing test suite, typecheck, lint, production build, and Playwright suite before deployment.

## Non-goals

- No changes to World authorization, transaction execution, or agency policy.
- No runtime endpoint to expose configuration.
- No Enoki sponsored transaction service or private-key deployment.
