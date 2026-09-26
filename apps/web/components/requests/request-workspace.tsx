"use client";

import { useOptionalDemoSession } from "../demo/demo-session-provider";
import { DEMO_REQUESTS } from "../../lib/demo/fixtures";
import { runsToRequests } from "../../lib/demo/session";
import { RequestDetailDrawer } from "./request-detail-drawer";
import { RequestTable } from "./request-table";

export function RequestWorkspace({ selectedId }: { selectedId: string | undefined }) {
  const session = useOptionalDemoSession();
  const requests = [...runsToRequests(session?.runs ?? []), ...DEMO_REQUESTS];
  const selected = requests.find((request) => request.id === selectedId);

  return (
    <>
      <RequestTable requests={requests} />
      {selected ? <RequestDetailDrawer request={selected} /> : null}
    </>
  );
}
