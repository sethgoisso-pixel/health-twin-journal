import { createFileRoute, Link } from "@tanstack/react-router";
import { Droplets, Moon, Pill, Activity } from "lucide-react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { bmiLabel, computeBmi, todayStr, useLogs, useProfile } from "@/lib/health-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Health Twin" },
      { name: "description", content: "Your personal health overview: sleep, water, symptoms and BMI at a glance." },
      { property: "og:title", content: "Dashboard — Health Twin" },
      { property: "og:description", content: "Your personal health overview at a glance." },
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

function Dashboard() {
  const { profile } = useProfile();
  const { logs } = useLogs();
  const sorted = Object.values(logs).sort((a, b) => b.date.localeCompare(a.date));
  const last7 = sorted.slice(0, 7);
  const avg = (key: "sleepHours" | "waterGlasses") => {
    const vals = last7.map((l) => parseFloat(l[key])).filter((v) => !isNaN(v));
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  };
  const bmi = computeBmi(profile.heightCm, profile.weightKg);
  const today = logs[todayStr()];
  const maxSleep = Math.max(10, ...last7.map((l) => parseFloat(l.sleepHours) || 0));

  return (
    <AppShell>
      <PageTitle
        title={profile.name ? `Hello, ${profile.name}` : "Your health, gently tracked"}
        subtitle="A calm overview of the last seven logged days."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Moon className="h-4 w-4" />} label="Avg sleep" value={avg("sleepHours") === "—" ? "—" : `${avg("sleepHours")} h`} />
        <Stat icon={<Droplets className="h-4 w-4" />} label="Avg water" value={avg("waterGlasses") === "—" ? "—" : `${avg("waterGlasses")} glasses`} />
        <Stat icon={<Activity className="h-4 w-4" />} label="BMI" value={bmi ? String(bmi) : "—"} hint={bmi ? bmiLabel(bmi) : "Add height & weight in Profile"} />
        <Stat icon={<Pill className="h-4 w-4" />} label="Days logged" value={String(sorted.length)} />
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
              <div><dt className="text-muted-foreground">Sleep</dt><dd className="text-foreground">{today.sleepHours || "—"} h</dd></div>
              <div><dt className="text-muted-foreground">Water</dt><dd className="text-foreground">{today.waterGlasses || "—"} glasses</dd></div>
              <div><dt className="text-muted-foreground">Symptoms</dt><dd className="text-foreground">{today.symptoms || "None noted"}</dd></div>
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
        <h2 className="font-display text-xl text-foreground">Recent symptoms</h2>
        {sorted.filter((l) => l.symptoms).length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing recorded — that's good news.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border">
            {sorted.filter((l) => l.symptoms).slice(0, 5).map((l) => (
              <li key={l.date} className="flex gap-4 py-2 text-sm">
                <span className="w-24 shrink-0 text-muted-foreground">{l.date}</span>
                <span className="text-foreground">{l.symptoms}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
