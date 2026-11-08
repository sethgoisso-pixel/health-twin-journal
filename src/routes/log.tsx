import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { emptyLog, todayStr, useLogs, type DailyLog } from "@/lib/health-store";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Daily log — Health Twin" },
      { name: "description", content: "Log meals, medications, sleep, water and symptoms for each day." },
      { property: "og:title", content: "Daily log — Health Twin" },
      { property: "og:description", content: "Log your meals, medications, sleep, water and symptoms." },
    ],
  }),
  component: LogPage,
});

const fieldClass =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring";

function LogPage() {
  const { logs, saveLog, deleteLog, loaded } = useLogs();
  const [date, setDate] = useState("");
  const [form, setForm] = useState<DailyLog>(emptyLog(""));
  const [saved, setSaved] = useState(false);

  useEffect(() => { setDate(todayStr()); }, []);
  useEffect(() => {
    if (!date || !loaded) return;
    setForm(logs[date] ?? emptyLog(date));
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, loaded]);

  const set = (k: keyof DailyLog) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };
  const history = Object.values(logs).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <AppShell>
      <PageTitle title="Daily log" subtitle="A few notes a day is all it takes." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={(e) => { e.preventDefault(); saveLog({ ...form, date }); setSaved(true); }}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 lg:col-span-2"
        >
          <label className="block space-y-1"><span className="text-sm text-muted-foreground">Date</span>
            <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="block space-y-1"><span className="text-sm text-muted-foreground">Meals</span>
            <textarea rows={2} className={fieldClass} value={form.meals} onChange={set("meals")} placeholder="Oatmeal, salad, soup…" /></label>
          <label className="block space-y-1"><span className="text-sm text-muted-foreground">Medications</span>
            <textarea rows={2} className={fieldClass} value={form.medications} onChange={set("medications")} placeholder="Vitamin D 1000 IU…" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1"><span className="text-sm text-muted-foreground">Sleep (hours)</span>
              <input type="number" min={0} max={24} step="0.5" className={fieldClass} value={form.sleepHours} onChange={set("sleepHours")} /></label>
            <label className="block space-y-1"><span className="text-sm text-muted-foreground">Water (glasses)</span>
              <input type="number" min={0} className={fieldClass} value={form.waterGlasses} onChange={set("waterGlasses")} /></label>
          </div>
          <label className="block space-y-1"><span className="text-sm text-muted-foreground">Symptoms</span>
            <textarea rows={2} className={fieldClass} value={form.symptoms} onChange={set("symptoms")} placeholder="Headache in the afternoon…" /></label>
          <div className="flex items-center gap-3">
            <button className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90">Save entry</button>
            {saved && <span className="text-sm text-primary">Saved</span>}
          </div>
        </form>

        <aside className="rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-xl text-foreground">History</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {history.map((l) => (
                <li key={l.date} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
                  <button type="button" onClick={() => setDate(l.date)} className="text-left text-foreground hover:text-primary">
                    {l.date}
                    <span className="block text-xs text-muted-foreground">{l.sleepHours || "–"} h sleep · {l.waterGlasses || "–"} water</span>
                  </button>
                  <button type="button" onClick={() => deleteLog(l.date)} className="text-xs text-muted-foreground hover:text-destructive">Delete</button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
