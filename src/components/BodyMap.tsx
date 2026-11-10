import { useState, type KeyboardEvent } from "react";
import { BACK, FRONT, type Part } from "@/lib/body-parts";

export const BODY_AREAS: { id: string; label: string }[] = [
  { id: "head", label: "Head" },
  { id: "chest", label: "Chest" },
  { id: "abdomen", label: "Abdomen" },
  { id: "back", label: "Back" },
  { id: "right_arm", label: "Right arm" },
  { id: "left_arm", label: "Left arm" },
  { id: "right_leg", label: "Right leg" },
  { id: "left_leg", label: "Left leg" },
];

export const areaLabel = (id: string) => BODY_AREAS.find((a) => a.id === id)?.label ?? id;

type Props = {
  /** Areas currently marked (editable mode). */
  selected?: string[];
  /** Called when an area is tapped. Leave out for a read-only map. */
  onToggle?: (id: string) => void;
  /** Read-only heat: how many days each area was marked. */
  counts?: Record<string, number>;
};

/**
 * Anatomical body map with organs, front and back views.
 * The person faces you in the front view, so "right" is on the left of the picture.
 */
export function BodyMap({ selected = [], onToggle, counts }: Props) {
  const [view, setView] = useState<"front" | "back">("front");
  const parts = view === "front" ? FRONT : BACK;
  const max = counts ? Math.max(1, ...Object.values(counts)) : 1;
  const strength = (area: string) => (counts ? (counts[area] ?? 0) / max : selected.includes(area) ? 1 : 0);

  const areas: string[] = [];
  parts.forEach((p) => { if (!areas.includes(p.area)) areas.push(p.area); });

  const draw = (p: Part, s: number) => {
    const t = p.mirror ? "translate(200,0) scale(-1,1)" : undefined;
    if (p.kind === "body") {
      return (
        <path
          key={p.id}
          d={p.d}
          transform={t}
          fill={s > 0 ? "var(--primary)" : "var(--muted)"}
          fillOpacity={s > 0 ? 0.2 + 0.45 * s : 1}
          stroke="var(--border)"
          strokeWidth={1.5}
        />
      );
    }
    return (
      <path
        key={p.id}
        d={p.d}
        transform={t}
        fill={p.fill}
        stroke={s > 0 ? "var(--primary)" : "rgba(0,0,0,0.25)"}
        strokeWidth={s > 0 ? 2.5 : 0.8}
        style={s > 0 ? { filter: "drop-shadow(0 0 4px var(--primary))" } : undefined}
      />
    );
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="inline-flex rounded-full bg-muted p-1 text-sm">
        {(["front", "back"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            aria-pressed={view === v}
            className={`rounded-full px-4 py-1 ${view === v ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}
          >
            {v === "front" ? "Front" : "Back"}
          </button>
        ))}
      </div>
      <svg viewBox="0 0 200 440" className="h-80 w-auto" role="group" aria-label={`Body map, ${view} view`}>
        {areas.map((area) => {
          const s = strength(area);
          const label = `${areaLabel(area)}${selected.includes(area) ? ", marked" : counts?.[area] ? `, marked on ${counts[area]} day(s)` : ""}`;
          return (
            <g
              key={area}
              role={onToggle ? "button" : "img"}
              aria-label={label}
              aria-pressed={onToggle ? selected.includes(area) : undefined}
              tabIndex={onToggle ? 0 : -1}
              style={{ cursor: onToggle ? "pointer" : "default" }}
              onClick={onToggle ? () => onToggle(area) : undefined}
              onKeyDown={
                onToggle
                  ? (e: KeyboardEvent) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onToggle(area);
                      }
                    }
                  : undefined
              }
            >
              {parts.filter((p) => p.area === area && p.kind === "body").map((p) => draw(p, s))}
              {parts.filter((p) => p.area === area && p.kind === "organ").map((p) => draw(p, s))}
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground">{onToggle ? "Tap an area where you feel something." : "Areas marked in the last 14 days."}</p>
    </div>
  );
}
