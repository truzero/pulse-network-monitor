import { AnimatePresence, motion } from "framer-motion";
import type { KillEntry } from "@/hooks/useKillHistory";
import type { PulseSettings } from "@/hooks/usePulseSettings";
import type { PulseSnapshot } from "@/schemas/pulse";

type Props = {
  open: boolean;
  onClose: () => void;
  settings: PulseSettings;
  onChange: (p: Partial<PulseSettings>) => void;
  snap?: PulseSnapshot | null;
  killHistory: KillEntry[];
  /** When true, About block is shown (toggled from footer branding). */
  showAbout?: boolean;
};

export function SettingsPanel({
  open,
  onClose,
  settings,
  onChange,
  snap,
  killHistory,
  showAbout = false,
}: Props) {
  const total = snap?.totalMemory ?? 0;
  const used = snap?.usedMemory ?? 0;
  const avail = Math.max(0, total - used);
  const pct = total > 0 ? used / total : 0;
  const mode = import.meta.env.MODE;

  const diagnostics = [
    "Pulse",
    `mode: ${mode}`,
    `theme: ${settings.theme}`,
    `polling: ${settings.pollingIntervalMs}ms`,
    `filterSystemTasks: ${settings.filterSystemTasks}`,
    `alwaysOnTop: ${settings.alwaysOnTop}`,
    `backgroundOpacity: ${settings.backgroundOpacity}`,
    snap
      ? `memory: ${(used / 1024 / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024 / 1024).toFixed(1)} gb`
      : "memory: (no snapshot yet)",
  ].join("\n");

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close settings"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-[min(100%,340px)] flex-col border-l border-[color:var(--pulse-line)] bg-[color:var(--pulse-panel-bg)] p-5 font-sans text-sm text-[color:var(--pulse-fg)] shadow-2xl backdrop-blur-xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--pulse-muted)]">
                Settings
              </span>
              <button
                type="button"
                className="text-[color:var(--pulse-muted)] hover:text-[color:var(--pulse-fg-dim)]"
                onClick={onClose}
              >
                Done
              </button>
            </div>

            <div className="mb-6">
              <div className="mb-2 text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
                System health
              </div>
              <div className="mb-2 h-2 w-full overflow-hidden rounded bg-[color:color-mix(in_srgb,var(--pulse-line)_70%,transparent)]">
                <div
                  className="h-full bg-[color:color-mix(in_srgb,var(--pulse-accent)_45%,transparent)]"
                  style={{ width: `${Math.round(pct * 100)}%` }}
                />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-[color:var(--pulse-fg-muted)]">
                <span>used {(used / 1024 / 1024 / 1024).toFixed(1)} gb</span>
                <span>avail {(avail / 1024 / 1024 / 1024).toFixed(1)} gb</span>
              </div>
            </div>

            <label className="mb-5 block">
              <span className="mb-2 block text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
                Polling interval
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={200}
                  max={5000}
                  step={50}
                  value={settings.pollingIntervalMs}
                  onChange={(e) =>
                    onChange({ pollingIntervalMs: Number(e.target.value) })
                  }
                  className="flex-1"
                  style={{ accentColor: "var(--pulse-accent)" }}
                />
                <span className="min-w-[4rem] font-mono text-xs text-[color:var(--pulse-fg-muted)]">
                  {settings.pollingIntervalMs} ms
                </span>
              </div>
            </label>

            <label className="mb-5 flex cursor-pointer items-center justify-between gap-4">
              <span className="text-[11px] text-[color:var(--pulse-fg-muted)]">
                Filter system tasks
              </span>
              <input
                type="checkbox"
                checked={settings.filterSystemTasks}
                onChange={(e) =>
                  onChange({ filterSystemTasks: e.target.checked })
                }
                className="size-4 rounded border-[color:var(--pulse-line)]"
                style={{ accentColor: "var(--pulse-accent)" }}
              />
            </label>

            <label className="mb-5 flex cursor-pointer items-center justify-between gap-4">
              <span className="text-[11px] text-[color:var(--pulse-fg-muted)]">
                Always on top
              </span>
              <input
                type="checkbox"
                checked={settings.alwaysOnTop}
                onChange={(e) => onChange({ alwaysOnTop: e.target.checked })}
                className="size-4 rounded border-[color:var(--pulse-line)]"
                style={{ accentColor: "var(--pulse-accent)" }}
              />
            </label>

            <label className="mb-6 block">
              <span className="mb-2 block text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
                Background opacity
              </span>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={settings.backgroundOpacity}
                  onChange={(e) =>
                    onChange({ backgroundOpacity: Number(e.target.value) })
                  }
                  className="flex-1"
                  style={{ accentColor: "var(--pulse-accent)" }}
                />
                <span className="min-w-[3.5rem] font-mono text-xs text-[color:var(--pulse-fg-muted)]">
                  {Math.round(settings.backgroundOpacity * 100)}%
                </span>
              </div>
            </label>

            <div className="mb-6">
              <div className="mb-2 text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
                Theme
              </div>
              <div className="flex flex-wrap gap-2">
                {(["light", "dark", "matrix", "pulse"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onChange({ theme: t })}
                    className={
                      "rounded-md border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-[box-shadow,outline-color] " +
                      (t === "light"
                        ? "theme-chip-light border-neutral-300"
                        : t === "dark"
                          ? "theme-chip-dark border-cyan-500/30"
                          : t === "matrix"
                            ? "theme-chip-matrix"
                            : "theme-chip-pulse") +
                      (settings.theme === t ? " theme-chip-active" : "")
                    }
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto">
              {showAbout && (
                <div className="mb-6">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
                      About
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void navigator.clipboard.writeText(diagnostics)
                      }
                      className="rounded-md border border-[color:var(--pulse-line)] px-2 py-1 font-sans text-[10px] uppercase tracking-[0.18em] text-[color:var(--pulse-muted)] hover:text-[color:var(--pulse-fg-dim)]"
                      style={{
                        backgroundColor: "rgba(255,255,255,var(--pulseGlass))",
                      }}
                    >
                      Copy
                    </button>
                  </div>
                  <div className="rounded border border-[color:var(--pulse-line)] bg-[color:color-mix(in_srgb,var(--pulse-bg)_65%,transparent)] p-2">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-sans text-[12px] text-[color:var(--pulse-fg)]">
                        Pulse
                        <span className="ml-2 font-mono text-[10px] text-[color:var(--pulse-muted)]">
                          {mode}
                        </span>
                      </div>
                      <div className="font-mono text-[10px] text-[color:var(--pulse-muted)]">
                        tauri · react · vite
                      </div>
                    </div>
                    <div className="mt-1 font-sans text-[11px] text-[color:var(--pulse-fg-muted)]">
                      Live process + port telemetry with quick release actions.
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-2 text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
                Kill history
              </div>
              <div className="space-y-1 rounded border border-[color:var(--pulse-line)] bg-[color:color-mix(in_srgb,var(--pulse-bg)_65%,transparent)] p-2 font-mono text-[11px] text-[color:var(--pulse-fg-dim)]">
                {killHistory.length === 0 ? (
                  <div className="text-[color:var(--pulse-muted)]">none yet</div>
                ) : (
                  killHistory.map((k) => (
                    <div key={k.pid} className="flex justify-between gap-2">
                      <span className="truncate">
                        {k.name ?? "process"}{" "}
                        <span className="text-[color:var(--pulse-muted)]">·</span>{" "}
                        pid {k.pid}
                      </span>
                      <span className="shrink-0 text-[color:var(--pulse-muted)]">
                        {new Date(k.at).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
