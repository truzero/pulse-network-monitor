import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { useWindowDragStart } from "@/hooks/useWindowDragStart";
import { ProcessSurface } from "@/features/process-runtime/ProcessSurface";
import { PortMapSurface } from "@/features/network/PortMapSurface";
import { parsePortQuery } from "@/features/ui-shell/portQuery";
import { SearchCommandBar } from "@/features/ui-shell/SearchCommandBar";
import { SettingsPanel } from "@/features/ui-shell/SettingsPanel";
import { useKillHistory } from "@/hooks/useKillHistory";
import { usePulseSettings } from "@/hooks/usePulseSettings";
import { usePulseSnapshot } from "@/hooks/usePulseSnapshot";

const WIN_KEY = "pulse.window.v1";

export default function App() {
  const { settings, patch } = usePulseSettings();
  const { entries: killHistory, recordKill } = useKillHistory();
  const { snap, err } = usePulseSnapshot(settings.pollingIntervalMs);
  const [query, setQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showAboutInSettings, setShowAboutInSettings] = useState(false);
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [portMapMode, setPortMapMode] = useState(false);
  const onWindowDrag = useWindowDragStart();

  useEffect(() => {
    void getCurrentWindow().setAlwaysOnTop(settings.alwaysOnTop);
  }, [settings.alwaysOnTop]);

  useEffect(() => {
    // Persist + restore window dimensions.
    const win = getCurrentWindow();
    void win.setResizable(true);
    void win.setSizeConstraints({ minWidth: 600, minHeight: 400 });

    try {
      const raw = localStorage.getItem(WIN_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { w?: number; h?: number };
        if (typeof p.w === "number" && typeof p.h === "number") {
          void win.setSize(new LogicalSize(p.w, p.h));
        }
      }
    } catch {
      // ignore
    }

    let t: number | null = null;
    const save = async () => {
      const sz = await win.innerSize();
      localStorage.setItem(WIN_KEY, JSON.stringify({ w: sz.width, h: sz.height }));
    };

    let unlisten: (() => void) | null = null;
    void win.onResized(() => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => void save(), 120);
    }).then((u) => {
      unlisten = u;
    });

    return () => {
      if (t) window.clearTimeout(t);
      unlisten?.();
    };
  }, []);

  const portQuery = parsePortQuery(query);

  const releaseBinding =
    snap && portQuery !== null
      ? snap.portMap.find((p) => p.port === portQuery)
      : undefined;

  const releasePort = useMemo(() => {
    if (!(query.trim().startsWith(":") && portQuery !== null)) return null;
    return {
      port: portQuery,
      pid: releaseBinding?.pid,
      busy: releaseBusy,
      onRelease: () => {
        if (!releaseBinding) return;
        if (
          !window.confirm(
            `Release port ${portQuery} by killing process tree ${releaseBinding.pid}?`,
          )
        ) {
          return;
        }
        setReleaseBusy(true);
        void invoke("kill_recursive", { pid: releaseBinding.pid })
          .then(() => recordKill(releaseBinding.pid, `port :${portQuery}`))
          .catch(() => {})
          .finally(() => setReleaseBusy(false));
      },
    };
  }, [portQuery, query, releaseBinding, releaseBusy, recordKill]);

  const glass = 0.02 + settings.backgroundOpacity * 0.07;
  const glassStyle: CSSProperties = {
    // used by children via inline styles (prevents "brightness" dimming)
    ["--pulseGlass" as never]: String(glass),
  };

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);

  return (
    <div
      className={
        "relative flex h-full flex-col " +
        (settings.theme === "matrix" ? "font-mono" : "font-sans")
      }
      style={{
        ...glassStyle,
        background: "var(--pulse-bg-app)",
        boxShadow: "var(--pulse-glow)",
        color: "var(--pulse-fg)",
      }}
    >
      <SearchCommandBar
        value={query}
        onChange={setQuery}
        onOpenSettings={() => setSettingsOpen(true)}
        portMapMode={{ enabled: portMapMode, onToggle: () => setPortMapMode((v) => !v) }}
        releasePort={releasePort}
      />
      {err && (
        <div className="px-4 py-2 font-mono text-xs text-red-400">{err}</div>
      )}
      {!snap && !err && (
        <div
          data-tauri-drag-region
          onPointerDown={onWindowDrag}
          className="flex flex-1 cursor-grab select-none items-center justify-center font-mono text-sm text-[color:var(--pulse-muted)] active:cursor-grabbing"
        >
          acquiring telemetry…
        </div>
      )}
      {snap && (portMapMode ? (
        <PortMapSurface
          snap={snap}
          filterSystemTasks={settings.filterSystemTasks}
          onKilled={recordKill}
        />
      ) : (
        <ProcessSurface
          snap={snap}
          query={query}
          filterSystemTasks={settings.filterSystemTasks}
          onKilled={recordKill}
        />
      ))}

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={settings}
        onChange={patch}
        snap={snap}
        killHistory={killHistory}
        showAbout={showAboutInSettings}
      />

      <div className="pointer-events-none fixed bottom-3 right-4 z-30">
        <button
          type="button"
          onClick={() => setShowAboutInSettings((v) => !v)}
          className={
            "pointer-events-auto rounded-md px-2 py-1 font-sans text-[10px] tracking-tight " +
            "transition-colors hover:bg-[color:color-mix(in_srgb,var(--pulse-fg)_6%,transparent)] " +
            (showAboutInSettings
              ? "text-[color:var(--pulse-fg-dim)]"
              : "text-[color:var(--pulse-muted)]")
          }
          aria-pressed={showAboutInSettings}
          title={
            showAboutInSettings
              ? "About is on in Settings — click to hide"
              : "Show About inside Settings"
          }
        >
          <span className="font-medium tabular-nums">Pulse</span>
          <span className="mx-1.5 text-[color:var(--pulse-line)]" aria-hidden>
            ·
          </span>
          <span className="font-normal opacity-80">truzero</span>
        </button>
      </div>
    </div>
  );
}
