import { invoke } from "@tauri-apps/api/core";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  InspectorData,
  SocketRowSchema,
  type SocketRow,
} from "@/schemas/pulse";

type Props = {
  data: InspectorData;
  onClose: () => void;
};

type Tab = "DETAILS" | "NETWORK";

const SocketRowsSchema = z.array(SocketRowSchema);

function hostOnly(addr: string) {
  const a = addr.trim();
  if (!a) return a;
  if (a.startsWith("[")) {
    const end = a.indexOf("]");
    if (end !== -1) return a.slice(1, end);
  }
  const arrow = a.lastIndexOf("->");
  const rhs = arrow !== -1 ? a.slice(arrow + 2) : a;
  const colon = rhs.lastIndexOf(":");
  return colon !== -1 ? rhs.slice(0, colon) : rhs;
}

export function InspectorModal({ data: open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("DETAILS");
  const [sockets, setSockets] = useState<SocketRow[] | null>(null);
  const [sockErr, setSockErr] = useState<string | null>(null);
  const [sockLoading, setSockLoading] = useState(false);

  useEffect(() => {
    setTab("DETAILS");
    setSockets(null);
    setSockErr(null);
    setSockLoading(false);
  }, [open.pid]);

  useEffect(() => {
    if (tab !== "NETWORK") return;
    if (sockets !== null || sockLoading) return;

    setSockLoading(true);
    void invoke<unknown>("get_process_sockets", { pid: open.pid })
      .then((raw) => {
        const p = SocketRowsSchema.safeParse(raw);
        if (!p.success) throw new Error("invalid sockets payload");
        setSockets(p.data);
        setSockErr(null);
      })
      .catch((e) => setSockErr(e instanceof Error ? e.message : String(e)))
      .finally(() => setSockLoading(false));
  }, [open.pid, sockLoading, sockets, tab]);

  const detailTab = useMemo(() => {
    return (
      <div className="space-y-3">
        <div>
          <div className="font-sans text-[10px] uppercase text-neutral-500">
            executable
          </div>
          <div className="break-all">{open.exe ?? "—"}</div>
        </div>
        <div>
          <div className="font-sans text-[10px] uppercase text-neutral-500">cwd</div>
          <div className="break-all">{open.cwd ?? "—"}</div>
        </div>
        <div>
          <div className="font-sans text-[10px] uppercase text-neutral-500">argv</div>
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
    );
  }, [open.cmd, open.cwd, open.env, open.exe]);

  const networkTab = useMemo(() => {
    if (sockLoading) {
      return <div className="text-neutral-500">scanning sockets…</div>;
    }
    if (sockErr) {
      return <div className="text-red-300">{sockErr}</div>;
    }
    const rows = sockets ?? [];
    if (rows.length === 0) {
      return <div className="text-neutral-500">no active sockets</div>;
    }

    return (
      <div className="overflow-auto rounded border border-white/10 bg-black/30">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 bg-black/70 font-sans text-[10px] uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-2 py-2 font-medium">Proto</th>
              <th className="px-2 py-2 font-medium">Local</th>
              <th className="px-2 py-2 font-medium">Remote</th>
              <th className="px-2 py-2 font-medium">State</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[11px] text-neutral-200">
            {rows.map((r, idx) => {
              const remote = r.remoteAddress ?? "—";
              const host = r.remoteAddress ? hostOnly(r.remoteAddress) : null;
              return (
                <tr key={`${idx}:${r.protocol}:${r.localAddress}`} className="border-t border-white/5">
                  <td className="px-2 py-1 text-neutral-300">{r.protocol}</td>
                  <td className="px-2 py-1 break-all">{r.localAddress}</td>
                  <td className="px-2 py-1 break-all">
                    <span className="inline-flex items-center gap-1.5">
                      <span>{remote}</span>
                      {host && (
                        <button
                          type="button"
                          title="Copy remote IP"
                          className="rounded p-1 text-neutral-500 hover:bg-white/10 hover:text-neutral-200"
                          onClick={() => void navigator.clipboard.writeText(host)}
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            aria-hidden
                          >
                            <path d="M8 8h12v12H8z" />
                            <path d="M4 16H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v1" />
                          </svg>
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="px-2 py-1 text-neutral-400">{r.state ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }, [sockErr, sockLoading, sockets]);

  return (
    <div className="absolute inset-0 z-20 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[70vh] w-full max-w-xl overflow-auto rounded-lg border border-white/15 bg-white/[0.06] p-4 font-mono text-[11px] text-neutral-200 shadow-xl backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between font-sans">
          <span className="text-neutral-400">inspector · pid {open.pid}</span>
          <button
            type="button"
            className="text-neutral-500 hover:text-neutral-300"
            onClick={onClose}
          >
            close
          </button>
        </div>

        <div className="mb-4 flex gap-2 font-sans text-[10px] uppercase tracking-[0.2em]">
          <button
            type="button"
            onClick={() => setTab("DETAILS")}
            className={
              tab === "DETAILS"
                ? "text-neutral-200"
                : "text-neutral-500 hover:text-neutral-300"
            }
          >
            Details
          </button>
          <span className="text-neutral-700">/</span>
          <button
            type="button"
            onClick={() => setTab("NETWORK")}
            className={
              tab === "NETWORK"
                ? "text-neutral-200"
                : "text-neutral-500 hover:text-neutral-300"
            }
          >
            Network
          </button>
        </div>

        {tab === "DETAILS" ? detailTab : networkTab}
      </div>
    </div>
  );
}

