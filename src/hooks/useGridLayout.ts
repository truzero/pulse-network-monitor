import { useCallback, useEffect, useState } from "react";

export type GridColumnKey = "pid" | "process" | "cpu" | "mem";

export type GridLayout = {
  cols: Record<GridColumnKey, number>;
};

const STORAGE_KEY = "pulse.gridLayout.v1";

const defaults: GridLayout = {
  cols: {
    pid: 72,
    process: 160,
    cpu: 72,
    mem: 84,
  },
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function load(): GridLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const p = JSON.parse(raw) as Partial<GridLayout>;
    const cols = (p.cols ?? {}) as Partial<Record<GridColumnKey, number>>;

    return {
      cols: {
        pid: clamp(typeof cols.pid === "number" ? cols.pid : defaults.cols.pid, 50, 140),
        process: clamp(
          typeof cols.process === "number" ? cols.process : defaults.cols.process,
          110,
          380,
        ),
        cpu: clamp(typeof cols.cpu === "number" ? cols.cpu : defaults.cols.cpu, 60, 160),
        mem: clamp(typeof cols.mem === "number" ? cols.mem : defaults.cols.mem, 70, 180),
      },
    };
  } catch {
    return defaults;
  }
}

export function useGridLayout() {
  const [layout, setLayout] = useState<GridLayout>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  }, [layout]);

  const setColWidth = useCallback((key: GridColumnKey, px: number) => {
    setLayout((s) => ({
      cols: {
        ...s.cols,
        [key]: px,
      },
    }));
  }, []);

  return { layout, setColWidth };
}

