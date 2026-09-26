"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DemoRun } from "../../lib/demo/session";

const STORAGE_KEY = "coffer:agent-demo-runs";

type DemoSessionValue = {
  runs: readonly DemoRun[];
  addRun(run: DemoRun): void;
  clearRuns(): void;
};

const DemoSessionContext = createContext<DemoSessionValue | null>(null);

export function DemoSessionProvider({
  children,
  persist = true,
}: Readonly<{ children: ReactNode; persist?: boolean }>) {
  const [runs, setRuns] = useState<DemoRun[]>([]);

  useEffect(() => {
    if (!persist) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setRuns(JSON.parse(stored) as DemoRun[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [persist]);

  useEffect(() => {
    if (!persist) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  }, [persist, runs]);

  const addRun = useCallback((run: DemoRun) => {
    setRuns((current) => [...current, run]);
  }, []);
  const clearRuns = useCallback(() => setRuns([]), []);
  const value = useMemo(() => ({ runs, addRun, clearRuns }), [addRun, clearRuns, runs]);

  return <DemoSessionContext.Provider value={value}>{children}</DemoSessionContext.Provider>;
}

export function useDemoSession() {
  const value = useContext(DemoSessionContext);
  if (!value) throw new Error("useDemoSession must be used inside DemoSessionProvider");
  return value;
}

export function useOptionalDemoSession() {
  return useContext(DemoSessionContext);
}
