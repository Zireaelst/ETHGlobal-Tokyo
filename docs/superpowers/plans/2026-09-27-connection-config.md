# Coffer Connection Configuration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Vercel-provided public Enoki/Google configuration available to the browser and replace the provider-owned wallet picker with a centered Coffer-styled chooser.

**Architecture:** `lib/env.ts` will use direct `process.env.NEXT_PUBLIC_*` references for the production browser path, preserving its explicit injected environment for tests. The connection dialog will obtain Google and wallet-standard options from the existing dApp Kit hooks and render all choices itself; provider-owned `ConnectButton` UI will be removed.

**Tech Stack:** Next.js 16.3.6, React 19.3.0, TypeScript, `@mysten/dapp-kit-react` 2.1.35, `@mysten/enoki` 1.2.28, Vitest, Testing Library, Playwright.

## Global Constraints

- Only `NEXT_PUBLIC_ENOKI_API_KEY` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` are browser-safe Enoki/Google configuration values.
- Do not expose private Enoki keys, Google client secrets, World credentials, or the Sui signer.
- Standard Sui wallet and Google zkLogin are alternative account-entry paths; no wallet is required for browsing.
- A protected action proceeds only after `kit.connectWallet({ wallet })` resolves.
- Keep the connection dialog keyboard-safe, center it in the viewport, and respect small viewports without page-level overflow.
- Use tests first; record a red test before each production behavior change.
- Make small commits and push `main` after every completed task.

---

### Task 1: Inline public browser configuration correctly

**Files:**
- Modify: `apps/web/lib/env.ts`
- Modify: `apps/web/tests/env.test.ts`

**Interfaces:**
- Consumes: Vercel build-time `NEXT_PUBLIC_SUI_NETWORK`, `NEXT_PUBLIC_SUI_GRPC_URL`, `NEXT_PUBLIC_ENOKI_API_KEY`, and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- Produces: `getPublicConfig(environment?: PublicEnvironment): PublicConfig`, with a default environment that contains direct static `process.env.NEXT_PUBLIC_*` reads.

- [x] **Step 1: Write the failing public-default test**

In `apps/web/tests/env.test.ts`, use `vi.stubEnv`, `vi.resetModules`, and a fresh dynamic import to assert the default browser configuration sees both values:

```ts
it("reads public Enoki configuration from direct browser environment references", async () => {
  vi.stubEnv("NEXT_PUBLIC_ENOKI_API_KEY", "enoki_public_test");
  vi.stubEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID", "test.apps.googleusercontent.com");
  vi.resetModules();
  const { getPublicConfig } = await import("../lib/env");

  expect(getPublicConfig()).toMatchObject({
    enoki: {
      apiKey: "enoki_public_test",
      googleClientId: "test.apps.googleusercontent.com",
    },
  });
});
```

Restore stubbed environment values in `afterEach`.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/env.test.ts`

Expected: FAIL because the indirect `process.env` default is not a direct browser-inlineable path.

- [x] **Step 3: Add direct production environment values**

In `apps/web/lib/env.ts`, define this static object before `getPublicConfig` and use it as the default parameter:

```ts
const browserPublicEnvironment: PublicEnvironment = {
  NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
  NEXT_PUBLIC_SUI_GRPC_URL: process.env.NEXT_PUBLIC_SUI_GRPC_URL,
  NEXT_PUBLIC_ENOKI_API_KEY: process.env.NEXT_PUBLIC_ENOKI_API_KEY,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
};

export function getPublicConfig(
  environment: PublicEnvironment = browserPublicEnvironment,
): PublicConfig {
  // existing validation and typed projection
}
```

Do not add generic `process.env` forwarding or a runtime configuration endpoint.

- [x] **Step 4: Verify green**

Run: `pnpm --filter @coffer/web test -- tests/env.test.ts && pnpm --filter @coffer/web typecheck`

Expected: all existing public-config tests pass and TypeScript reports no errors.

- [x] **Step 5: Commit and push**

```bash
git add apps/web/lib/env.ts apps/web/tests/env.test.ts
git commit -m "fix(web): inline public Enoki configuration"
git push origin main
```

### Task 2: Render an owned, centered connection chooser

**Files:**
- Delete: `apps/web/components/connection/wallet-connect-button.tsx`
- Modify: `apps/web/components/connection/connection-control.tsx`
- Modify: `apps/web/components/connection/connection.module.css`
- Modify: `apps/web/tests/action-gate.test.tsx`
- Modify: `apps/web/e2e/workspace.spec.ts`

