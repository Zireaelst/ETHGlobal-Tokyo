# Three-minute demo script

## 0:00–0:25 — The problem and the mandate

“Coffer lets a finance team delegate routine treasury work to an AI agent without delegating unlimited custody.” Show three buckets—operating, reserve, vendor committed—and the agent mandate: approved vendor, 250 DEMO_USD human threshold, 500 per-payment cap, 2,000 period cap, expiry, and revocation.

## 0:25–1:10 — Autonomous success

Open an 80 DEMO_USD invoice. Point out that the readable invoice is not public: Walrus holds Seal ciphertext and Sui holds the commitment. Trigger the agent. Show the sequence: authorized decrypt → structured extraction → live policy checks → `AUTO_EXECUTE` → Sui digest. Refresh the bucket and vendor receipt.

Judge takeaway: the agent did useful work and moved funds, but only inside enforceable authority.

## 1:10–1:40 — A meaningful stop

Open a request with either low extraction confidence, an invalid vendor, or insufficient bucket balance. Trigger it and show `HOLD` or `HUMAN_AUTH_REQUIRED` with a specific reason. Confirm there is no payment digest and the balance did not change.

Judge takeaway: this is not an AI chatbot and not unconditional automation; the decision changes execution.

## 1:40–2:40 — Fresh World authorization

Open a 300 DEMO_USD request. The vendor and invoice may be valid, but the amount exceeds the 250 autonomous threshold. Show `HUMAN_APPROVAL_THRESHOLD_EXCEEDED`, then open the returned World authorization URL. Approve in the event sandbox. The callback validates server-side and executes the exact action. Show the Sui receipt and changed bucket balance.

Then explain the negative path in one sentence: cancellation, expiry, invalid callback, or a changed amount prevents ticket creation and payment. If time permits, cancel a second authorization and show the unchanged balance.

## 2:40–3:00 — Close

Show the audit timeline: encrypted invoice read, policy version, agent decision, human authorization where required, and Sui digest. Close with: “The model understands invoices; Move controls capital; World restores a human at exactly the risk boundary.”

## Demo safety checklist

- Warm the hosted gateway by opening `/health` two minutes before presenting.
- Pre-fund Sui gas and verify the testnet RPC.
- Keep one already-confirmed SuiScan proof as fallback.
- Never expose `.env`, the Sui private key, World client secret, or full World subject.
- Describe the World event identity as mocked, and do not claim KYC.
- Do not claim transaction confidentiality: only commercial invoice data is encrypted.
