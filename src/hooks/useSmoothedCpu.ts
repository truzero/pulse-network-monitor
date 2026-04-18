import { useMemo, useRef } from "react";
import type { ProcessRow } from "@/schemas/pulse";

/** Rolling mean of the last three CPU samples per PID (stable across polls). */
export function useSmoothedCpu(processes: ProcessRow[]) {
  const metaRef = useRef({ lastKey: "", rings: new Map<number, number[]>() });

  return useMemo(() => {
    const key = processes.map((p) => `${p.pid}:${p.cpu}`).join("|");
    const meta = metaRef.current;
    if (key !== meta.lastKey) {
      meta.lastKey = key;
      const alive = new Set<number>();
      for (const r of processes) {
        alive.add(r.pid);
        const prev = meta.rings.get(r.pid) ?? [];
        meta.rings.set(r.pid, [...prev, r.cpu].slice(-3));
      }
      for (const k of [...meta.rings.keys()]) {
        if (!alive.has(k)) meta.rings.delete(k);
      }
    }

    const out = new Map<number, number>();
    for (const r of processes) {
      const arr = meta.rings.get(r.pid) ?? [r.cpu];
      out.set(
        r.pid,
        arr.reduce((a, b) => a + b, 0) / arr.length,
      );
    }
    return out;
  }, [processes]);
}
