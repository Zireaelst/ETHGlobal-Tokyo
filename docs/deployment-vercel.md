# Coffer web deployment on Vercel

Deploy the `codex/coffer-mvp` branch with **Root Directory** set to `apps/web` and the **Next.js** framework preset. The committed `apps/web/vercel.json` installs the monorepo at the repository root and builds only the Coffer web workspace.

## Public Vercel configuration

Add these values to Preview and Production. They are browser-safe configuration only; do not add World secrets, a Sui private key, or an Enoki private key to Vercel.

```dotenv
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_SUI_GRPC_URL=https://fullnode.testnet.sui.io:443
NEXT_PUBLIC_WORLD_GATEWAY_URL=https://coffer-tokyo-world-gateway.onrender.com
NEXT_PUBLIC_ENOKI_API_KEY=<public Enoki zkLogin key>
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<Google OAuth client ID>
```

The last two values are optional: omit either one to keep the standard Sui wallet path while Google zkLogin remains unavailable.

## Connect the existing World gateway

After the first successful Vercel deployment:

1. Copy the exact Vercel origin, without a path.
2. Set Render `WORLD_APP_RETURN_URI` to that origin and redeploy the World gateway.
3. Add that origin to Enoki and Google OAuth allowed origins before testing Google zkLogin.
4. Keep the World portal callback unchanged: `https://coffer-tokyo-world-gateway.onrender.com/api/world/callback`.

World credentials and the demo signer remain on Render. Sandbox World identities are mocked for the event; only the authorization validation and action binding are demonstrated.

## Acceptance check

Open `/app/overview` without a wallet, then `/app/approvals`. Start a fresh World request from a connected account and confirm that the callback lands on `/app/approvals` with an `authorized` status and a SuiScan receipt. For a cancellation or rejection, the page must say **No balance change**.

Run before shipping changes:

```bash
pnpm typecheck
pnpm test
pnpm web:build
pnpm web:e2e
```
