"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Navigation } from "./navigation";
import { TopBar } from "./top-bar";
import styles from "./app-shell.module.css";

export function AppShell({ children }: Readonly<{ children: ReactNode }>) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const closeOnDesktop = () => {
      if (window.innerWidth >= 960) setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [menuOpen]);

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#workspace-content">
        Skip to workspace content
      </a>
      {menuOpen ? (
        <button
          aria-label="Close workspace navigation"
          className={styles.mobileBackdrop}
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      ) : null}
      <aside className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ""}`}>
        <Link aria-label="Coffer home" className={styles.brand} href="/">
          <Image
            alt=""
            height={44}
            src="/assets/brand/app-icon-dark.webp"
            width={44}
          />
          <span>COFFER</span>
        </Link>
        <Navigation onNavigate={() => setMenuOpen(false)} />
        <div className={styles.railFooter}>
          <span>POLICY ENGINE</span>
          <strong>ACTIVE · v3.2.1</strong>
        </div>
      </aside>
      <div className={styles.workspace}>
        <TopBar menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((value) => !value)} />
        <main className={styles.workspaceContent} id="workspace-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
