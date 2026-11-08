import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useProfile, type Profile } from "@/lib/health-store";
import { bmiCategory, bmiValue, num } from "@/lib/health-engine";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile - Health Twin" },
      { name: "description", content: "Your basic health profile, emergency information and diabetes risk questions." },
      { property: "og:title", content: "Profile - Health Twin" },
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
  const set = (k: keyof Profile) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };
  const bmi = bmiValue(num(form.heightCm), num(form.weightKg));

  const yesNo = (k: "activeDaily" | "fruitVegDaily" | "bpMedication" | "highGlucoseHistory", label: string) => (
    <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{label}</span>
      <select className={fieldClass} value={form[k]} onChange={set(k)}>
        <option value="">Select...</option><option value="yes">Yes</option><option value="no">No</option>
      </select></label>
  );

  return (
    <AppShell>
      <PageTitle title="Profile" subtitle="Stored only in this browser. Nothing is sent anywhere unless you press an AI button." />
      <form
        onSubmit={(e) => { e.preventDefault(); save(form); setSaved(true); }}
        className="space-y-6"
      >
        <section className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <h2 className="font-display text-xl text-foreground sm:col-span-2">About you</h2>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">Name</span>
            <input className={fieldClass} value={form.name} onChange={set("name")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">Age</span>
            <input type="number" min={0} className={fieldClass} value={form.age} onChange={set("age")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">Sex</span>
            <select className={fieldClass} value={form.sex} onChange={set("sex")}>
              <option value="">Select...</option><option>Female</option><option>Male</option><option>Other</option>
            </select></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">Blood group</span>
            <select className={fieldClass} value={form.bloodGroup} onChange={set("bloodGroup")}>
              <option value="">Select...</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}
            </select></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">Height (cm)</span>
            <input type="number" min={0} className={fieldClass} value={form.heightCm} onChange={set("heightCm")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">Weight (kg)</span>
            <input type="number" min={0} step="0.1" className={fieldClass} value={form.weightKg} onChange={set("weightKg")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">Waist circumference (cm)</span>
            <input type="number" min={0} className={fieldClass} value={form.waistCm} onChange={set("waistCm")} /></label>
          <div className="flex items-end text-sm text-muted-foreground">
            {bmi ? <>BMI <span className="mx-1 font-display text-lg text-foreground">{bmi}</span> ({bmiCategory(bmi)}, WHO)</> : "BMI appears once height and weight are set."}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <h2 className="font-display text-xl text-foreground sm:col-span-2">Emergency information</h2>
          <p className="text-sm text-muted-foreground sm:col-span-2">Used for your emergency card. Fill in only what you are comfortable carrying.</p>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">Allergies</span>
            <textarea rows={2} className={fieldClass} value={form.allergies} onChange={set("allergies")} placeholder="Penicillin, peanuts..." /></label>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">Known conditions</span>
            <textarea rows={2} className={fieldClass} value={form.conditions} onChange={set("conditions")} placeholder="Asthma, sickle cell trait..." /></label>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">Regular medication</span>
            <textarea rows={2} className={fieldClass} value={form.regularMedication} onChange={set("regularMedication")} placeholder="Name and dose as written on your prescription" /></label>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">Emergency contact (name and phone)</span>
            <input className={fieldClass} value={form.emergencyContact} onChange={set("emergencyContact")} /></label>
        </section>

        <section className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <h2 className="font-display text-xl text-foreground sm:col-span-2">Diabetes risk questions</h2>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            These feed the Finnish Diabetes Risk Score (FINDRISC). It estimates a 10-year risk of type 2 diabetes, is not a diagnosis, and was validated mainly in European populations.
          </p>
          {yesNo("activeDaily", "Do you do at least 30 minutes of physical activity every day?")}
          {yesNo("fruitVegDaily", "Do you eat fruit, vegetables or berries every day?")}
          {yesNo("bpMedication", "Have you ever taken medication for high blood pressure?")}
          {yesNo("highGlucoseHistory", "Have you ever been found to have high blood glucose (for example at a check-up or during illness)?")}
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">Family history of diabetes</span>
            <select className={fieldClass} value={form.family} onChange={set("family")}>
              <option value="">Select...</option>
              <option value="none">No relatives with diabetes</option>
              <option value="extended">Grandparent, aunt, uncle or cousin</option>
              <option value="close">Parent, brother, sister or child</option>
            </select></label>
        </section>

        <div className="flex items-center gap-3">
          <button className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90">Save profile</button>
          {saved && <span className="text-sm text-primary">Saved</span>}
        </div>
      </form>
    </AppShell>
  );
}
