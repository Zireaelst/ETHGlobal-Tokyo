# Free stable World gateway deployment

Render is used only for the server-side World callback and protected Sui execution. The included Blueprint deploys the existing long-running Node server without a serverless state-store rewrite and gives it a stable HTTPS hostname.

## 1. Push the repository

Push the branch containing `render.yaml` to GitHub. In Render, choose **New → Blueprint**, connect the repository, and select that branch. The service name is `coffer-tokyo-world-gateway`; if available, its URL will be:

`https://coffer-tokyo-world-gateway.onrender.com`

If Render changes the name, use the actual hostname it assigns.

## 2. Configure server-only environment variables

Set these in Render; never prefix them with `NEXT_PUBLIC_` and never paste them into frontend code:

- `COFFER_TESTNET_PRIVATE_KEY` — funded demo-only Sui testnet signer.
- `WORLD_OIDC_ISSUER` — `https://sandbox.auth.world.org`.
- `WORLD_OIDC_CLIENT_ID` and `WORLD_OIDC_CLIENT_SECRET` — from the dedicated stable-host World app.
- `WORLD_OIDC_REDIRECT_URI` — exact stable callback, for example `https://coffer-tokyo-world-gateway.onrender.com/api/world/callback`.
- `WORLD_OIDC_MAX_AGE_SECONDS` — `120`.

The repository already supplies the public Sui testnet RPC and health path.

## 3. Create the final World app

Because a World app's sector cannot be changed, create a new app for the stable Render hostname instead of editing the temporary tunnel app across hostnames.

- App name: `Coffer`
- Redirect URI: the exact Render URL plus `/api/world/callback`
- Authentication method: `Client secret (Basic)`
- Sector identifier URI: leave empty when only this hostname is used

Copy the new client ID/secret into Render and redeploy. The secret must remain server-side.

## 4. Verify

Open `/health`; the expected body is `{"status":"ok"}`. Start an authorization by POSTing an exact action to `/api/world/authorize`; the response must include `authorizationUrl`, `state`, and `actionDigest`.

Free Render web services can sleep after inactivity and have an ephemeral filesystem. Coffer's authorization store is currently in memory, which is adequate for an immediate hackathon callback but not production durability. Warm `/health` before the demo and complete each World flow promptly. Production should move pending OIDC state and replay records to durable libSQL/Postgres/Redis storage.
