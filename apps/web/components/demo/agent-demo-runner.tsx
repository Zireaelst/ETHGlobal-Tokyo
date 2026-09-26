"use client";

import { useState } from "react";
import { TESTNET_DEPLOYMENT, suiScanTransactionUrl } from "../../lib/deployment";
import {
  buildDemoRun,
  type DemoMode,
  type DemoScenario,
} from "../../lib/demo/session";
import { useDemoSession } from "./demo-session-provider";
import styles from "./agent-demo-runner.module.css";

const stages = [
  ["01", "Request ingested", "Payment intent and encrypted document reference received."],
  ["02", "Commercial context accessed", "Seal policy grants minimum document access; Walrus supplies ciphertext."],
  ["03", "Invoice extracted", "Amount, due date, vendor and confidence become structured inputs."],
  ["04", "Policy evaluated", "Mandate, counterparty, bucket, period and threshold checks run."],
  ["05", "Action selected", "The agent executes, escalates, holds or rejects without rewriting policy."],
] as const;

const scenarios: Array<{ value: DemoScenario; label: string }> = [
  { value: "auto_execute", label: "Auto execute" },
  { value: "human_authorization", label: "Human authorization" },
  { value: "hold", label: "Hold" },
  { value: "reject", label: "Reject" },
];

type LiveRunResponse = {
  requestId: string;
  submitDigest: string;
  executionDigest: string;
};

function wait(duration: number) {
  return new Promise((resolve) => window.setTimeout(resolve, duration));
}

export function AgentDemoRunner({ stepDelayMs = 480 }: { stepDelayMs?: number }) {
  const { addRun, clearRuns, runs } = useDemoSession();
  const [mode, setMode] = useState<DemoMode>("replay");
  const [scenario, setScenario] = useState<DemoScenario>("auto_execute");
  const [activeStage, setActiveStage] = useState(-1);
  const [status, setStatus] = useState<"idle" | "running" | "complete" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [latestDigest, setLatestDigest] = useState<string | null>(null);

  function chooseMode(nextMode: DemoMode) {
    setMode(nextMode);
    setStatus("idle");
    setMessage(null);
    setLatestDigest(null);
    if (nextMode === "live") setScenario("auto_execute");
  }

  async function runDemo() {
    setStatus("running");
    setMessage(null);
    setLatestDigest(null);
    for (let index = 0; index < stages.length; index += 1) {
      setActiveStage(index);
      await wait(stepDelayMs);
    }

    try {
      if (mode === "live") {
        const response = await fetch("/api/demo/live", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scenario: "auto_execute" }),
        });
        const payload = (await response.json()) as LiveRunResponse & { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Live testnet run failed.");
        addRun(buildDemoRun({
          mode,
          scenario,
          requestId: payload.requestId,
          submitDigest: payload.submitDigest,
          executionDigest: payload.executionDigest,
        }));
        setLatestDigest(payload.executionDigest);
        setMessage("Fresh request evaluated and executed on Sui testnet.");
      } else {
        const executionDigest =
          scenario === "auto_execute"
            ? TESTNET_DEPLOYMENT.agentDemo.executionDigest
            : scenario === "human_authorization"
              ? TESTNET_DEPLOYMENT.worldDemo.executionDigest
              : undefined;
        addRun(buildDemoRun({ mode, scenario, executionDigest }));
        setLatestDigest(executionDigest ?? null);
        setMessage(
          executionDigest
            ? "Historical verified receipt"
            : "Policy stopped payment before signing — no balance change.",
        );
      }
      setStatus("complete");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Agent run failed.");
    }
  }

  return (
    <section aria-label="Agent demo workspace" className={styles.runner}>
      <header>
        <div><p>LIVE AGENT WORKSPACE</p><h2>Watch policy become action.</h2></div>
        <div className={styles.modeSwitch}>
          <button aria-pressed={mode === "replay"} onClick={() => chooseMode("replay")} type="button">Guided Replay</button>
          <button aria-pressed={mode === "live"} onClick={() => chooseMode("live")} type="button">Live Testnet</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.controls}>
          <span>SELECT OUTCOME</span>
          <div className={styles.scenarios}>
            {scenarios.map((item) => (
              <button
                aria-pressed={scenario === item.value}
                disabled={mode === "live" && item.value !== "auto_execute"}
                key={item.value}
                onClick={() => setScenario(item.value)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <p>
            {mode === "live"
              ? "Creates fresh request and payment transactions using the restricted approved-vendor path."
              : "Replays all four outcomes against verified evidence without claiming a fresh transaction."}
          </p>
          <button className={styles.runButton} disabled={status === "running"} onClick={() => void runDemo()} type="button">
            {status === "running" ? "Agent running…" : "Run agent demo"} <span aria-hidden="true">→</span>
          </button>
          {runs.length ? <button className={styles.resetButton} onClick={clearRuns} type="button">Reset workspace runs</button> : null}
        </div>

        <ol className={styles.pipeline}>
          {stages.map(([number, label, detail], index) => (
            <li data-active={index === activeStage && status === "running"} data-complete={status === "complete" || index < activeStage} key={number}>
              <i>{number}</i><div><strong>{label}</strong><span>{detail}</span></div>
            </li>
          ))}
        </ol>
      </div>

      {status === "complete" || status === "error" ? (
        <footer data-error={status === "error"}>
          <div><span>{status === "complete" ? "Decision complete" : "Run unavailable"}</span><strong>{message}</strong></div>
          {latestDigest ? <a href={suiScanTransactionUrl(latestDigest)} rel="noreferrer" target="_blank">Open Sui receipt ↗</a> : <span>No payment transaction</span>}
        </footer>
      ) : null}
    </section>
  );
}
