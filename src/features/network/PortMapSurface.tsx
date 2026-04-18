import { invoke } from "@tauri-apps/api/core";
import { useMemo, useState } from "react";
import { isSystemTask } from "@/lib/processFilters";
import type { PulseSnapshot } from "@/schemas/pulse";

type Props = {
  snap: PulseSnapshot;
  filterSystemTasks: boolean;
  onKilled?: (pid: number, name?: string) => void;
};

export function PortMapSurface({ snap, filterSystemTasks, onKilled }: Props) {
  const [busyPid, setBusyPid] = useState<number | null>(null);

  const byPid = useMemo(() => {
    return new Map(snap.processes.map((p) => [p.pid, p]));
  }, [snap.processes]);

  const rows = useMemo(() => {
    const out = snap.portMap
      .map((b) => {
        const proc = byPid.get(b.pid);
        return {
          port: b.port,
          protocol: b.protocol,
          pid: b.pid,
          name: proc?.name ?? "process",
          proc,
        };
      })
      .filter((r) => (filterSystemTasks ? !(r.proc && isSystemTask(r.proc)) : true))
      .sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol));

    // Dedup per protocol/port.
    const seen = new Set<string>();
    return out.filter((r) => {
      const k = `${r.protocol}:${r.port}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [byPid, filterSystemTasks, snap.portMap]);

  async function release(pid: number, label: string) {
    if (busyPid !== null) return;
    setBusyPid(pid);
    try {
      await invoke("kill_recursive", { pid });
      onKilled?.(pid, label);
    } finally {
      setBusyPid(null);
    }
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-3 pb-10">
      <div className="mb-2 flex items-center justify-between px-1 font-sans text-[11px] text-[color:var(--pulse-muted)]">
        <span>
          listeners{" "}
          <span className="font-mono text-[color:var(--pulse-fg-dim)]">{rows.length}</span>
        </span>
      </div>

      <div
        className="min-h-0 flex-1 overflow-auto rounded-lg border border-[color:var(--pulse-line)] backdrop-blur-md pulse-scroll"
        style={{ backgroundColor: "rgba(255,255,255,var(--pulseGlass))" }}
      >
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="sticky top-0 bg-[color:var(--pulse-table-head-bg)] font-sans text-[10px] uppercase tracking-wide text-[color:var(--pulse-muted)]">
            <tr>
              <th className="px-2 py-2 font-medium">Port</th>
              <th className="px-2 py-2 font-medium">Proto</th>
              <th className="px-2 py-2 font-medium">Process</th>
              <th className="px-2 py-2 font-medium">Pid</th>
              <th className="px-2 py-2 w-28" />
            </tr>
          </thead>
          <tbody className="font-mono text-[color:var(--pulse-fg-dim)]">
            {rows.map((r) => {
              const label = `${r.name} · ${r.protocol}:${r.port}`;
              const busy = busyPid === r.pid;
              return (
                <tr
                  key={`${r.protocol}:${r.port}:${r.pid}`}
                  className="border-t border-[color:var(--pulse-line-subtle)] hover:bg-[color:color-mix(in_srgb,var(--pulse-fg)_4%,transparent)]"
                >
                  <td className="px-2 py-1 align-middle text-[color:var(--pulse-fg)]">
                    {r.port}
                  </td>
                  <td className="px-2 py-1 align-middle text-[color:var(--pulse-muted)]">
                    {r.protocol}
                  </td>
                  <td className="px-2 py-1 align-middle font-sans">{r.name}</td>
                  <td className="px-2 py-1 align-middle text-[color:var(--pulse-fg-dim)]">
                    {r.pid}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button
                      type="button"
                      disabled={busyPid !== null}
                      onClick={() => void release(r.pid, label)}
                      className="rounded-md border border-red-500/40 bg-red-950/45 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.22em] text-red-100 shadow-[inset_0_0_18px_rgba(239,68,68,0.08)] hover:bg-red-950/70 disabled:opacity-40"
                    >
                      {busy ? "Releasing…" : "Release"}
                    </button>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center font-mono text-[11px] text-[color:var(--pulse-muted)]"
                >
                  no active listeners
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

