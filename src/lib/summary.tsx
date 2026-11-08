import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { areaLabel } from "@/components/BodyMap";
import { toEntries, toPerson, useLogs, useProfile } from "@/lib/health-store";
import { NOT_A_DIAGNOSIS, buildBriefing, runHealthTools, symptomLabel } from "@/lib/health-engine";

export const Route = createFileRoute("/summary")({
  head: () => ({
    meta: [
      { title: "Doctor summary - Health Twin" },
      { name: "description", content: "A one-page summary of your last two weeks to bring to a consultation." },
      { property: "og:title", content: "Doctor summary - Health Twin" },
      { property: "og:description", content: "Your recent log, readings and questions, ready to print." },
    ],
  }),
  component: SummaryPage,
});

function SummaryPage() {
  const { profile } = useProfile();
  const { logs, loaded } = useLogs();
  const report = useMemo(() => runHealthTools(toPerson(profile), toEntries(logs)), [profile, logs]);
  const questions = useMemo(() => buildBriefing(report).doctorQuestions, [report]);
  const recent = useMemo(
    () => Object.values(logs).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14),
    [logs],
  );
  const today = new Date().toISOString().slice(0, 10);
  const areaDays = useMemo(() => {
    const c: Record<string, number> = {};
    recent.forEach((l) => l.areas.forEach((a) => { c[a] = (c[a] ?? 0) + 1; }));
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [recent]);

  if (loaded && recent.length === 0) {
    return (
      <AppShell>
        <PageTitle title="Doctor summary" />
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Nothing to summarise yet. <Link to="/log" className="text-primary underline">Log a few days</Link> first.
        </p>
      </AppShell>
    );
  }

  const risk = report.risk;
  const h = "font-display text-lg text-foreground";

  return (
    <AppShell>
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <PageTitle title="Doctor summary" subtitle="Bring this to a consultation. Self-reported data, built on your device." />
        <button onClick={() => window.print()} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90">
          Print or save as PDF
        </button>
      </div>

      <article className="space-y-6 rounded-2xl border border-border bg-card p-6 text-sm text-foreground print:border-0 print:p-0">
        <header>
          <h1 className="font-display text-2xl">Health summary{profile.name ? `: ${profile.name}` : ""}</h1>
          <p className="text-xs text-muted-foreground">Prepared {today} from {report.daysLogged} logged day(s). Self-reported. {NOT_A_DIAGNOSIS}</p>
        </header>

        <section>
          <h2 className={h}>Profile</h2>
          <p className="mt-1 text-muted-foreground">
            Age {profile.age || "-"} | Sex {profile.sex || "-"} | Blood group {profile.bloodGroup || "-"} | BMI {report.bmi ? `${report.bmi.value} (${report.bmi.category})` : "-"}
          </p>
          <p className="mt-1">Allergies: {profile.allergies.trim() || "none stated"}</p>
          <p>Known conditions: {profile.conditions.trim() || "none stated"}</p>
          <p>Regular medication: {profile.regularMedication.trim() || "none stated"}</p>
        </section>

        <section>
          <h2 className={h}>Last {report.daysLogged} logged day(s)</h2>
          <ul className="mt-1 space-y-1">
            <li>Average sleep: {report.sleep ? `${report.sleep.avg} h (${report.sleep.reading.label})` : "not logged"}</li>
            <li>Average water: {report.water ? `${report.water.avg} glasses a day` : "not logged"}</li>
            <li>Latest blood pressure: {report.bp ? `${report.bp.sys}/${report.bp.dia} (${report.bp.reading.label})` : "not logged"}</li>
            <li>Latest fasting glucose: {report.glucose ? `${report.glucose.value} mg/dL (${report.glucose.reading.label})` : "not logged"}</li>
          </ul>
        </section>

        <section>
          <h2 className={h}>Symptoms</h2>
          {report.symptomDays.length === 0 ? (
            <p className="mt-1 text-muted-foreground">None marked in this period.</p>
          ) : (
            <ul className="mt-1 list-disc pl-5">
              {report.symptomDays.map((s) => <li key={s.label}>{s.label}: {s.days} day(s)</li>)}
            </ul>
          )}
          {areaDays.length > 0 && (
            <p className="mt-2 text-muted-foreground">Where felt: {areaDays.map(([a, n]) => `${areaLabel(a)} (${n} day(s))`).join(", ")}</p>
          )}
          {report.redFlags.length > 0 && <p className="mt-2 font-medium">Marked recently: {report.redFlags.join("; ")}.</p>}
        </section>

        {report.patterns.length > 0 && (
          <section>
            <h2 className={h}>Associations in the log</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">{report.patterns.map((p, i) => <li key={i}>{p.text}</li>)}</ul>
          </section>
        )}

        <section>
          <h2 className={h}>Type 2 diabetes risk score (FINDRISC)</h2>
          {risk && "result" in risk ? (
            <p className="mt-1">
              {risk.result.score} of {risk.result.max}: {risk.result.band}, {risk.result.tenYearRisk.replace("about ", "about ")} over 10 years for people with this score. A screening score, not a diagnosis.
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">Not computed. Missing: {risk && "missing" in risk ? risk.missing.join(", ") : "profile data"}.</p>
          )}
        </section>

        {questions.length > 0 && (
          <section>
            <h2 className={h}>Questions to ask</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5">{questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
          </section>
        )}

        <section>
          <h2 className={h}>Daily entries</h2>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="py-1 pr-3">Date</th><th className="pr-3">Sleep h</th><th className="pr-3">Water</th><th className="pr-3">BP</th><th className="pr-3">Glucose</th><th>Symptoms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recent.map((l) => (
                  <tr key={l.date}>
                    <td className="py-1 pr-3">{l.date}</td>
                    <td className="pr-3">{l.sleepHours || "-"}</td>
                    <td className="pr-3">{l.waterGlasses || "-"}</td>
                    <td className="pr-3">{l.systolic && l.diastolic ? `${l.systolic}/${l.diastolic}` : "-"}</td>
                    <td className="pr-3">{l.glucose || "-"}</td>
                    <td>{l.symptomIds.length ? l.symptomIds.map(symptomLabel).join(", ") : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </article>
    </AppShell>
  );
}
