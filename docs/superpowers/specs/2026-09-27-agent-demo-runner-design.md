# Coffer Agent Demo Runner Design

## Goal

Make Coffer's agentic behavior visible and verifiable from the Overview while keeping the demo reliable enough to record under hackathon conditions.

## Experience

Overview offers two explicit modes. Guided Replay runs one of the four policy outcomes using verified historical evidence and labels it as a replay. Live Testnet submits a fresh approved 80 DEMO_USD request, evaluates it against current Sui state, and executes it with the server-held agent signer when live demo configuration is enabled.

The UI displays the same five-stage pipeline in both modes: request ingestion, commercial-context access, invoice extraction, policy evaluation, and action. A completed run is added to a shared browser ledger. Overview balances and activity, Requests, and Audit consume that ledger so they update together.

## Truthfulness and safety

- Replay never claims to create a fresh transaction.
- Live execution returns fresh submit and execution digests from Sui testnet.
- Hold and reject mean no payment transaction; this is displayed as policy enforcement.
- Live mode is restricted to the existing approved-vendor scenario and requires private server configuration.
- Seal/Walrus protect commercial document contents, not transaction amount or recipient.
- Google Enoki always uses one canonical `/app/overview` redirect URI.

## Verification

Component tests cover mode selection, pipeline completion, shared ledger updates, and redirect configuration. API tests cover disabled live mode and input validation. Existing workspace and connection tests must remain green.
