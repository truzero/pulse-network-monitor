import { getCurrentWindow } from "@tauri-apps/api/window";
import { useCallback } from "react";

/**
 * Starts native window drag. Use on undecorated / transparent windows when CSS
 * drag regions are blocked or unreliable, and ensure `core:window:allow-start-dragging` is set.
 */
export function useWindowDragStart() {
  return useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    void getCurrentWindow().startDragging().catch(() => {
      /* browser / denied permission */
    });
  }, []);
}