**Interfaces:**
- Consumes: `useDAppKit(dAppKit)`, `useWallets({ dAppKit })`, `isGoogleWallet`, and `isEnokiWallet`.
- Produces: a `ConnectionDialog` that renders the Google wallet when registered, lists detected standard wallets without the provider’s `ConnectButton`, and uses `kit.connectWallet({ wallet })` for every account-entry choice.

- [x] **Step 1: Write failing chooser tests**

Replace the dApp Kit mock in `apps/web/tests/action-gate.test.tsx` with a mutable wallet list and a shared `connectWallet` spy. Add tests that prove:

```tsx
it("renders Google as the primary option and a detected standard wallet as a Coffer action", async () => {
  walletState.wallets = [googleWallet, suiWallet];
  render(<ActionGate actionLabel="Run policy" onConnectedAction={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Run policy" }));

  expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Continue with Suiet" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Connect Sui Wallet" })).not.toBeInTheDocument();
});
```

Add separate assertions for the no-standard-wallet copy and for `connectWallet` receiving the selected wallet. In the Playwright journey, assert the dialog box is centered by comparing its bounding-box center with the viewport center and assert the old `Connect Sui Wallet` trigger is absent.

- [x] **Step 2: Verify red**

Run: `pnpm --filter @coffer/web test -- tests/action-gate.test.tsx`

Expected: FAIL because the current dialog delegates standard-wallet selection to `ConnectButton` and keeps Google disabled in the existing mock.

- [x] **Step 3: Render Coffer-owned choices and center the dialog**

In `connection-control.tsx`:

```tsx
const googleWallet = wallets.find((wallet) => isGoogleWallet(wallet));
const standardWallets = wallets.filter((wallet) => !isEnokiWallet(wallet));

async function connect(wallet: (typeof wallets)[number]) {
  setConnectionError(null);
  try {
    await kit.connectWallet({ wallet });
    onClose();
  } catch {
    setConnectionError("Connection could not be completed. Try again or choose another wallet.");
  }
}
```

Render `Continue with Google` only when both `config.enoki` and `googleWallet` are present. Render each `standardWallets` item as `Continue with {wallet.name}`. If none are present, render `No Sui wallet detected. Install a wallet extension or use Google.` Remove the dynamic `WalletConnectButton` import and delete its file.

In `connection.module.css`, make the overlay robustly centered and scroll-safe:

```css
.backdrop {
  display: grid;
  inset: 0;
  min-height: 100dvh;
  overflow-y: auto;
  place-items: center;
  position: fixed;
  z-index: 100;
}

.dialog {
  margin: 1rem;
  max-height: calc(100dvh - 2rem);
  overflow-y: auto;
}
```

Use Coffer’s forest/cream token palette, a primary Google action, secondary wallet actions, visible focus, and concise configuration/no-wallet/error copy. Do not modify World authorization behavior.

- [x] **Step 4: Verify green**

Run:

```bash
pnpm --filter @coffer/web test -- tests/action-gate.test.tsx
pnpm --filter @coffer/web test:e2e
pnpm --filter @coffer/web lint
pnpm --filter @coffer/web typecheck
```

Expected: component tests and all nine browser journeys pass, including the centered dialog assertion.

- [x] **Step 5: Commit and push**

```bash
git add apps/web/components/connection apps/web/tests/action-gate.test.tsx apps/web/e2e/workspace.spec.ts
git commit -m "feat(web): own account connection experience"
git push origin main
```

### Task 3: Verify the production build

**Files:**
- Modify: `AGENTS.md`

**Interfaces:**
- Consumes: the deployed `main` branch and Vercel Production environment variables.
- Produces: a concise handoff record with the latest sprint, verification commands, and remaining manual Google/World validation.

- [x] **Step 1: Build with non-secret placeholder public values**

Run:

```bash
NEXT_PUBLIC_ENOKI_API_KEY=enoki_public_test NEXT_PUBLIC_GOOGLE_CLIENT_ID=test.apps.googleusercontent.com pnpm --filter @coffer/web build
```

Expected: production build succeeds with public config enabled and no private credential passed to the command.

- [x] **Step 2: Verify final suite**

Run:

```bash
pnpm test
pnpm typecheck
pnpm --filter @coffer/web lint
pnpm web:e2e
git diff --check
```

Expected: all commands exit 0.

- [x] **Step 3: Update handoff and commit**

Add one concise bullet to `AGENTS.md` naming the public-config fix, owned connection chooser, and any remaining external manual verification. Then run:

```bash
git add AGENTS.md
git commit -m "docs(handoff): record connection sprint"
git push origin main
```
