import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { BodyMap } from "@/components/BodyMap";
import { emptyLog, todayStr, useLogs, type DailyLog } from "@/lib/health-store";
import { SYMPTOMS, URGENT_ADVICE } from "@/lib/health-engine";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Daily log - Health Twin" },
      { name: "description", content: "Log meals, medications, sleep, water, symptoms and readings for each day." },
      { property: "og:title", content: "Daily log - Health Twin" },
      { property: "og:description", content: "Log your meals, medications, sleep, water and symptoms." },
    ],
  }),
  component: LogPage,
});

const fieldClass =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring";

function LogPage() {
  const t = useT();
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
  const toggle = (k: "symptomIds" | "areas", id: string) => {
    const has = form[k].includes(id);
    setForm({ ...form, [k]: has ? form[k].filter((x) => x !== id) : [...form[k], id] });
    setSaved(false);
  };
  const history = Object.values(logs).sort((a, b) => b.date.localeCompare(a.date));
  const redPicked = SYMPTOMS.filter((s) => s.red && form.symptomIds.includes(s.id));

  return (
    <AppShell>
      <PageTitle title="Daily log" subtitle="A few notes a day is all it takes. Stored only in this browser." />
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={(e) => { e.preventDefault(); saveLog({ ...form, date }); setSaved(true); }}
          className="space-y-4 rounded-2xl border border-border bg-card p-6 lg:col-span-2"
        >
          <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Date")}</span>
            <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Meals")}</span>
            <textarea rows={2} className={fieldClass} value={form.meals} onChange={set("meals")} placeholder={t("Oatmeal, salad, soup...")} /></label>
          <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Medications")}</span>
            <textarea rows={2} className={fieldClass} value={form.medications} onChange={set("medications")} placeholder={t("Vitamin D 1000 IU...")} /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Sleep (hours)")}</span>
              <input type="number" min={0} max={24} step="0.5" className={fieldClass} value={form.sleepHours} onChange={set("sleepHours")} /></label>
            <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Water (glasses)")}</span>
              <input type="number" min={0} className={fieldClass} value={form.waterGlasses} onChange={set("waterGlasses")} /></label>
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm text-muted-foreground">{t("Symptoms today (tap all that apply)")}</legend>
            <div className="flex flex-wrap gap-2">
              {SYMPTOMS.map((s) => {
                const on = form.symptomIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle("symptomIds", s.id)}
                    className={`rounded-full border px-3 py-1 text-sm transition-colors ${on ? (s.red ? "border-destructive bg-destructive/10 text-foreground" : "border-primary bg-primary/15 text-foreground") : "border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {t(s.label)}
                  </button>
                );
              })}
            </div>
            {redPicked.length > 0 && (
              <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-foreground">
                {t(`You marked: ${redPicked.map((s) => s.label.toLowerCase()).join(", ")}. ${URGENT_ADVICE}`)}
              </p>
            )}
          </fieldset>

          <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Other notes on symptoms (optional)")}</span>
            <textarea rows={2} className={fieldClass} value={form.symptoms} onChange={set("symptoms")} placeholder={t("Headache in the afternoon...")} /></label>

          <fieldset className="space-y-2">
            <legend className="text-sm text-muted-foreground">{t("Where did you feel it? (optional)")}</legend>
            <BodyMap selected={form.areas} onToggle={(id) => toggle("areas", id)} />
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Systolic BP (optional)")}</span>
              <input type="number" min={0} className={fieldClass} value={form.systolic} onChange={set("systolic")} placeholder="120" /></label>
            <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Diastolic BP (optional)")}</span>
              <input type="number" min={0} className={fieldClass} value={form.diastolic} onChange={set("diastolic")} placeholder="80" /></label>
            <label className="block space-y-1"><span className="text-sm text-muted-foreground">{t("Fasting glucose, mg/dL (optional)")}</span>
              <input type="number" min={0} className={fieldClass} value={form.glucose} onChange={set("glucose")} placeholder="90" /></label>
          </div>

          <div className="flex items-center gap-3">
            <button className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90">{t("Save entry")}</button>
            {saved && <span className="text-sm text-primary">{t("Saved")}</span>}
          </div>
        </form>

        <aside className="rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-xl text-foreground">{t("History")}</h2>
          {history.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("No entries yet.")}</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {history.map((l) => (
                <li key={l.date} className="flex items-center justify-between rounded-xl bg-card px-3 py-2 text-sm">
                  <button type="button" onClick={() => setDate(l.date)} className="text-left text-foreground hover:text-primary">
                    {l.date}
                    <span className="block text-xs text-muted-foreground">
                      {t(`${l.sleepHours || "-"} h sleep | ${l.waterGlasses || "-"} water | ${l.symptomIds.length} symptom(s)`)}
                    </span>
                  </button>
                  <button type="button" onClick={() => deleteLog(l.date)} className="text-xs text-muted-foreground hover:text-destructive">{t("Delete")}</button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </AppShell>
  );
}
