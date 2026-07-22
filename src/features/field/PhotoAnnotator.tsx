"use client";
import { useEffect, useRef, useState } from "react";
type Tool = "freehand" | "arrow" | "rectangle" | "circle" | "text";
export default function PhotoAnnotator({
  file,
  onCancel,
  onSave,
}: {
  file: Blob;
  onCancel: () => void;
  onSave: (file: File, metadata: unknown) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [tool, setTool] = useState<Tool>("freehand"),
    [history, setHistory] = useState<ImageData[]>([]),
    [future, setFuture] = useState<ImageData[]>([]),
    operations = useRef<unknown[]>([]),
    start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file),
      image = new Image();
    image.onload = () => {
      const c = canvas.current!;
      const max = 1200,
        scale = Math.min(1, max / image.width);
      c.width = Math.round(image.width * scale);
      c.height = Math.round(image.height * scale);
      c.getContext("2d")!.drawImage(image, 0, 0, c.width, c.height);
      setHistory([c.getContext("2d")!.getImageData(0, 0, c.width, c.height)]);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  }, [file]);
  function point(e: React.PointerEvent) {
    const r = canvas.current!.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) * canvas.current!.width) / r.width,
      y: ((e.clientY - r.top) * canvas.current!.height) / r.height,
    };
  }
  function down(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = point(e);
    if (tool === "freehand") {
      const c = canvas.current!.getContext("2d")!;
      c.beginPath();
      c.moveTo(start.current.x, start.current.y);
    }
  }
  function move(e: React.PointerEvent) {
    if (!start.current || tool !== "freehand") return;
    const p = point(e),
      c = canvas.current!.getContext("2d")!;
    c.strokeStyle = "#ef4444";
    c.lineWidth = 6;
    c.lineCap = "round";
    c.lineTo(p.x, p.y);
    c.stroke();
  }
  function up(e: React.PointerEvent) {
    if (!start.current) return;
    const end = point(e),
      ctx = canvas.current!.getContext("2d")!,
      from = start.current;
    ctx.strokeStyle = "#ef4444";
    ctx.fillStyle = "#ef4444";
    ctx.lineWidth = 6;
    if (tool === "rectangle")
      ctx.strokeRect(from.x, from.y, end.x - from.x, end.y - from.y);
    if (tool === "circle") {
      ctx.beginPath();
      ctx.ellipse(
        (from.x + end.x) / 2,
        (from.y + end.y) / 2,
        Math.abs(end.x - from.x) / 2,
        Math.abs(end.y - from.y) / 2,
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    }
    if (tool === "arrow") {
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
      const a = Math.atan2(end.y - from.y, end.x - from.x);
      ctx.beginPath();
      ctx.moveTo(end.x, end.y);
      ctx.lineTo(
        end.x - 24 * Math.cos(a - 0.5),
        end.y - 24 * Math.sin(a - 0.5),
      );
      ctx.lineTo(
        end.x - 24 * Math.cos(a + 0.5),
        end.y - 24 * Math.sin(a + 0.5),
      );
      ctx.closePath();
      ctx.fill();
    }
    if (tool === "text") {
      const label = window.prompt("Text label");
      if (label) {
        ctx.font = "bold 28px sans-serif";
        ctx.fillText(label, end.x, end.y);
        operations.current.push({ tool, label, x: end.x, y: end.y });
      }
    } else operations.current.push({ tool, from, end });
    const image = ctx.getImageData(
      0,
      0,
      canvas.current!.width,
      canvas.current!.height,
    );
    setHistory((v) => [...v, image]);
    setFuture([]);
    start.current = null;
  }
  function restore(image: ImageData) {
    canvas.current!.getContext("2d")!.putImageData(image, 0, 0);
  }
  function undo() {
    if (history.length < 2) return;
    const removed = history.at(-1)!;
    const next = history.slice(0, -1);
    setHistory(next);
    setFuture((v) => [removed, ...v]);
    restore(next.at(-1)!);
  }
  function redo() {
    if (!future.length) return;
    const [image, ...rest] = future;
    setFuture(rest);
    setHistory((v) => [...v, image]);
    restore(image);
  }
  function clear() {
    if (!history.length) return;
    restore(history[0]);
    setHistory([history[0]]);
    setFuture([]);
    operations.current = [];
  }
  function save() {
    canvas.current!.toBlob(
      (blob) => {
        if (blob)
          onSave(
            new File([blob], `annotated-${Date.now()}.jpg`, {
              type: "image/jpeg",
            }),
            { version: 1, operations: operations.current },
          );
      },
      "image/jpeg",
      0.9,
    );
  }
  return (
    <section className="fixed inset-0 z-50 overflow-auto bg-slate-950/95 p-3 text-white">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-xl font-semibold">Annotate copy</h2>
        <div className="my-3 flex flex-wrap gap-2">
          {(["freehand", "arrow", "rectangle", "circle", "text"] as Tool[]).map(
            (value) => (
              <button
                aria-pressed={tool === value}
                className={`min-h-11 rounded px-3 ${tool === value ? "bg-blue-600" : "bg-slate-700"}`}
                onClick={() => setTool(value)}
                key={value}
              >
                {value}
              </button>
            ),
          )}
          <button className="min-h-11 rounded bg-slate-700 px-3" onClick={undo}>
            Undo
          </button>
          <button className="min-h-11 rounded bg-slate-700 px-3" onClick={redo}>
            Redo
          </button>
          <button
            className="min-h-11 rounded bg-slate-700 px-3"
            onClick={clear}
          >
            Clear
          </button>
        </div>
        <canvas
          ref={canvas}
          className="max-h-[65vh] w-full touch-none bg-black object-contain"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
        />
        <div className="mt-3 flex gap-3">
          <button
            className="min-h-12 flex-1 rounded bg-slate-700"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="min-h-12 flex-1 rounded bg-green-700"
            onClick={save}
          >
            Save annotated copy
          </button>
        </div>
      </div>
    </section>
  );
}
