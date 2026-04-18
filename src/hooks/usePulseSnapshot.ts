import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { PulseSnapshotSchema, type PulseSnapshot } from "@/schemas/pulse";

export function usePulseSnapshot(intervalMs = 1000) {
  const [snap, setSnap] = useState<PulseSnapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const pull = useCallback(async () => {
    try {
      const raw = await invoke<unknown>("get_pulse_snapshot");
      const parsed = PulseSnapshotSchema.safeParse(raw);
      if (!parsed.success) {
        setErr("invalid snapshot payload");
        return;
      }
      setSnap(parsed.data);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    void pull();
    const id = window.setInterval(() => void pull(), intervalMs);
    return () => window.clearInterval(id);
  }, [pull, intervalMs]);

  return { snap, err, refresh: pull };
}
