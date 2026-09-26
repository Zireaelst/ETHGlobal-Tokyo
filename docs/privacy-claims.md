# Privacy and trust claims

Coffer uses precise privacy language because these properties are different.

| Property | Coffer status | What it means here |
|---|---|---|
| Transaction confidentiality | **No** | Sui transaction participants, object changes, and payment amounts remain public. Coffer does not use Sui Confidential Transfers. |
| Commercial data privacy | **Yes, for invoice plaintext** | Seal encrypts invoice bytes before Walrus receives them. Walrus stores ciphertext; Sui stores the blob reference and plaintext digest. Authorized decryption is gated by the onchain treasury/mandate policy. |
| Identity privacy | **Limited** | World returns a pairwise OIDC subject and the backend logs only a redacted form. The event sandbox uses mocked identities and is not KYC or a production identity proof. |
| Access control | **Yes** | Sui capabilities, mandate validity/revocation, vendor policy, bucket policy, and Seal approval determine which actions and decryptions are allowed. Access control is not described as privacy. |
| Pseudonymity | **Yes, ordinary chain-level** | Users and vendors act through Sui addresses. This is not anonymity and is separate from World authorization. |
| Compliance screening | **No** | Coffer has policy controls but does not claim sanctions/AML screening. Intercepta was excluded because native Sui coverage was not documented for this event integration. |

## What is actually enforced

- Autonomous execution is capped in Move by mandate validity, revocation, policy version, per-payment limit, period limit, and a separate human-approval threshold.
- Vendor, bucket, maximum amount, and validity constraints are checked again by Move during execution.
- World authorization is bound to one exact treasury, request, vendor, amount, expiry, and nonce; a changed action has a different digest.
- Authorization tickets are consumed atomically with payment and cannot be replayed.
- Decryption fails closed when Walrus is unavailable, Seal denies access, or the decrypted plaintext digest differs from the onchain commitment.

## Experimental and production caveats

The package is unaudited hackathon code on Sui testnet. Walrus testnet and the World event sandbox are used. The World event environment uses fake/mock identities. The agent signer is server-held for the demo; a production deployment should use an HSM/MPC signer, durable authorization storage, monitored key rotation, and an audited Move package.
