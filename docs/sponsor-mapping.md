# Sponsor mapping

## Sui — DeFi & Payments

Sui is the financial control plane and settlement layer, not a decorative chain integration. Shared objects hold treasury buckets, vendor payment requests, mandates, standing orders, and policy versions. Owned capabilities express admin, vendor, agent, and verifier authority. Programmable transactions make the authorization-ticket mint and exception payment atomic.

Removing Sui would remove the enforceable financial product: there would be no programmable custody, revocable delegated authority, bucket accounting, atomic settlement, or onchain receipts.

## World — World ID for Agents

World protects the precise moment when the agent reaches the boundary of delegated authority. It is not login. The backend requests fresh OIDC authorization for an exact action, validates the callback server-side, and only then executes the protected Sui path. Cancellation, invalid state, stale authentication, wrong nonce/audience/issuer, changed action, and replay all prevent payment.

Removing World would force every exception into a conventional manual admin transaction or weaken the human-control story. With World, the human authorizes one action without granting broad treasury access.

## Why the combination is coherent

One workflow naturally needs both sponsor roles: Sui constrains and settles, while World provides just-in-time human authorization at the mandate boundary. The agent understands the invoice and initiates action, but it never overrides Move. No second chain, cosmetic integration, passive score, or dashboard-only qualification is present.

## Technologies used without a prize application

Seal encrypts commercial document content, Walrus stores ciphertext, and Enoki provides optional zkLogin account access. Curvegrid and MultiBaas are not used and are not part of the prize submission.
