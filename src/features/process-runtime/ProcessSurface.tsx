import { invoke } from "@tauri-apps/api/core";
import clsx from "clsx";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { fuzzyMatchAny, parseAdvancedQuery } from "@/features/ui-shell/advancedQuery";
import { parsePortQuery } from "@/features/ui-shell/portQuery";
import { useGridLayout, type GridColumnKey } from "@/hooks/useGridLayout";
import { useSmoothedCpu } from "@/hooks/useSmoothedCpu";
import { isSystemTask } from "@/lib/processFilters";
import type { InspectorData, PulseSnapshot } from "@/schemas/pulse";
import { InspectorSchema } from "@/schemas/pulse";
import { HeartbeatCanvas } from "./HeartbeatCanvas";
import { InspectorModal } from "./InspectorModal";
import { RowActionIcons } from "./RowActionIcons";

type Props = {
  snap: PulseSnapshot;
  query: string;
  filterSystemTasks: boolean;
  onKilled?: (pid: number, name?: string) => void;
};

type SortKey = "pid" | "process" | "cpu" | "mem";

type SortState =
  | { key: SortKey; dir: "desc" | "asc" }
  | { key: null; dir: null };

function toggleSort(prev: SortState, key: SortKey): SortState {
  if (prev.key !== key) return { key, dir: "desc" };
  if (prev.dir === "desc") return { key, dir: "asc" };
  return { key: null, dir: null };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}

function memTone(bytes: number, total: number) {
  const pct = total > 0 ? bytes / total : 0;
  if (pct >= 0.07) return "text-[color:var(--pulse-fg)]";
  if (pct >= 0.03) return "text-[color:var(--pulse-fg-dim)]";
  if (pct >= 0.01) return "text-[color:var(--pulse-fg-muted)]";
  return "text-[color:var(--pulse-muted)]";
}

