"use client";

import Link from "next/link";
import { useEffect } from "react";
import styles from "./landing-header.module.css";

export type LandingNavItem = {
  href: string;
  label: string;
};

type MobileMenuProps = {
  items: readonly LandingNavItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileMenu({ items, open, onOpenChange }: MobileMenuProps) {
  useEffect(() => {
    if (!open) return;

    document.body.classList.add("menu-open");
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    const closeAboveBreakpoint = () => {
      if (window.innerWidth > 720) onOpenChange(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeAboveBreakpoint);
    return () => {
      document.body.classList.remove("menu-open");
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeAboveBreakpoint);
    };
  }, [onOpenChange, open]);

  if (!open) return null;

  return (
    <div
      className={styles.mobileOverlay}
      data-testid="menu-overlay"
      onClick={() => onOpenChange(false)}
    >
      <div
        aria-label="Mobile navigation"
        aria-modal="true"
        className={styles.mobileSheet}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <nav aria-label="Mobile" className={styles.mobileNavigation}>
          {items.map((item) => (
            <a href={item.href} key={item.href} onClick={() => onOpenChange(false)}>
              {item.label}
            </a>
          ))}
          <Link className={styles.mobileLaunch} href="/app/overview">
            Launch App <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
