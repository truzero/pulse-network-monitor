import { useState } from "react";
import { ProcessSurface } from "@/features/process-runtime/ProcessSurface";
import { SearchCommandBar } from "@/features/ui-shell/SearchCommandBar";
import { usePulseSnapshot } from "@/hooks/usePulseSnapshot";

export default function App() {
  const { snap, err } = usePulseSnapshot(1000);
  const [query, setQuery] = useState("");

  return (
    <div className="flex h-full flex-col bg-black font-sans text-neutral-100">
      <SearchCommandBar value={query} onChange={setQuery} />
      {err && (
        <div className="px-4 py-2 font-mono text-xs text-red-400">{err}</div>
      )}
      {!snap && !err && (
        <div className="flex flex-1 items-center justify-center font-mono text-sm text-neutral-600">
          acquiring telemetry…
        </div>
      )}
      {snap && <ProcessSurface snap={snap} query={query} />}
      <div className="pointer-events-none fixed bottom-3 right-4 font-mono text-[10px] text-white/40">
        truzero // pulse
      </div>
    </div>
  );
}
