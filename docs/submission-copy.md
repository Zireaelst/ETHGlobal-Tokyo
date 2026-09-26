# ETHGlobal submission copy

## Sui — DeFi & Payments

### Why Coffer is applicable

Coffer uses Sui as its financial control plane, not only as a settlement destination. Move contracts hold bucketed treasury capital and enforce revocable agent mandates, vendor permissions, per-payment and period limits, policy versions, timing, replay protection, and atomic payment receipts.

### Code link

https://github.com/Zireaelst/ETHGlobal-Tokyo/blob/main/move/coffer/sources/payment_request.move#L134-L217

Additional mandate enforcement:

https://github.com/Zireaelst/ETHGlobal-Tokyo/blob/main/move/coffer/sources/mandate.move#L116-L149

### Ease of use

**8 / 10**

### Sponsor feedback

Sui's object and capability model mapped naturally to treasury buckets, revocable delegation, vendor permissions, and single-use authorization tickets. Programmable transactions and the TypeScript gRPC SDK made atomic execution and testnet evidence straightforward. The largest integration cost was aligning rapidly changing SDK versions and assembling an end-to-end example across Move, Seal, Walrus, and a server-side agent. More complete reference applications that combine those components would shorten implementation time significantly.

## World — Best Use of World ID for Agents

### Why Coffer is applicable

Coffer invokes World at the exact moment an autonomous treasury agent reaches its delegated spending boundary. The server requests fresh authorization for one action, validates the OIDC callback and action digest, and executes the protected Sui payment only after successful verification; cancelled, expired, invalid, or replayed callbacks leave funds untouched.

### Code link

https://github.com/Zireaelst/ETHGlobal-Tokyo/blob/main/packages/world-auth/src/gateway.ts#L184-L267

Action-bound verification implementation:

https://github.com/Zireaelst/ETHGlobal-Tokyo/blob/main/packages/world-auth/src/verifier.ts

### Ease of use

**7 / 10**

### Sponsor feedback

The World agent sandbox made the fresh human authorization flow easy to explain, and standard OIDC allowed us to validate the result on the server instead of trusting the browser. Exact redirect matching is a good security default. The immutable sector hostname and migration from a temporary tunnel to stable hosting were less obvious, and action binding required custom digest and replay-protection code. First-class documentation for binding an authorization to an arbitrary transaction payload would improve the agent integration path.

## Other partner technologies used

Select these if the submission form lists them:

- **Seal** — encrypts invoice and contract content under a Sui-controlled access policy.
- **Walrus** — stores ciphertext; plaintext is never uploaded.
- **Enoki / zkLogin** — optional Google account access for users without a traditional Sui wallet.

Do **not** select Curvegrid or MultiBaas. Coffer does not use Curvegrid technology, and we are not applying for its prize. Do not select Intercepta; native Sui screening was not integrated.
