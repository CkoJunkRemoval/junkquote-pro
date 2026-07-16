"use client";

import { useRef } from "react";

export default function SignaturePad({ onChange }: { onChange: (signature: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);

  function point(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: (event.clientX - rect.left) * (canvas.width / rect.width), y: (event.clientY - rect.top) * (canvas.height / rect.height) };
  }
  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(event.pointerId);
    const ctx = canvas.getContext("2d")!;
    const p = point(event); ctx.beginPath(); ctx.moveTo(p.x, p.y); drawingRef.current = true;
  }
  function draw(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current!.getContext("2d")!; const p = point(event);
    ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.strokeStyle = "#0f172a"; ctx.lineTo(p.x, p.y); ctx.stroke();
  }
  function finish() { if (!drawingRef.current) return; drawingRef.current = false; onChange(canvasRef.current!.toDataURL("image/png")); }
  function clear() { const canvas = canvasRef.current!; canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height); onChange(""); }

  return <div className="space-y-2"><canvas ref={canvasRef} width={700} height={180} onPointerDown={start} onPointerMove={draw} onPointerUp={finish} onPointerLeave={finish} className="h-40 w-full touch-none rounded-xl border border-slate-300 bg-white" aria-label="Draw your signature" /><button type="button" onClick={clear} className="text-sm font-medium text-blue-700">Clear Signature</button></div>;
}
