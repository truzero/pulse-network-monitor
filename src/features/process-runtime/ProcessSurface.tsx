import { invoke } from "@tauri-apps/api/core";
import clsx from "clsx";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { InspectorData, ProcessRow, PulseSnapshot } from "@/schemas/pulse";
import { InspectorSchema } from "@/schemas/pulse";
import { HeartbeatCanvas } from "./HeartbeatCanvas";

type Props = {
  snap: PulseSnapshot;
  query: string;
};

export function ProcessSurface({ snap, query }: Props) {
  const [open, setOpen] = useState<InspectorData | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return snap.processes;
    if (/^\d+$/.test(q)) {
      const port = Number(q);
      const pids = new Set(
        snap.portMap.filter((p) => p.port === port).map((p) => p.pid),
      );
      return snap.processes.filter((r) => pids.has(r.pid));
    }
    return snap.processes.filter((r) => {
      const hay = `${r.name} ${r.cmd.join(" ")}`.toLowerCase();
      return hay.includes(q);
    });
  }, [snap.processes, snap.portMap, query]);

  async function inspect(pid: number) {
    const raw = await invoke<unknown>("inspect_process", { pid });
    const p = InspectorSchema.safeParse(raw);
    if (p.success) setOpen(p.data);
  }

  async function killTree(pid: number) {
    if (!window.confirm(`Kill process tree from PID ${pid}?`)) return;
    await invoke("kill_recursive", { pid });
  }

  async function reveal(exe?: string | null) {
    if (!exe) return;
    await invoke("reveal_in_finder", { path: exe });
  }

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden px-3 pb-10">
      <div className="font-sans mb-2 flex shrink-0 flex-wrap gap-3 px-1 text-[11px] text-neutral-500">
        <span>
          cpu{" "}
          <span className="font-mono text-neutral-300">
            {snap.globalCpu.toFixed(1)}%
          </span>
        </span>
        <span>
          mem{" "}
          <span className="font-mono text-neutral-300">
            {(snap.usedMemory / 1024 / 1024 / 1024).toFixed(1)}/
            {(snap.totalMemory / 1024 / 1024 / 1024).toFixed(1)} gb
          </span>
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-white/10 bg-white/[0.05] backdrop-blur-md">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="sticky top-0 bg-black/80 font-sans text-[10px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-2 py-2 font-medium">Pulse</th>
              <th className="px-2 py-2 font-medium">Pid</th>
              <th className="px-2 py-2 font-medium">Process</th>
              <th className="px-2 py-2 font-medium text-right">Cpu%</th>
              <th className="px-2 py-2 font-medium text-right">Mem</th>
              <th className="px-2 py-2 font-medium">Command</th>
              <th className="px-2 py-2 w-28" />
            </tr>
          </thead>
          <motion.tbody layout className="font-mono text-neutral-200">
            {filtered.map((row: ProcessRow) => (
              <motion.tr
                layout
                transition={{ duration: 0.1, ease: "linear" }}
                key={row.pid}
                onClick={() => void inspect(row.pid)}
                className={clsx(
                  "group cursor-pointer border-t border-white/5 hover:bg-white/[0.03]",
                  row.warning && "shadow-[inset_0_0_12px_rgba(127,29,29,0.35)]",
                )}
              >
                <td className="px-2 py-1 align-middle">
                  <HeartbeatCanvas cpu={row.cpu} />
                </td>
                <td className="px-2 py-1 align-middle">{row.pid}</td>
                <td className="px-2 py-1 align-middle font-sans">{row.name}</td>
                <td className="px-2 py-1 text-right">{row.cpu.toFixed(1)}</td>
                <td className="px-2 py-1 text-right">
                  {(row.memory / 1024 / 1024).toFixed(0)} mb
                </td>
                <td className="max-w-[220px] truncate px-2 py-1 text-neutral-400">
                  {row.cmd.join(" ")}
                </td>
                <td className="px-2 py-1 text-right opacity-0 transition-opacity duration-100 group-hover:opacity-100">
                  <button
                    type="button"
                    className="mr-2 rounded border border-white/15 px-2 py-0.5 font-sans text-[10px] text-neutral-300 hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      void killTree(row.pid);
                    }}
                  >
                    Kill
                  </button>
                  <button
                    type="button"
                    className="rounded border border-white/15 px-2 py-0.5 font-sans text-[10px] text-neutral-300 hover:bg-white/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      void reveal(row.exe);
                    }}
                  >
                    Finder
                  </button>
                </td>
              </motion.tr>
            ))}
          </motion.tbody>
        </table>
      </div>

      {open && (
        <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[70vh] w-full max-w-xl overflow-auto rounded-lg border border-white/15 bg-white/[0.06] p-4 font-mono text-[11px] text-neutral-200 shadow-xl backdrop-blur-md">
            <div className="mb-3 flex justify-between font-sans">
              <span className="text-neutral-400">inspector · pid {open.pid}</span>
              <button
                type="button"
                className="text-neutral-500 hover:text-neutral-300"
                onClick={() => setOpen(null)}
              >
                close
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <div className="font-sans text-[10px] uppercase text-neutral-500">
                  executable
                </div>
                <div className="break-all">{open.exe ?? "—"}</div>
              </div>
              <div>
                <div className="font-sans text-[10px] uppercase text-neutral-500">
                  cwd
                </div>
                <div className="break-all">{open.cwd ?? "—"}</div>
              </div>
              <div>
                <div className="font-sans text-[10px] uppercase text-neutral-500">
                  argv
                </div>
                <pre className="whitespace-pre-wrap break-all">{open.cmd.join(" ")}</pre>
              </div>
              <div>
                <div className="font-sans text-[10px] uppercase text-neutral-500">
                  environment (partial)
                </div>
                <div className="max-h-40 overflow-auto rounded border border-white/10 bg-black/40 p-2">
                  {open.env.length === 0 ? (
                    <span className="text-neutral-500">not accessible</span>
                  ) : (
                    open.env.map(([k, v]) => (
                      <div key={k} className="break-all">
                        <span className="text-neutral-400">{k}=</span>
                        {v}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
