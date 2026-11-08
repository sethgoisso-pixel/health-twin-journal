import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { bmiLabel, computeBmi, useProfile, type Profile } from "@/lib/health-store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — Health Twin" },
      { name: "description", content: "Your basic health profile: age, sex, blood group, height and weight." },
      { property: "og:title", content: "Profile — Health Twin" },
      { property: "og:description", content: "Your basic health profile." },
    ],
  }),
  component: ProfilePage,
});

const fieldClass =
  "w-full rounded-xl border border-input bg-background px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring";

function ProfilePage() {
  const { profile, save, loaded } = useProfile();
  const [form, setForm] = useState<Profile>(profile);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (loaded) setForm(profile); }, [loaded, profile]);
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };
  const bmi = computeBmi(form.heightCm, form.weightKg);

  return (
    <AppShell>
      <PageTitle title="Profile" subtitle="Stored only in this browser." />
      <form
        onSubmit={(e) => { e.preventDefault(); save(form); setSaved(true); }}
        className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2"
      >
        <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">Name</span>
          <input className={fieldClass} value={form.name} onChange={set("name")} /></label>
        <label className="space-y-1"><span className="text-sm text-muted-foreground">Age</span>
          <input type="number" min={0} className={fieldClass} value={form.age} onChange={set("age")} /></label>
        <label className="space-y-1"><span className="text-sm text-muted-foreground">Sex</span>
          <select className={fieldClass} value={form.sex} onChange={set("sex")}>
            <option value="">Select…</option><option>Female</option><option>Male</option><option>Other</option>
          </select></label>
        <label className="space-y-1"><span className="text-sm text-muted-foreground">Blood group</span>
          <select className={fieldClass} value={form.bloodGroup} onChange={set("bloodGroup")}>
            <option value="">Select…</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}
          </select></label>
        <label className="space-y-1"><span className="text-sm text-muted-foreground">Height (cm)</span>
          <input type="number" min={0} className={fieldClass} value={form.heightCm} onChange={set("heightCm")} /></label>
        <label className="space-y-1"><span className="text-sm text-muted-foreground">Weight (kg)</span>
          <input type="number" min={0} step="0.1" className={fieldClass} value={form.weightKg} onChange={set("weightKg")} /></label>
        <div className="flex items-end text-sm text-muted-foreground">
          {bmi ? <>BMI <span className="mx-1 font-display text-lg text-foreground">{bmi}</span> · {bmiLabel(bmi)}</> : "BMI appears once height and weight are set."}
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <button className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90">Save profile</button>
          {saved && <span className="text-sm text-primary">Saved</span>}
        </div>
      </form>
    </AppShell>
  );
}
