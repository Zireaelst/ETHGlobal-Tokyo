import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ActionGate } from "../components/connection/action-gate";

const walletState = vi.hoisted(() => ({
  connected: false,
  wallets: [] as Array<{ kind: "google" | "sui"; name: string }>,
  connectWallet: vi.fn(),
}));

const configurationState = vi.hoisted(() => ({ enoki: false }));

vi.mock("@mysten/dapp-kit-react", () => ({
  createDAppKit: () => ({ stores: { $currentNetwork: { get: () => "testnet" } } }),
  useDAppKit: () => ({ connectWallet: walletState.connectWallet, disconnectWallet: vi.fn() }),
  useWalletConnection: () => walletState.connected
    ? { isConnected: true, account: { address: "0x1234567890abcdef" }, wallet: { name: "Test wallet" }, status: "connected" }
    : { isConnected: false, account: null, wallet: null, status: "disconnected" },
  useWallets: () => walletState.wallets,
}));

vi.mock("@mysten/enoki", () => ({
  isGoogleWallet: (wallet: { kind?: string }) => wallet.kind === "google",
  isEnokiWallet: (wallet: { kind?: string }) => wallet.kind === "google",
  registerEnokiWallets: vi.fn(),
}));

vi.mock("../lib/env", () => ({
  getPublicConfig: () => configurationState.enoki
    ? {
        network: "testnet",
        grpcUrl: "https://fullnode.testnet.sui.io:443",
        enoki: { apiKey: "enoki_public_test", googleClientId: "test.apps.googleusercontent.com" },
      }
    : { network: "testnet", grpcUrl: "https://fullnode.testnet.sui.io:443" },
}));

vi.mock("next/dynamic", () => ({
  default: () => () => <button type="button">Connect Sui Wallet</button>,
}));

const googleWallet = { kind: "google", name: "Google" } as never;
const suiWallet = { kind: "sui", name: "Suiet" } as never;

describe("ActionGate", () => {
  afterEach(() => {
    configurationState.enoki = false;
    walletState.connected = false;
    walletState.wallets = [];
    walletState.connectWallet.mockReset();
  });

  it("leaves browsing content available without an account", () => {
    render(<div><p>Treasury content</p><ActionGate actionLabel="Run policy" onConnectedAction={vi.fn()} /></div>);

    expect(screen.getByText("Treasury content")).toBeVisible();
    expect(screen.getByRole("button", { name: "Run policy" })).toBeEnabled();
  });

  it("renders Google as the primary option and a detected standard wallet as a Coffer action", async () => {
    configurationState.enoki = true;
    walletState.wallets = [googleWallet, suiWallet] as never;
    const user = userEvent.setup();
    render(<ActionGate actionLabel="Run policy" onConnectedAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run policy" }));

    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Continue with Suiet" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Connect Sui Wallet" })).not.toBeInTheDocument();
  });

  it("explains the no-wallet state without rendering a disabled Google action", async () => {
    const user = userEvent.setup();
    render(<ActionGate actionLabel="Run policy" onConnectedAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run policy" }));

    expect(screen.getByText("No Sui wallet detected. Install a wallet extension or use Google.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Continue with Google" })).not.toBeInTheDocument();
    expect(screen.getByText("Google sign-in needs public Enoki configuration.")).toBeVisible();
  });

  it("connects the exact account path selected by the user", async () => {
    configurationState.enoki = true;
    walletState.wallets = [googleWallet, suiWallet] as never;
    const user = userEvent.setup();
    render(<ActionGate actionLabel="Run policy" onConnectedAction={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Run policy" }));
    await user.click(screen.getByRole("button", { name: "Continue with Suiet" }));

    expect(walletState.connectWallet).toHaveBeenCalledWith({ wallet: suiWallet });
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
