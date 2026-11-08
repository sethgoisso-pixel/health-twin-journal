import type { KeyboardEvent } from "react";

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
 * A simple front-view body map. The person is facing you, so "right" is on the left of the picture.
 * "Back" has no place on a front view, so it is a button under the figure.
 */
export function BodyMap({ selected = [], onToggle, counts }: Props) {
  const max = counts ? Math.max(1, ...Object.values(counts)) : 1;
  const strength = (id: string) => {
    if (counts) return (counts[id] ?? 0) / max;
    return selected.includes(id) ? 1 : 0;
  };
  const shape = (id: string) => {
    const s = strength(id);
    return {
      fill: s > 0 ? "var(--primary)" : "var(--muted)",
      fillOpacity: s > 0 ? 0.25 + 0.6 * s : 1,
      stroke: "var(--border)",
      strokeWidth: 2,
      style: { cursor: onToggle ? "pointer" : "default" } as const,
      role: onToggle ? "button" : "img",
      tabIndex: onToggle ? 0 : -1,
      "aria-label": `${areaLabel(id)}${selected.includes(id) ? ", marked" : counts?.[id] ? `, marked on ${counts[id]} day(s)` : ""}`,
      "aria-pressed": onToggle ? selected.includes(id) : undefined,
      onClick: onToggle ? () => onToggle(id) : undefined,
      onKeyDown: onToggle
        ? (e: KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(id);
            }
          }
        : undefined,
    };
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 420" className="h-72 w-auto" role="group" aria-label="Body map, front view">
        <circle cx="100" cy="38" r="26" {...shape("head")} />
        <rect x="60" y="72" width="80" height="76" rx="18" {...shape("chest")} />
        <rect x="64" y="152" width="72" height="66" rx="16" {...shape("abdomen")} />
        <rect x="24" y="78" width="30" height="132" rx="14" {...shape("right_arm")} />
        <rect x="146" y="78" width="30" height="132" rx="14" {...shape("left_arm")} />
        <rect x="64" y="222" width="34" height="170" rx="16" {...shape("right_leg")} />
        <rect x="102" y="222" width="34" height="170" rx="16" {...shape("left_leg")} />
      </svg>
      {onToggle ? (
        <button
          type="button"
          onClick={() => onToggle("back")}
          aria-pressed={selected.includes("back")}
          className={`rounded-full border px-3 py-1 text-sm ${selected.includes("back") ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}
        >
          Back
        </button>
      ) : counts?.["back"] ? (
        <span className="rounded-full border border-primary bg-primary/15 px-3 py-1 text-sm text-foreground">Back, {counts["back"]} day(s)</span>
      ) : null}
    </div>
  );
}
