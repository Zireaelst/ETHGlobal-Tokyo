import type { DataSource } from "../../lib/requests/model";

const labels: Record<DataSource, string> = {
  live: "Live testnet",
  verified: "Verified testnet run",
  demo: "Demo workspace data",
};

export function DataSourceBadge({ source }: { source: DataSource }) {
  return <span data-source={source}>{labels[source]}</span>;
}
