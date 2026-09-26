"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./app-shell.module.css";

const operationalRoutes = [
  ["Overview", "/app/overview", "⌂"],
  ["Payment Requests", "/app/requests", "↗"],
  ["Approvals", "/app/approvals", "✓"],
  ["Mandates", "/app/mandates", "◇"],
  ["Standing Orders", "/app/standing-orders", "↻"],
  ["Audit", "/app/audit", "≡"],
] as const;

const institutionalRoutes = [
  ["Vendors", "/app/vendors", "V"],
  ["Documents", "/app/documents", "D"],
  ["Policies", "/app/policies", "P"],
  ["Users", "/app/users", "U"],
  ["Settings", "/app/settings", "⚙"],
] as const;

type NavigationProps = {
  onNavigate?: () => void;
};

export function Navigation({ onNavigate }: NavigationProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Workspace" className={styles.navigation}>
      <div className={styles.navGroup}>
        <p>OPERATIONS</p>
        {operationalRoutes.map(([label, href, symbol]) => (
          <Link
            aria-current={pathname === href ? "page" : undefined}
            href={href}
            key={href}
            onClick={() => onNavigate?.()}
          >
            <span aria-hidden="true">{symbol}</span>
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className={styles.navGroup}>
        <p>INSTITUTION</p>
        {institutionalRoutes.map(([label, href, symbol]) => (
          <Link
            aria-current={pathname === href ? "page" : undefined}
            href={href}
            key={href}
            onClick={() => onNavigate?.()}
          >
            <span aria-hidden="true">{symbol}</span>
            <span>{label}</span>
            <small>Read-only</small>
          </Link>
        ))}
      </div>
    </nav>
  );
}
