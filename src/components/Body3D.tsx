import { useEffect, useRef, useState } from "react";
import type { AnatomyView, Picked } from "@/lib/anatomy-view";
import { useT } from "@/lib/i18n";

type Props = {
  selected: string[];
  counts?: Record<string, number> | undefined;
  onPick: (p: Picked) => void;
  /** Called when 3D cannot start (no WebGL), so the parent can fall back to the flat map. */
  onUnavailable: () => void;
};

/** Turnable 3D anatomy. Model: BodyParts3D, CC BY-SA 2.1 Japan (see the credit under the figure). */
export function Body3D({ selected, counts, onPick, onUnavailable }: Props) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewRef = useRef<AnatomyView | null>(null);
  const [showOrgans, setShowOrgans] = useState(true);
  const [showBones, setShowBones] = useState(false);
  const latest = useRef({ selected, counts, showOrgans, showBones });
  latest.current = { selected, counts, showOrgans, showBones };
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  const failRef = useRef(onUnavailable);
  failRef.current = onUnavailable;

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    import("@/lib/anatomy-view")
      .then((m) => {
        if (cancelled) return;
        const v = m.createAnatomyView(canvas, (p) => pickRef.current(p));
        if (!v) {
          failRef.current();
          return;
        }
        viewRef.current = v;
        v.setState(latest.current);
      })
      .catch(() => {
        if (!cancelled) failRef.current();
      });
    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    viewRef.current?.setState({ selected, counts, showOrgans, showBones });
  }, [selected, counts, showOrgans, showBones]);

  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs ${on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`;

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        className="h-96 w-full max-w-xs rounded-xl"
        role="img"
        aria-label="Interactive 3D anatomy model. Drag to turn it, pinch to zoom, tap an organ to mark its area."
      />
      <div className="inline-flex rounded-full bg-muted p-1">
        <button type="button" onClick={() => viewRef.current?.turnTo("front")} className={chip(false)}>
          {t("Front")}
        </button>
        <button type="button" onClick={() => viewRef.current?.turnTo("back")} className={chip(false)}>
          {t("Back")}
        </button>
        <button type="button" aria-pressed={showOrgans} onClick={() => setShowOrgans((v) => !v)} className={chip(showOrgans)}>
          {t("Organs")}
        </button>
        <button type="button" aria-pressed={showBones} onClick={() => setShowBones((v) => !v)} className={chip(showBones)}>
          {t("Bones")}
        </button>
        <button type="button" onClick={() => viewRef.current?.resetView()} className={chip(false)}>
          {t("Reset view")}
        </button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground">
        Anatomy model: BodyParts3D, Life Science Integrated Database Center, CC BY-SA 2.1 Japan.
      </p>
    </div>
  );
}
