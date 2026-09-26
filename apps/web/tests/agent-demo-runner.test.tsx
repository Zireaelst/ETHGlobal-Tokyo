import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AgentDemoRunner } from "../components/demo/agent-demo-runner";
import {
  DemoSessionProvider,
  useDemoSession,
} from "../components/demo/demo-session-provider";

function RunCount() {
  const { runs } = useDemoSession();
  return <output aria-label="Completed demo runs">{runs.length}</output>;
}

describe("AgentDemoRunner", () => {
  it("runs the visible agent pipeline and commits one shared replay result", async () => {
    const user = userEvent.setup();
    render(
      <DemoSessionProvider persist={false}>
        <AgentDemoRunner stepDelayMs={0} />
        <RunCount />
      </DemoSessionProvider>,
    );

    expect(screen.getByRole("button", { name: "Guided Replay" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await user.click(screen.getByRole("button", { name: /Run agent demo/i }));

    expect(await screen.findByText("Decision complete")).toBeInTheDocument();
    expect(screen.getByLabelText("Completed demo runs")).toHaveTextContent("1");
    expect(screen.getByText("Policy evaluated")).toBeInTheDocument();
    expect(screen.getByText("Historical verified receipt")).toBeInTheDocument();
  });

  it("limits live testnet mode to the approved autonomous scenario", async () => {
    const user = userEvent.setup();
    render(
      <DemoSessionProvider persist={false}>
        <AgentDemoRunner stepDelayMs={0} />
      </DemoSessionProvider>,
    );

    await user.click(screen.getByRole("button", { name: "Live Testnet" }));
    expect(screen.getByRole("button", { name: /Human authorization/i })).toBeDisabled();
    expect(screen.getByText(/fresh request and payment transactions/i)).toBeInTheDocument();
  });
});
