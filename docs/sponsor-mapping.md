# Sponsor mapping

## Sui — DeFi & Payments

Sui is the financial control plane and settlement layer, not a decorative chain integration. Shared objects hold treasury buckets, vendor payment requests, mandates, standing orders, and policy versions. Owned capabilities express admin, vendor, agent, and verifier authority. Programmable transactions make the authorization-ticket mint and exception payment atomic.

Removing Sui would remove the enforceable financial product: there would be no programmable custody, revocable delegated authority, bucket accounting, atomic settlement, or onchain receipts.

## Curvegrid — Best AI Agent Project

The AI agent is the operating actor. It decrypts a real commercial document, extracts invoice facts, compares them to live treasury state, and selects one of four consequences: execute, request human authorization, hold, or reject. Its decision changes whether and how money moves. The LLM performs document interpretation; deterministic policy and Move contracts retain final authority.

MultiBaas is optional in this track and is not used because Coffer settles natively on Sui. Removing the agent would reduce Coffer to manual contract calls and eliminate encrypted invoice understanding, autonomous reconciliation, and proactive workflow behavior.

## World — World ID for Agents

World protects the precise moment when the agent reaches the boundary of delegated authority. It is not login. The backend requests fresh OIDC authorization for an exact action, validates the callback server-side, and only then executes the protected Sui path. Cancellation, invalid state, stale authentication, wrong nonce/audience/issuer, changed action, and replay all prevent payment.

Removing World would force every exception into a conventional manual admin transaction or weaken the human-control story. With World, the human authorizes one action without granting broad treasury access.

## Why the combination is coherent

One workflow naturally needs all three roles: the agent understands and proposes, Sui constrains and settles, and World provides just-in-time human authorization at the mandate boundary. No second chain, cosmetic name, passive score, or dashboard-only integration is present.
