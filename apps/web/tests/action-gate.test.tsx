import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionGate } from "../components/connection/action-gate";

const walletState = vi.hoisted(() => ({ connected: false }));

vi.mock("@mysten/dapp-kit-react", () => ({
  createDAppKit: () => ({ stores: { $currentNetwork: { get: () => "testnet" } } }),
  useDAppKit: () => ({ connectWallet: vi.fn(), disconnectWallet: vi.fn() }),
  useWalletConnection: () => walletState.connected
    ? { isConnected: true, account: { address: "0x1234567890abcdef" }, wallet: { name: "Test wallet" }, status: "connected" }
    : { isConnected: false, account: null, wallet: null, status: "disconnected" },
  useWallets: () => [],
}));

vi.mock("@mysten/dapp-kit-react/ui", () => ({
  ConnectButton: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <button type="button">Connect Sui Wallet</button>,
}));

describe("ActionGate", () => {
  afterEach(() => {
    walletState.connected = false;
    delete process.env.NEXT_PUBLIC_ENOKI_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  });

  it("leaves browsing content available without an account", () => {
    render(<div><p>Treasury content</p><ActionGate actionLabel="Run policy" onConnectedAction={vi.fn()} /></div>);

    expect(screen.getByText("Treasury content")).toBeVisible();
    expect(screen.getByRole("button", { name: "Run policy" })).toBeEnabled();
  });

  it("offers Google and standard Sui wallet paths for a protected action", async () => {
    const user = userEvent.setup();
    render(<ActionGate actionLabel="Run policy" onConnectedAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run policy" }));

    expect(screen.getByRole("dialog", { name: "Connect to run policy" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeDisabled();
    expect(screen.getByText("Google sign-in is unavailable until Enoki public configuration is added.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Connect Sui Wallet" })).toBeEnabled();
  });

  it("runs a protected action exactly once for a connected account", async () => {
    walletState.connected = true;
    const onConnectedAction = vi.fn();
    const user = userEvent.setup();
    render(<ActionGate actionLabel="Run policy" onConnectedAction={onConnectedAction} />);

    await user.click(screen.getByRole("button", { name: "Run policy" }));

    expect(onConnectedAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
