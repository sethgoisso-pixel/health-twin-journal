import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { HeartPulse } from "lucide-react";
import { useLang, useT } from "@/lib/i18n";

const nav = [
  { to: "/", label: "Dashboard" },
  { to: "/log", label: "Daily log" },
  { to: "/profile", label: "Profile" },
  { to: "/card", label: "Emergency card" },
  { to: "/summary", label: "Doctor summary" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const t = useT();
  const [lang, setLang] = useLang();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link to="/" className="flex items-center gap-2 text-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <HeartPulse className="h-5 w-5" />
            </span>
            <span className="font-display text-xl">Health Twin</span>
          </Link>
          <nav className="flex flex-wrap gap-1 rounded-full bg-muted p-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: true }}
                className="rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-card text-foreground shadow-sm" }}
              >
                {t(n.label)}
              </Link>
            ))}
          </nav>
          <div className="inline-flex rounded-full bg-muted p-1 text-xs" role="group" aria-label={t("Language")}>
            {(["en", "fr"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-full px-3 py-1 ${lang === l ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const t = useT();
  return (
    <div className="mb-8">
      <h1 className="font-display text-4xl text-foreground">{t(title)}</h1>
      {subtitle && <p className="mt-2 text-muted-foreground">{t(subtitle)}</p>}
    </div>
  );
}
