"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useState } from "react";
import { MobileMenu, type LandingNavItem } from "./mobile-menu";
import styles from "./landing-header.module.css";

const navigation: readonly LandingNavItem[] = [
  { href: "#product", label: "Product" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#security", label: "Security" },
  { href: "#docs", label: "Docs" },
];

export function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const setOpen = useCallback((open: boolean) => setMenuOpen(open), []);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link aria-label="Coffer home" className={styles.logo} href="/">
          <Image
            alt=""
            height={56}
            priority
            src="/assets/brand/app-icon-dark.webp"
            width={56}
          />
        </Link>

        <nav aria-label="Primary" className={styles.desktopNavigation}>
          {navigation.map((item, index) => (
            <a className={index === 0 ? styles.activeLink : undefined} href={item.href} key={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <Link className={styles.launch} href="/app/overview">
          Launch App <span aria-hidden="true">↗</span>
        </Link>

        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          className={`${styles.menuButton} ${menuOpen ? styles.menuButtonOpen : ""}`}
          onClick={() => setMenuOpen((current) => !current)}
          type="button"
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <MobileMenu items={navigation} onOpenChange={setOpen} open={menuOpen} />
    </header>
  );
}
