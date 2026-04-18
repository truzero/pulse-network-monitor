import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "pulse.settings.v1";

export type PulseSettings = {
  pollingIntervalMs: number;
  filterSystemTasks: boolean;
  alwaysOnTop: boolean;
  backgroundOpacity: number;
  theme: "dark" | "light" | "matrix" | "pulse";
};

const defaults: PulseSettings = {
  pollingIntervalMs: 1000,
  filterSystemTasks: false,
  alwaysOnTop: false,
  backgroundOpacity: 1,
  theme: "dark",
};

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function isTheme(x: unknown): x is PulseSettings["theme"] {
  return x === "dark" || x === "light" || x === "matrix" || x === "pulse";
}

function load(): PulseSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const p = JSON.parse(raw) as Partial<PulseSettings> & { windowOpacity?: unknown };

    return {
      pollingIntervalMs: clamp(
        typeof p.pollingIntervalMs === "number"
          ? p.pollingIntervalMs
          : defaults.pollingIntervalMs,
        200,
        5000,
      ),
      filterSystemTasks:
        typeof p.filterSystemTasks === "boolean"
          ? p.filterSystemTasks
          : defaults.filterSystemTasks,
      alwaysOnTop:
        typeof p.alwaysOnTop === "boolean"
          ? p.alwaysOnTop
          : defaults.alwaysOnTop,
      backgroundOpacity: clamp(
        typeof p.backgroundOpacity === "number"
          ? p.backgroundOpacity
          : typeof p.windowOpacity === "number"
            ? p.windowOpacity
            : defaults.backgroundOpacity,
        0.5,
        1,
      ),
      theme: isTheme(p.theme) ? p.theme : defaults.theme,
    };
  } catch {
    return defaults;
  }
}

export function usePulseSettings() {
  const [settings, setSettings] = useState<PulseSettings>(() => load());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const patch = useCallback((p: Partial<PulseSettings>) => {
    setSettings((s) => ({
      ...s,
      ...p,
      ...(p.pollingIntervalMs !== undefined
        ? { pollingIntervalMs: clamp(p.pollingIntervalMs, 200, 5000) }
        : {}),
      ...(p.backgroundOpacity !== undefined
        ? { backgroundOpacity: clamp(p.backgroundOpacity, 0.5, 1) }
        : {}),
    }));
  }, []);

  return { settings, patch };
}

