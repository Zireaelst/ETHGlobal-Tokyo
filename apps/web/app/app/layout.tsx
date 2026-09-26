import type { ReactNode } from "react";
import { AppShell } from "../../components/app-shell/app-shell";
import { DemoSessionProvider } from "../../components/demo/demo-session-provider";

export default function WorkspaceLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <DemoSessionProvider><AppShell>{children}</AppShell></DemoSessionProvider>;
}
