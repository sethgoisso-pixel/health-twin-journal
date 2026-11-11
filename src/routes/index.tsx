import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Droplets, Moon, Pill, Activity, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { BodyMap } from "@/components/BodyMap";
import { todayStr, toEntries, toPerson, useLogs, useProfile } from "@/lib/health-store";
import { NOT_A_DIAGNOSIS, URGENT_ADVICE, buildBriefing, runHealthTools, type Briefing } from "@/lib/health-engine";
import { explainReport } from "@/lib/health-ai.functions";
import { clearAllData, loadDemo } from "@/lib/health-demo";
import { useLang, useT } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard - Health Twin" },
      { name: "description", content: "Your personal health overview: sleep, water, symptoms, a checked briefing and a diabetes risk score." },
      { property: "og:title", content: "Dashboard - Health Twin" },
      { property: "og:description", content: "A personal health agent that shows its work and never diagnoses." },
    ],
  }),
  component: Dashboard,
});

function Stat({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-3 font-display text-3xl text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

type Shown = { briefing: Briefing; source: "ai" | "rules"; note: string | null };

function Dashboard() {
  const t = useT();
  const [lang] = useLang();
  const { profile } = useProfile();
  const { logs } = useLogs();
  const sorted = Object.values(logs).sort((a, b) => b.date.localeCompare(a.date));
  const last7 = sorted.slice(0, 7);
  const today = logs[todayStr()];
  const maxSleep = Math.max(10, ...last7.map((l) => parseFloat(l.sleepHours) || 0));

  const report = useMemo(() => runHealthTools(toPerson(profile), toEntries(logs)), [profile, logs]);
  const rules = useMemo(() => buildBriefing(report), [report]);

  const [ai, setAi] = useState<Shown | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Drop a stale AI briefing when the underlying data changes.
  const [forKey, setForKey] = useState("");
  const key = JSON.stringify([report.daysLogged, report.redFlags, report.bmi, report.risk]);
  const shown: Shown = ai && forKey === key ? ai : { briefing: rules, source: "rules", note: null };

  const explain = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await explainReport({ data: { report: report as unknown as Record<string, unknown> } });
      setAi(r);
      setForKey(key);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The AI could not be reached. The rule-based briefing is still shown.");
    } finally {
      setBusy(false);
    }
  };

  const areaCounts = useMemo(() => {
    const c: Record<string, number> = {};
    sorted.slice(0, 14).forEach((l) => l.areas.forEach((a) => { c[a] = (c[a] ?? 0) + 1; }));
    return c;
  }, [sorted]);

  const b = shown.briefing;
  const risk = report.risk;

  return (
    <AppShell>
      <PageTitle
        title={profile.name ? `Hello, ${profile.name}` : "Your health, gently tracked"}
        subtitle="Your own notes, checked against published references. It shows its work and never diagnoses."
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-secondary p-4 text-sm">
        <span className="text-muted-foreground">
          {t(sorted.length === 0 ? "New here? See the agent working on an invented example person." : "Example data tools")}
        </span>
        <button
          onClick={() => {
            if (sorted.length === 0 || window.confirm(t("This replaces the data saved in this browser with an invented example. Continue?"))) loadDemo();
          }}
          className="rounded-full bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90"
        >
          {t("Load demo data")}
        </button>
        {sorted.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm(t("This deletes all data saved in this browser. Continue?"))) clearAllData();
            }}
            className="rounded-full border border-border px-4 py-2 text-foreground hover:bg-muted"
          >
            {t("Clear all data")}
          </button>
        )}
      </div>

      {report.redFlags.length > 0 && (
        <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-5 text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">{t("Something in your recent log needs prompt attention")}</p>
            <p className="mt-1 text-sm">{t(`Logged: ${report.redFlags.join("; ")}.`)} {t(URGENT_ADVICE)}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Moon className="h-4 w-4" />} label={t("Avg sleep")} value={report.sleep ? `${report.sleep.avg} h` : "-"} />
        <Stat icon={<Droplets className="h-4 w-4" />} label={t("Avg water")} value={report.water ? `${report.water.avg} ${t("glasses")}` : "-"} />
        <Stat icon={<Activity className="h-4 w-4" />} label={t("BMI")} value={report.bmi ? String(report.bmi.value) : "-"} hint={report.bmi ? `${t(report.bmi.category)} (${t("WHO")})` : t("Add height and weight in Profile")} />
        <Stat icon={<Pill className="h-4 w-4" />} label={t("Days logged")} value={String(sorted.length)} />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
            <Sparkles className="h-5 w-5 text-primary" /> {t("Health briefing")}
          </h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            {t(shown.source === "ai" ? "Written by AI, checked by the verifier" : "Rule-based, built from the tool results")}
          </span>
        </div>
        <p className="mt-4 font-medium text-foreground">{shown.source === "rules" ? t(b.headline) : b.headline}</p>
        <ul className="mt-3 space-y-2 text-sm text-foreground">
          {b.points.map((p, i) => <li key={i} className="rounded-xl bg-secondary px-3 py-2">{shown.source === "rules" ? t(p) : p}</li>)}
        </ul>
        {b.doctorQuestions.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">{t("Questions you could ask a doctor")}</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              {b.doctorQuestions.map((q, i) => <li key={i}>{shown.source === "rules" ? t(q) : q}</li>)}
            </ul>
          </div>
        )}
        {shown.note && <p className="mt-3 text-xs text-muted-foreground">{shown.note}</p>}
        {lang === "fr" && shown.source === "ai" && <p className="mt-3 text-xs text-muted-foreground">{t("The AI text is shown in English, the language of the contest.")}</p>}
        {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={explain}
            disabled={busy || report.daysLogged === 0}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {t(busy ? "Writing..." : "Explain with AI")}
          </button>
          <span className="text-xs text-muted-foreground">{t("Sends only the computed results (no name, notes or medication names).")} {t(NOT_A_DIAGNOSIS)}</span>
        </div>

        <details className="mt-5 rounded-xl border border-border p-4 text-sm">
          <summary className="cursor-pointer text-foreground">{t("Tools the agent ran")} ({report.trace.length})</summary>
          <ol className="mt-3 space-y-1 text-muted-foreground">
            {report.trace.map((step, i) => (
              <li key={i}><span className="font-mono text-foreground">{step.tool}</span>: {t(step.summary)}</li>
            ))}
          </ol>
        </details>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" /> {t("Type 2 diabetes risk score")}
          </h2>
          {risk && "result" in risk ? (
            <>
              <p className="mt-3 text-sm text-foreground">
                <span className="font-display text-3xl">{risk.result.score}</span> {t("of")} {risk.result.max} - {t("risk: " + risk.result.band)}. {t(`About ${risk.result.tenYearRisk.replace("about ", "")} chance over 10 years for people with this score.`)}
              </p>
              <table className="mt-4 w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {risk.result.parts.map((p) => (
                    <tr key={p.label}><td className="py-1.5 text-muted-foreground">{t(p.label)}</td><td className="py-1.5 text-right text-foreground">{p.points}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">{t(`Source: ${risk.result.source}. Validated mainly in European populations. A screening score, not a diagnosis.`)}</p>
            </>
          ) : risk && "notApplicable" in risk ? (
            <p className="mt-3 text-sm text-muted-foreground">{t(risk.notApplicable)} {t("Your sleep, water, readings and symptoms are still tracked below.")}</p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t(`The score needs: ${risk && "missing" in risk ? risk.missing.join(", ") : "your profile"}.`)} <Link to="/profile" className="text-primary underline">{t("Complete your profile")}</Link>. {t("Nothing is guessed.")}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-xl text-foreground">{t("Where it hurt (14 days)")}</h2>
          <div className="mt-3"><BodyMap counts={areaCounts} /></div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl text-foreground">{t("Mood and worry check")}</h2>
        {report.mood.low || report.mood.worry ? (
          <>
            <ul className="mt-3 space-y-1 text-sm text-foreground">
              {report.mood.low && <li>{t(`Mood (PHQ-2): ${report.mood.low.score} of ${report.mood.low.max}${report.mood.low.positive ? ", at or above the usual cutoff" : ", below the usual cutoff"}`)}</li>}
              {report.mood.worry && <li>{t(`Worry (GAD-2): ${report.mood.worry.score} of ${report.mood.worry.max}${report.mood.worry.positive ? ", at or above the usual cutoff" : ", below the usual cutoff"}`)}</li>}
            </ul>
            {(report.mood.low?.positive || report.mood.worry?.positive) && (
              <p className="mt-3 rounded-xl bg-secondary p-3 text-sm text-foreground">
                {t("Worth talking with a doctor or counsellor. If you ever feel unsafe or think about harming yourself, contact your local emergency number or someone you trust right away.")}
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t(`Source: ${report.mood.source}. A screen, not a diagnosis.`)}</p>
          </>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {t("Four quick questions in your")} <Link to="/profile" className="text-primary underline">{t("profile")}</Link> {t("give a mood and worry screen. Nothing is guessed.")}
          </p>
        )}
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-xl text-foreground">{t("Sleep, last 7 entries")}</h2>
          {last7.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t("No entries yet.")}</p>
          ) : (
            <div className="mt-6 flex h-40 items-end gap-3">
              {[...last7].reverse().map((l) => {
                const h = parseFloat(l.sleepHours) || 0;
                return (
                  <div key={l.date} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground">{h || ""}</span>
                    <div className="w-full rounded-t-lg bg-primary/70" style={{ height: `${Math.round((h / maxSleep) * 100)}px`, minHeight: 4 }} />
                    <span className="text-xs text-muted-foreground">{l.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-xl text-foreground">{t("Today")}</h2>
          {today ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-muted-foreground">{t("Sleep")}</dt><dd className="text-foreground">{today.sleepHours || "-"} h</dd></div>
              <div><dt className="text-muted-foreground">{t("Water")}</dt><dd className="text-foreground">{today.waterGlasses || "-"} {t("glasses")}</dd></div>
              <div><dt className="text-muted-foreground">{t("Symptoms")}</dt><dd className="text-foreground">{today.symptomIds.length ? t(`${today.symptomIds.length} marked`) : t("None marked")}</dd></div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t("You haven't logged today yet.")}</p>
          )}
          <Link to="/log" className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            {t(today ? "Edit today's log" : "Log today")}
          </Link>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl text-foreground">{t("Most frequent symptoms (14 days)")}</h2>
        {report.symptomDays.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("Nothing recorded. That is good news.")}</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {report.symptomDays.slice(0, 6).map((s) => (
              <li key={s.label} className="flex justify-between py-2 text-sm">
                <span className="text-foreground">{t(s.label)}</span>
                <span className="text-muted-foreground">{t(`${s.days} day(s)`)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
