import { useEffect, useRef } from "react";

type Props = { cpu: number; className?: string };

/** Thin pulse line — amplitude tracks normalized CPU (0–100). */
export function HeartbeatCanvas({ cpu, className }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const phase = useRef(0);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const loop = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const amp = Math.min(1, Math.max(0.05, cpu / 100)) * (h * 0.35);
      const mid = h / 2;
      ctx.strokeStyle = "rgba(148, 163, 184, 0.85)";
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      phase.current += 0.18 + cpu / 400;
      for (let x = 0; x < w; x += 2) {
        const t = x * 0.08 + phase.current;
        const y = mid + Math.sin(t) * amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [cpu]);

  return (
    <canvas
      ref={ref}
      width={56}
      height={18}
      className={className}
      aria-hidden
    />
  );
}
