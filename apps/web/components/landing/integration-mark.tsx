import Image from "next/image";

type IntegrationMarkProps = {
  iconSrc?: string;
  label: string;
  symbol: string;
};

export function IntegrationMark({ iconSrc, label, symbol }: IntegrationMarkProps) {
  return (
    <span aria-label={`${label} integration`} title={`${label} integration`}>
      <span aria-hidden="true">
        {iconSrc ? <Image alt="" height={32} src={iconSrc} width={32} /> : symbol}
      </span>
      <span>{label}</span>
    </span>
  );
}
