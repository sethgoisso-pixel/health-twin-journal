import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Droplets, Moon, Pill, Activity, ShieldCheck, Sparkles, AlertTriangle } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { BodyMap } from "@/components/BodyMap";
import { todayStr, toEntries, toPerson, useLogs, useProfile } from "@/lib/health-store";
import { NOT_A_DIAGNOSIS, buildBriefing, runHealthTools, type Briefing } from "@/lib/health-engine";
import { explainReport } from "@/lib/health-ai.functions";

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

      {report.redFlags.length > 0 && (
        <div role="alert" className="mb-6 flex gap-3 rounded-2xl border border-destructive/50 bg-destructive/10 p-5 text-foreground">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium">Something in your recent log needs prompt attention</p>
            <p className="mt-1 text-sm">Logged: {report.redFlags.join("; ")}. Contact a doctor or your local emergency number now. This app cannot assess an emergency.</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Moon className="h-4 w-4" />} label="Avg sleep" value={report.sleep ? `${report.sleep.avg} h` : "-"} />
        <Stat icon={<Droplets className="h-4 w-4" />} label="Avg water" value={report.water ? `${report.water.avg} glasses` : "-"} />
        <Stat icon={<Activity className="h-4 w-4" />} label="BMI" value={report.bmi ? String(report.bmi.value) : "-"} hint={report.bmi ? `${report.bmi.category} (WHO)` : "Add height and weight in Profile"} />
        <Stat icon={<Pill className="h-4 w-4" />} label="Days logged" value={String(sorted.length)} />
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
            <Sparkles className="h-5 w-5 text-primary" /> Health briefing
          </h2>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
            {shown.source === "ai" ? "Written by AI, checked by the verifier" : "Rule-based, built from the tool results"}
          </span>
        </div>
        <p className="mt-4 font-medium text-foreground">{b.headline}</p>
        <ul className="mt-3 space-y-2 text-sm text-foreground">
          {b.points.map((p, i) => <li key={i} className="rounded-xl bg-secondary px-3 py-2">{p}</li>)}
        </ul>
        {b.doctorQuestions.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">Questions you could ask a doctor</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              {b.doctorQuestions.map((q, i) => <li key={i}>{q}</li>)}
            </ul>
          </div>
        )}
        {shown.note && <p className="mt-3 text-xs text-muted-foreground">{shown.note}</p>}
        {err && <p className="mt-3 text-xs text-destructive">{err}</p>}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={explain}
            disabled={busy || report.daysLogged === 0}
            className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Writing..." : "Explain with AI"}
          </button>
          <span className="text-xs text-muted-foreground">Sends only the computed results (no name, notes or medication names). {NOT_A_DIAGNOSIS}</span>
        </div>

        <details className="mt-5 rounded-xl border border-border p-4 text-sm">
          <summary className="cursor-pointer text-foreground">Tools the agent ran ({report.trace.length})</summary>
          <ol className="mt-3 space-y-1 text-muted-foreground">
            {report.trace.map((t, i) => (
              <li key={i}><span className="font-mono text-foreground">{t.tool}</span>: {t.summary}</li>
            ))}
          </ol>
        </details>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
            <ShieldCheck className="h-5 w-5 text-primary" /> Type 2 diabetes risk score
          </h2>
          {risk && "result" in risk ? (
            <>
              <p className="mt-3 text-sm text-foreground">
                <span className="font-display text-3xl">{risk.result.score}</span> of {risk.result.max} - {risk.result.band}. About {risk.result.tenYearRisk.replace("about ", "")} chance over 10 years for people with this score.
              </p>
              <table className="mt-4 w-full text-left text-sm">
                <tbody className="divide-y divide-border">
                  {risk.result.parts.map((p) => (
                    <tr key={p.label}><td className="py-1.5 text-muted-foreground">{p.label}</td><td className="py-1.5 text-right text-foreground">{p.points}</td></tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-muted-foreground">Source: {risk.result.source}. Validated mainly in European populations. A screening score, not a diagnosis.</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              The score needs: {risk && "missing" in risk ? risk.missing.join(", ") : "your profile"}. <Link to="/profile" className="text-primary underline">Complete your profile</Link>. Nothing is guessed.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-xl text-foreground">Where it hurt (14 days)</h2>
          {Object.keys(areaCounts).length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">Mark areas in the daily log to see them here.</p>
          ) : (
            <div className="mt-3"><BodyMap counts={areaCounts} /></div>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="rounded-2xl border border-border bg-card p-6 lg:col-span-2">
          <h2 className="font-display text-xl text-foreground">Sleep, last 7 entries</h2>
          {last7.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No entries yet.</p>
          ) : (
            <div className="mt-6 flex h-40 items-end gap-3">
              {[...last7].reverse().map((l) => {
                const h = parseFloat(l.sleepHours) || 0;
                return (
                  <div key={l.date} className="flex flex-1 flex-col items-center gap-2">
                    <span className="text-xs text-muted-foreground">{h || ""}</span>
                    <div className="w-full rounded-t-lg bg-primary/70" style={{ height: `${(h / maxSleep) * 100}%`, minHeight: 4 }} />
                    <span className="text-xs text-muted-foreground">{l.date.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-secondary p-6">
          <h2 className="font-display text-xl text-foreground">Today</h2>
          {today ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div><dt className="text-muted-foreground">Sleep</dt><dd className="text-foreground">{today.sleepHours || "-"} h</dd></div>
              <div><dt className="text-muted-foreground">Water</dt><dd className="text-foreground">{today.waterGlasses || "-"} glasses</dd></div>
              <div><dt className="text-muted-foreground">Symptoms</dt><dd className="text-foreground">{today.symptomIds.length ? `${today.symptomIds.length} marked` : "None marked"}</dd></div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">You haven't logged today yet.</p>
          )}
          <Link to="/log" className="mt-6 inline-flex rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
            {today ? "Edit today's log" : "Log today"}
          </Link>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl text-foreground">Most frequent symptoms (14 days)</h2>
        {report.symptomDays.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing recorded. That is good news.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {report.symptomDays.slice(0, 6).map((s) => (
              <li key={s.label} className="flex justify-between py-2 text-sm">
                <span className="text-foreground">{s.label}</span>
                <span className="text-muted-foreground">{s.days} day(s)</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
