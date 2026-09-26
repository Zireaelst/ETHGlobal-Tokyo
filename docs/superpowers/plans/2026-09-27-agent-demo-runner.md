# Coffer Agent Demo Runner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible agent decision pipeline, app-wide demo ledger, optional fresh Sui execution, and a canonical Enoki redirect.

**Architecture:** A client-side provider persists completed demo runs and supplies derived requests, balances, and audit events to workspace screens. A focused demo runner controls the five-stage presentation. A server-only API performs the restricted fresh testnet run when explicitly enabled.

**Tech Stack:** Next.js 16, React 19, Vitest, Sui gRPC, Enoki, workspace policy and Sui client packages.

## Global Constraints

- Never label replay evidence as a fresh transaction.
- Never expose the testnet private key to browser code.
- Live mode supports only the approved autonomous payment path.
- Keep all existing sponsor and privacy claims truthful.

---

### Task 1: Canonical Google redirect

**Files:** `apps/web/lib/sui/dapp-kit.ts`, `apps/web/tests/env.test.ts`

- [ ] Add a failing test for canonical browser redirect construction.
- [ ] Implement a stable `/app/overview` Enoki provider redirect.
- [ ] Run the focused test and commit.

### Task 2: Shared demo ledger and runner

**Files:** `apps/web/lib/demo/session.ts`, `apps/web/components/demo/demo-session-provider.tsx`, `apps/web/components/demo/agent-demo-runner.tsx`, `apps/web/app/app/layout.tsx`, component CSS and tests.

- [ ] Add failing reducer and component tests for a completed replay.
- [ ] Implement persisted run state, the five pipeline stages, mode selection, and clear/reset behavior.
- [ ] Run focused tests and commit.

### Task 3: Cross-workspace projections

**Files:** Overview, Requests, and Audit page/client components plus tests.

- [ ] Add failing tests showing a completed run in balances, request history, and audit history.
- [ ] Consume the shared ledger and derive all three views from the same run.
- [ ] Run focused tests and commit.

### Task 4: Restricted live testnet API

**Files:** `apps/web/app/api/demo/live/route.ts`, `apps/web/lib/demo/live-agent.ts`, package manifest and tests.

- [ ] Add failing validation and disabled-configuration tests.
- [ ] Implement server-only request submission, current-policy evaluation, and autonomous execution.
- [ ] Return fresh Sui evidence and surface errors without converting them into replay success.
- [ ] Run focused tests and commit.

### Task 5: Verification and handoff

- [ ] Run web tests, typecheck, lint, and production build.
- [ ] Update `AGENTS.md` with the completed sprint and required Vercel variables.
- [ ] Push `main`.
