type IntegrationMarkProps = {
  label: string;
  symbol: string;
};

export function IntegrationMark({ label, symbol }: IntegrationMarkProps) {
  return (
    <span aria-label={`${label} integration`} title={`${label} — temporary text mark`}>
      <span aria-hidden="true">{symbol}</span>
      <span>{label}</span>
    </span>
  );
}
