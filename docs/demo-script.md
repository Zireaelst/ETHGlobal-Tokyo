# Coffer demo video script

Target length: **2:45–3:00**. Use slides 1–3 from `Coffer_ETHGlobal_Tokyo_2min_Pitch.pptx`, then switch to the deployed application. Do not use the detailed 12-slide deck in the video.

## Before recording

1. Open the short deck in presentation mode on slide 1.
2. Open `https://eth-global-tokyo-web.vercel.app/app/overview` in a second window.
3. Confirm that Guided Replay works.
4. Use Live Testnet only once. It creates a fresh request and moves 80 DEMO_USD.
5. Keep the known autonomous [SuiScan receipt](https://suiscan.xyz/testnet/tx/4TqsMDLyMhpRb1pnodoSQyrYaoeCu4u6CzQqLJ83txZH) open as fallback.
6. Warm the World gateway at `https://coffer-tokyo-world-gateway.onrender.com/health`.
7. Hide bookmarks, `.env` files, wallet balances, secrets, and unrelated tabs.

## Recording script

### 0:00–0:08 — Slide 1: Product

**On screen:** Short deck, slide 1.

**Say:**

> Coffer is an autonomous treasury on Sui. An agent handles routine financial work, Move enforces its mandate, and a human returns only when the agent reaches a protected boundary.

### 0:08–0:17 — Slide 2: Problem

**On screen:** Advance to slide 2.

**Say:**

> Today, teams either approve every payment manually or give automation too much wallet authority. Coffer adds the missing layer: bounded financial authority.

### 0:17–0:28 — Slide 3: Trust boundaries

**On screen:** Advance to slide 3.

**Say:**

> The agent reads encrypted commercial context, extracts the invoice, evaluates live treasury policy, and chooses one of four outcomes: execute, request authorization, hold, or reject. Move remains the final financial boundary.

### 0:28–0:42 — Overview: Treasury and agent workspace

**On screen:** Switch to `/app/overview`. Briefly point to the three buckets and the Guided Replay / Live Testnet switch.

**Say:**

> This is the operating treasury. Capital is separated into operating, reserve, and vendor committed buckets. The agent has authority through a revocable mandate with vendor, amount, period, bucket, and expiry constraints.

### 0:42–1:20 — Fresh autonomous payment

**On screen:** Select **Live Testnet**, keep **Auto execute**, and press **Run agent demo**. Let the five stages animate. When complete, open the Sui receipt in a new tab for two or three seconds, then return.

**Say while it runs:**

> I am creating a fresh approved invoice request. The agent receives the encrypted document reference, obtains policy-controlled access to its commercial context, turns it into structured payment inputs, and evaluates the current mandate. Because this is an approved vendor and the amount remains inside the autonomous boundary, the agent submits a new Sui payment.

**Say when the receipt appears:**

> This is a fresh testnet transaction, not a dashboard simulation. Move rechecked the vendor policy, timing, bucket, policy version, and mandate before capital moved.

**Fallback:** If Live Testnet is unavailable, switch to Guided Replay, run Auto execute, open the historical verified receipt, and say: “I’m using the verified replay path because the live endpoint is unavailable; this receipt is the prior end-to-end testnet execution.”

### 1:20–1:48 — Meaningful policy stop

**On screen:** Return to Overview. Select **Guided Replay**, choose **Reject** or **Hold**, then run the demo. Point to “No payment transaction.”

**Say:**

> Now the counterparty is outside policy. The agent still interprets the request, but its decision changes execution: no payment transaction is signed and no balance changes. Agent availability affects automation; policy controls custody.

### 1:48–2:23 — Human authorization with World

**On screen:** Open **Approvals**. Show the protected request and its exact amount/action binding. If the sandbox flow is ready, press **Authorize with World**, complete it, and show the authorized result. Otherwise show the existing verified World execution from the request or audit view.

**Say:**

> A material exception crosses the agent’s delegated threshold. Coffer requests a fresh World authorization for one exact treasury, request, vendor, amount, expiry, and nonce. The backend validates the callback and only then executes the protected Sui path. A cancelled, expired, changed, or replayed authorization cannot move funds. Event identities are mocked sandbox identities, not production KYC.

### 2:23–2:42 — Shared operational state

**On screen:** Open **Requests**, then **Audit**. Show the latest demo request and Current Demo Session evidence.

**Say:**

> The decision is operational state, not a chat response. The request, bucket impact, policy result, actor, and transaction evidence propagate across the workspace and remain inspectable.

### 2:42–2:55 — Close

**On screen:** Return to Overview or the landing hero.

**Say:**

> Coffer gives agents a mandate, not a wallet. The agent understands the work, Sui controls the capital, Seal and Walrus protect commercial context, and World restores a human exactly at the risk boundary.

## Claims to keep precise

- Say **commercial document privacy**, not confidential transactions.
- Sui payment amounts and recipient addresses remain public.
- World event identities are mocked sandbox identities.
- Guided Replay uses verified historical evidence and does not claim a fresh transaction.
- Live Testnet creates a new request and payment transaction only for the approved autonomous scenario.