export function ProcessSurface({
  snap,
  query,
  filterSystemTasks,
  onKilled,
}: Props) {
  const [open, setOpen] = useState<InspectorData | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });

  const { layout, setColWidth } = useGridLayout();

  const frozenOrderRef = useRef<number[]>([]);
  const dragRef = useRef<{
    key: GridColumnKey;
    startX: number;
    startW: number;
  } | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.startX;
      const w = clamp(d.startW + dx, 60, 420);
      setColWidth(d.key, w);
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setColWidth]);

  const base = useMemo(() => {
    let rows = snap.processes;
    if (filterSystemTasks) rows = rows.filter((r) => !isSystemTask(r));
    return rows;
  }, [snap.processes, filterSystemTasks]);

  const knownUsers = useMemo(() => {
    const s = new Set<string>();
    for (const r of base) {
      if (r.user) s.add(r.user.toLowerCase());
    }
    return s;
  }, [base]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return base;

    const port = parsePortQuery(q);
    if (port !== null) {
      const pids = new Set(
        snap.portMap.filter((p) => p.port === port).map((p) => p.pid),
      );
      return base.filter((r) => pids.has(r.pid));
    }

    const adv = parseAdvancedQuery(q, knownUsers);

    return base.filter((r) => {
      for (const m of adv.mem) {
        if (m.op === ">" && !(r.memory > m.bytes)) return false;
        if (m.op === "<" && !(r.memory < m.bytes)) return false;
      }

      if (adv.users.length > 0) {
        const u = (r.user ?? (r.uid === 0 ? "root" : "")).toLowerCase();
        if (!adv.users.some((x) => x === u)) return false;
      }

      if (adv.tokens.length === 0) return true;

      const hays = [
        r.name,
        r.exe ?? "",
        r.cmd[0] ?? "",
        r.cmd.join(" "),
      ];

      return adv.tokens.every((t) => fuzzyMatchAny(hays, t));
    });
  }, [base, knownUsers, query, snap.portMap]);

  const hiddenCount = base.length - filtered.length;
  const showFiltered =
    (filterSystemTasks || query.trim().length > 0) && hiddenCount > 0;

  const smoothedCpu = useSmoothedCpu(filtered);

  const desiredPidOrder = useMemo(() => {
    const dir = sort.dir === "asc" ? 1 : -1;
    const key = sort.key;

    return [...filtered]
      .sort((a, b) => {
        if (key === "pid") return (a.pid - b.pid) * dir;
        if (key === "process") return a.name.localeCompare(b.name) * dir;
        if (key === "mem") return (a.memory - b.memory) * dir;
        if (key === "cpu") {
          const ca = smoothedCpu.get(a.pid) ?? a.cpu;
          const cb = smoothedCpu.get(b.pid) ?? b.cpu;
          if (cb !== ca) return (cb - ca) * dir;
          return (a.pid - b.pid) * dir;
        }

        const ca = smoothedCpu.get(a.pid) ?? a.cpu;
        const cb = smoothedCpu.get(b.pid) ?? b.cpu;
        if (cb !== ca) return cb - ca;
        return a.pid - b.pid;
      })
      .map((r) => r.pid);
  }, [filtered, smoothedCpu, sort.dir, sort.key]);

  const rowByPid = useMemo(
    () => new Map(filtered.map((r) => [r.pid, r])),
    [filtered],
  );

  const displayPids = isHovered
    ? frozenOrderRef.current.filter((pid) => rowByPid.has(pid))
    : desiredPidOrder;

  const layoutEnabled = !isHovered;

  async function inspect(pid: number) {
    const raw = await invoke<unknown>("inspect_process", { pid });
    const p = InspectorSchema.safeParse(raw);
    if (p.success) setOpen(p.data);
  }

  async function killTree(pid: number, name?: string) {
    if (!window.confirm(`Kill process tree from PID ${pid}?`)) return;
    await invoke("kill_recursive", { pid });
    onKilled?.(pid, name);
  }

  async function reveal(exe?: string | null) {
    if (!exe) return;
    await invoke("reveal_in_finder", { path: exe });
  }

  function Header({
    k,
    align,
    children,
    resizable,
  }: {
    k: SortKey;
    align?: "left" | "right";
    children: ReactNode;
    resizable?: GridColumnKey;
  }) {
    const active = sort.key === k;
    return (
      <th
        className={clsx(
          "relative px-2 py-2 font-medium",
          align === "right" && "text-right",
        )}
      >
        <button
          type="button"
          onClick={() => setSort((s) => toggleSort(s, k))}
          className={clsx(
            "w-full select-none text-left",
            align === "right" && "text-right",
            "hover:text-[color:var(--pulse-fg-dim)]",
          )}
        >
          {children}
        </button>
        <div
          className={clsx(
            "absolute bottom-0 left-0 right-0 h-[2px]",
            active
              ? "bg-[color:color-mix(in_srgb,var(--pulse-accent)_58%,transparent)]"
              : "bg-transparent",
          )}
        />
        {resizable && (
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-col-resize"
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragRef.current = {
                key: resizable,
                startX: e.clientX,
                startW: layout.cols[resizable],
              };
            }}
          />
        )}
      </th>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-3 pb-10">
      <div className="font-sans mb-2 flex shrink-0 flex-wrap gap-3 px-1 text-[11px] text-[color:var(--pulse-muted)]">
        <span>
          cpu{" "}
          <span className="font-mono text-[color:var(--pulse-fg-dim)]">
            {snap.globalCpu.toFixed(1)}%
          </span>
        </span>
        <span>
          mem{" "}
          <span className="font-mono text-[color:var(--pulse-fg-dim)]">
            {(snap.usedMemory / 1024 / 1024 / 1024).toFixed(1)}/
            {(snap.totalMemory / 1024 / 1024 / 1024).toFixed(1)} gb
          </span>
        </span>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-[color:var(--pulse-line)] backdrop-blur-md pulse-scroll"
        style={{ backgroundColor: "rgba(255,255,255,var(--pulseGlass))" }}
        onMouseEnter={() => {
          frozenOrderRef.current = desiredPidOrder;
          setIsHovered(true);
        }}
        onMouseLeave={() => setIsHovered(false)}
      >
        <table className="w-full border-collapse text-left text-[12px]">
          <colgroup>
            <col style={{ width: 70 }} />
            <col style={{ width: layout.cols.pid }} />
            <col style={{ width: layout.cols.process }} />
            <col style={{ width: layout.cols.cpu }} />
            <col style={{ width: layout.cols.mem }} />
            <col />
            <col style={{ width: 64 }} />
          </colgroup>

          <thead className="sticky top-0 bg-[color:var(--pulse-table-head-bg)] font-sans text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
            <tr>
              <th className="px-2 py-2 font-medium">Pulse</th>
              <Header k="pid" resizable="pid">
                Pid
              </Header>
              <Header k="process" resizable="process">
                Process
              </Header>
              <Header k="cpu" align="right" resizable="cpu">
                Cpu%
              </Header>
              <Header k="mem" align="right" resizable="mem">
                Mem
              </Header>
              <th className="px-2 py-2 font-medium">Command</th>
              <th className="px-2 py-2 w-14" />
            </tr>
          </thead>

          <motion.tbody layout={layoutEnabled} className="font-mono text-[color:var(--pulse-fg-dim)]">
            {displayPids.map((pid) => {
              const row = rowByPid.get(pid);
              if (!row) return null;

              const cpuHot = row.cpu > 50;
              const cpuRed = row.cpu > 85;

              return (
                <motion.tr
                  layout={layoutEnabled}
                  transition={{ duration: 0.12, ease: "easeOut" }}
                  key={row.pid}
                  onClick={() => void inspect(row.pid)}
                  className={clsx(
                    "group cursor-pointer border-t border-[color:var(--pulse-line-subtle)] hover:bg-[color:color-mix(in_srgb,var(--pulse-fg)_4%,transparent)]",
                    row.warning &&
                      "shadow-[inset_0_0_10px_rgba(255,0,0,0.1)]",
                    cpuRed &&
                      "animate-[pulse_1.2s_ease-in-out_infinite] shadow-[inset_0_0_24px_rgba(255,0,0,0.08)]",
                  )}
                >
                  <td className="px-2 py-1 align-middle">
                    <HeartbeatCanvas
                      cpu={row.cpu}
                      color={cpuHot ? "accent" : undefined}
                    />
                  </td>
                  <td className="px-2 py-1 align-middle">{row.pid}</td>
                  <td className="px-2 py-1 align-middle font-sans">
                    {row.name}
                  </td>
                  <td
                    className={clsx(
                      "px-2 py-1 text-right",
                      cpuHot && "text-[color:var(--pulse-accent)]",
                    )}
                  >
                    {row.cpu.toFixed(1)}
                  </td>
                  <td
                    className={clsx(
                      "px-2 py-1 text-right",
                      memTone(row.memory, snap.totalMemory),
                    )}
                  >
                    {(row.memory / 1024 / 1024).toFixed(0)} mb
                  </td>
                  <td className="max-w-[220px] truncate px-2 py-1 text-[color:var(--pulse-muted)]">
                    {row.cmd.join(" ")}
                  </td>
                  <td className="px-2 py-1 text-right opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                    <RowActionIcons
                      onKill={() => void killTree(row.pid, row.name)}
                      onReveal={() => void reveal(row.exe)}
                      revealDisabled={!row.exe}
                    />
                  </td>
                </motion.tr>
              );
            })}
          </motion.tbody>
        </table>
      </div>

      {showFiltered && (
        <div className="pointer-events-none absolute bottom-2 left-4 font-mono text-[10px] text-[color:var(--pulse-muted)]">
          Filtered: {hiddenCount} hidden
        </div>
      )}

      {open && <InspectorModal data={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

