import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pulse.killHistory.v1";

export type KillEntry = {
  pid: number;
  name?: string;
  at: number;
};

function load(): KillEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as KillEntry[];
    if (!Array.isArray(p)) return [];
    return p
      .filter((e) => typeof e?.pid === "number" && typeof e?.at === "number")
      .slice(0, 5);
  } catch {
    return [];
  }
}

export function useKillHistory() {
  const [entries, setEntries] = useState<KillEntry[]>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 5)));
  }, [entries]);

  const recordKill = useCallback((pid: number, name?: string) => {
    setEntries((prev) => {
      const next = [{ pid, name, at: Date.now() }, ...prev];
      const dedup: KillEntry[] = [];
      const seen = new Set<number>();
      for (const e of next) {
        if (seen.has(e.pid)) continue;
        seen.add(e.pid);
        dedup.push(e);
        if (dedup.length >= 5) break;
      }
      return dedup;
    });
  }, []);

  return { entries, recordKill };
}

