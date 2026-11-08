import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell, PageTitle } from "@/components/AppShell";
import { useProfile, type Profile } from "@/lib/health-store";
import { qrGrid, qrSvgPath } from "@/lib/qr";

export const Route = createFileRoute("/card")({
  head: () => ({
    meta: [
      { title: "Emergency card - Health Twin" },
      { name: "description", content: "A printable emergency card with a QR code that any phone camera can read, with no internet needed." },
      { property: "og:title", content: "Emergency card - Health Twin" },
      { property: "og:description", content: "Allergies, blood group, medication and a contact, readable by a doctor anywhere." },
    ],
  }),
  component: CardPage,
});

/** The plain text stored in the QR code. A phone camera shows it as is: no app, no server, no internet. */
function cardText(p: Profile): string {
  const line = (label: string, v: string) => (v.trim() ? `${label}: ${v.trim().replace(/\s+/g, " ")}` : null);
  return [
    "EMERGENCY MEDICAL CARD (self-reported)",
    line("Name", p.name),
    line("Age", p.age),
    line("Sex", p.sex),
    line("Blood group", p.bloodGroup),
    line("Allergies", p.allergies),
    line("Conditions", p.conditions),
    line("Regular medication", p.regularMedication),
    line("Emergency contact", p.emergencyContact),
    "Made with Health Twin. Not verified by a doctor.",
  ].filter((x): x is string => x !== null).join("\n");
}

function CardPage() {
  const { profile, loaded } = useProfile();
  const text = useMemo(() => cardText(profile), [profile]);
  const qr = useMemo(() => {
    try {
      return qrSvgPath(qrGrid(text));
    } catch {
      return null; // text too long for a QR code
    }
  }, [text]);

  const rows: [string, string][] = [
    ["Name", profile.name],
    ["Age", profile.age],
    ["Sex", profile.sex],
    ["Blood group", profile.bloodGroup],
    ["Allergies", profile.allergies],
    ["Known conditions", profile.conditions],
    ["Regular medication", profile.regularMedication],
    ["Emergency contact", profile.emergencyContact],
  ];
  const empty = loaded && rows.every(([, v]) => !v.trim());

  return (
    <AppShell>
      <div className="print:hidden">
        <PageTitle title="Emergency card" subtitle="Your key facts for a doctor in another city or country. Built on your device, nothing is uploaded." />
      </div>

      {empty ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground print:hidden">
          Your card is empty. <Link to="/profile" className="text-primary underline">Fill in your profile</Link> first (allergies, conditions, medication, emergency contact).
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <article className="rounded-2xl border-2 border-primary/40 bg-card p-6 lg:col-span-2 print:border-black">
            <h2 className="font-display text-2xl text-foreground">Emergency medical card</h2>
            <p className="text-xs text-muted-foreground">Self-reported. Not verified by a doctor.</p>
            <dl className="mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k} className={k === "Allergies" || k === "Regular medication" || k === "Known conditions" ? "sm:col-span-2" : ""}>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">{k}</dt>
                  <dd className="whitespace-pre-wrap text-foreground">{v.trim() || "-"}</dd>
                </div>
              ))}
            </dl>
          </article>

          <aside className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-secondary p-6 print:border-black">
            {qr ? (
              <svg viewBox={`0 0 ${qr.size} ${qr.size}`} className="w-full max-w-[220px] rounded-lg bg-white" role="img" aria-label="QR code with the card text" shapeRendering="crispEdges">
                <path d={qr.d} fill="#000" />
              </svg>
            ) : (
              <p className="text-sm text-destructive">The card text is too long for a QR code. Shorten the profile fields.</p>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Any phone camera reads it and shows the text above. No app and no internet needed.
            </p>
            <button onClick={() => window.print()} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 print:hidden">
              Print or save as PDF
            </button>
          </aside>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground print:hidden">
        Privacy: anyone who scans this code can read everything on the card. Print only what you are comfortable sharing, and keep the card where a responder would look.
      </p>
    </AppShell>
  );
}
