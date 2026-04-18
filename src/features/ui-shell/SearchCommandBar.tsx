import { useWindowDragStart } from "@/hooks/useWindowDragStart";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onOpenSettings?: () => void;
  portMapMode?: {
    enabled: boolean;
    onToggle: () => void;
  };
  releasePort?: {
    port: number;
    pid?: number;
    busy: boolean;
    onRelease: () => void;
  } | null;
};

export function SearchCommandBar({
  value,
  onChange,
  onOpenSettings,
  portMapMode,
  releasePort,
}: Props) {
  const onWindowDrag = useWindowDragStart();

  return (
    <div className="flex flex-col">
      {/*
        Undecorated window: `data-tauri-drag-region` + startDragging() on pointerdown.
        Tauri 2 requires core:window:allow-start-dragging for the native drag IPC.
      */}
      <div
        data-tauri-drag-region
        onPointerDown={onWindowDrag}
        className="h-12 w-full shrink-0 cursor-grab select-none active:cursor-grabbing"
        aria-hidden
      />
      <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,36rem)_minmax(0,1fr)] items-start gap-x-2 px-4 pb-2 pt-0">
        <div
          data-tauri-drag-region
          onPointerDown={onWindowDrag}
          className="min-h-12 cursor-grab select-none active:cursor-grabbing self-stretch"
          aria-hidden
        />
        <div className="relative z-10 flex w-full min-w-0 items-start gap-2">
          <input
            type="search"
            autoCorrect="off"
            spellCheck={false}
            placeholder="Search"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            data-tauri-drag-region="false"
            style={{ backgroundColor: "rgba(255,255,255,var(--pulseGlass))" }}
            className={
              "font-mono tracking-[0.08em] text-[13px] text-[color:var(--pulse-fg)] placeholder:text-[color:var(--pulse-placeholder)] " +
              "min-h-10 flex-1 rounded-md border border-[color:var(--pulse-line)] px-4 py-2 " +
              "backdrop-blur-md outline-none ring-0 focus:border-[color:color-mix(in_srgb,var(--pulse-accent)_45%,var(--pulse-line))] transition-[border-color] duration-100"
            }
          />
          {portMapMode && (
            <button
              type="button"
              title="Port Map"
              onClick={portMapMode.onToggle}
              data-tauri-drag-region="false"
              style={{ backgroundColor: "rgba(255,255,255,var(--pulseGlass))" }}
              className={
                "mt-1 shrink-0 rounded-md border border-[color:var(--pulse-line)] px-3 py-2 font-sans text-[10px] uppercase tracking-[0.22em] backdrop-blur-md " +
                (portMapMode.enabled
                  ? "text-[color:var(--pulse-fg)] border-[color:color-mix(in_srgb,var(--pulse-accent)_40%,var(--pulse-line))]"
                  : "text-[color:var(--pulse-muted)] hover:border-[color:color-mix(in_srgb,var(--pulse-accent)_35%,var(--pulse-line))] hover:text-[color:var(--pulse-fg-dim)]")
              }
            >
              Port map
            </button>
          )}
          {onOpenSettings && (
            <button
              type="button"
              title="Settings"
              onClick={onOpenSettings}
              data-tauri-drag-region="false"
              style={{ backgroundColor: "rgba(255,255,255,var(--pulseGlass))" }}
              className="mt-1 shrink-0 rounded-md border border-[color:var(--pulse-line)] p-2 text-[color:var(--pulse-muted)] backdrop-blur-md hover:border-[color:color-mix(in_srgb,var(--pulse-accent)_35%,var(--pulse-line))] hover:text-[color:var(--pulse-fg-dim)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
                data-tauri-drag-region="false"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            </button>
          )}
        </div>
        <div
          data-tauri-drag-region
          onPointerDown={onWindowDrag}
          className="min-h-12 cursor-grab select-none active:cursor-grabbing self-stretch"
          aria-hidden
        />
      </div>

      {releasePort && (
        <div className="mt-3 flex justify-center px-4">
          <button
            type="button"
            disabled={releasePort.busy || releasePort.pid === undefined}
            onClick={releasePort.onRelease}
            className="rounded-md border border-red-500/40 bg-red-950/40 px-5 py-2 font-sans text-[11px] uppercase tracking-[0.25em] text-red-200/95 shadow-[inset_0_0_20px_rgba(239,68,68,0.08)] backdrop-blur-md transition-colors hover:bg-red-950/70 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Release port {releasePort.port}
            {releasePort.pid !== undefined ? (
              <span className="ml-2 font-mono tracking-normal text-red-100/80">
                · pid {releasePort.pid}
              </span>
            ) : (
              <span className="ml-2 font-mono tracking-normal text-[color:var(--pulse-muted)]">
                · no listener
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
