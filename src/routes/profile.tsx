import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useProfile, type Profile } from "@/lib/health-store";
import { bmiCategory, bmiValue, num } from "@/lib/health-engine";
import { useT } from "@/lib/i18n";

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
  const t = useT();
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
    <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t(label)}</span>
      <select className={fieldClass} value={form[k]} onChange={set(k)}>
        <option value="">{t("Select...")}</option><option value="yes">{t("Yes")}</option><option value="no">{t("No")}</option>
      </select></label>
  );

  const moodQ = (k: "phq1" | "phq2" | "gad1" | "gad2", label: string) => (
    <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t(label)}</span>
      <select className={fieldClass} value={form[k]} onChange={set(k)}>
        <option value="">{t("Select...")}</option>
        <option value="0">{t("Not at all")}</option>
        <option value="1">{t("Several days")}</option>
        <option value="2">{t("More than half the days")}</option>
        <option value="3">{t("Nearly every day")}</option>
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
          <h2 className="font-display text-xl text-foreground sm:col-span-2">{t("About you")}</h2>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t("Name")}</span>
            <input className={fieldClass} value={form.name} onChange={set("name")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">{t("Age")}</span>
            <input type="number" min={0} className={fieldClass} value={form.age} onChange={set("age")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">{t("Sex")}</span>
            <select className={fieldClass} value={form.sex} onChange={set("sex")}>
              <option value="">{t("Select...")}</option><option value="Female">{t("Female")}</option><option value="Male">{t("Male")}</option><option value="Other">{t("Other")}</option>
            </select></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">{t("Blood group")}</span>
            <select className={fieldClass} value={form.bloodGroup} onChange={set("bloodGroup")}>
              <option value="">{t("Select...")}</option>
              {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((b) => <option key={b}>{b}</option>)}
            </select></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">{t("Height (cm)")}</span>
            <input type="number" min={0} className={fieldClass} value={form.heightCm} onChange={set("heightCm")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">{t("Weight (kg)")}</span>
            <input type="number" min={0} step="0.1" className={fieldClass} value={form.weightKg} onChange={set("weightKg")} /></label>
          <label className="space-y-1"><span className="text-sm text-muted-foreground">{t("Waist circumference (cm)")}</span>
            <input type="number" min={0} className={fieldClass} value={form.waistCm} onChange={set("waistCm")} /></label>
          <div className="flex items-end text-sm text-muted-foreground">
            {bmi ? <>{t("BMI")} <span className="mx-1 font-display text-lg text-foreground">{bmi}</span> ({t(bmiCategory(bmi))}, {t("WHO")})</> : t("BMI appears once height and weight are set.")}
          </div>
        </section>

        <section className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <h2 className="font-display text-xl text-foreground sm:col-span-2">{t("Emergency information")}</h2>
          <p className="text-sm text-muted-foreground sm:col-span-2">{t("Used for your emergency card. Fill in only what you are comfortable carrying.")}</p>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t("Allergies")}</span>
            <textarea rows={2} className={fieldClass} value={form.allergies} onChange={set("allergies")} placeholder={t("Penicillin, peanuts...")} /></label>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t("Known conditions")}</span>
            <textarea rows={2} className={fieldClass} value={form.conditions} onChange={set("conditions")} placeholder={t("Asthma, sickle cell trait...")} /></label>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t("Regular medication")}</span>
            <textarea rows={2} className={fieldClass} value={form.regularMedication} onChange={set("regularMedication")} placeholder={t("Name and dose as written on your prescription")} /></label>
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t("Emergency contact (name and phone)")}</span>
            <input className={fieldClass} value={form.emergencyContact} onChange={set("emergencyContact")} /></label>
        </section>

        <section className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <h2 className="font-display text-xl text-foreground sm:col-span-2">{t("Diabetes risk questions")}</h2>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {t("These feed the Finnish Diabetes Risk Score (FINDRISC). It estimates a 10-year risk of type 2 diabetes, is not a diagnosis, and was validated mainly in European populations.")}
          </p>
          {yesNo("activeDaily", "Do you do at least 30 minutes of physical activity every day?")}
          {yesNo("fruitVegDaily", "Do you eat fruit, vegetables or berries every day?")}
          {yesNo("bpMedication", "Have you ever taken medication for high blood pressure?")}
          {yesNo("highGlucoseHistory", "Have you ever been found to have high blood glucose (for example at a check-up or during illness)?")}
          <label className="space-y-1 sm:col-span-2"><span className="text-sm text-muted-foreground">{t("Family history of diabetes")}</span>
            <select className={fieldClass} value={form.family} onChange={set("family")}>
              <option value="">{t("Select...")}</option>
              <option value="none">{t("No relatives with diabetes")}</option>
              <option value="extended">{t("Grandparent, aunt, uncle or cousin")}</option>
              <option value="close">{t("Parent, brother, sister or child")}</option>
            </select></label>
        </section>

        <section className="grid gap-5 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
          <h2 className="font-display text-xl text-foreground sm:col-span-2">{t("Mood and worry check")}</h2>
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {t("Over the last 2 weeks, how often have you been bothered by the following? These are the PHQ-2 and GAD-2 screening questions. They are not a diagnosis. A total of 3 or more on a pair is the usual cutoff to talk with a doctor or counsellor.")}
          </p>
          {moodQ("phq1", "Little interest or pleasure in doing things")}
          {moodQ("phq2", "Feeling down, depressed or hopeless")}
          {moodQ("gad1", "Feeling nervous, anxious or on edge")}
          {moodQ("gad2", "Not being able to stop or control worrying")}
        </section>

        <div className="flex items-center gap-3">
          <button className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90">{t("Save profile")}</button>
          {saved && <span className="text-sm text-primary">{t("Saved")}</span>}
        </div>
      </form>
    </AppShell>
  );
}
