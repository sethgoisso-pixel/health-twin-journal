import { useCallback, useEffect, useState } from "react";
import { FR } from "@/lib/i18n-fr";

/**
 * English / French display layer. The health engine, the verifier and the AI stay in English;
 * this only changes what the person reads. Anything without a French text is shown in English.
 */
export type Lang = "en" | "fr";

const KEY = "health-twin:lang";
const listeners = new Set<(l: Lang) => void>();

export function useLang(): [Lang, (l: Lang) => void] {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    try {
      const s = localStorage.getItem(KEY);
      if (s === "fr" || s === "en") setLang(s);
    } catch {
      /* keep English */
    }
    listeners.add(setLang);
    return () => {
      listeners.delete(setLang);
    };
  }, []);
  const change = useCallback((l: Lang) => {
    try {
      localStorage.setItem(KEY, l);
    } catch {
      /* not saved, still applied */
    }
    listeners.forEach((f) => f(l));
  }, []);
  return [lang, change];
}

/** Returns t(): translates an English text to the chosen language. */
export function useT(): (s: string) => string {
  const [lang] = useLang();
  return useCallback((s: string) => tr(lang, s), [lang]);
}

export function tr(lang: Lang, text: string): string {
  return lang === "fr" ? T(text) : text;
}

const lowerIndex = new Map<string, string>(Object.entries(FR).map(([k, v]) => [k.toLowerCase(), v]));

function dict(s: string): string | undefined {
  const d = FR[s];
  if (d !== undefined) return d;
  // Labels the engine lower-cases ("headache" for "Headache").
  const lo = lowerIndex.get(s);
  if (lo !== undefined && s === s.toLowerCase()) return lo.charAt(0).toLowerCase() + lo.slice(1);
  return undefined;
}

const MISSING: string[] = [
  "sex (Female or Male, needed for waist thresholds)",
  "waist circumference",
  "height and weight",
  "physical activity",
  "fruit and vegetables",
  "blood pressure medication",
  "past high glucose",
  "family history",
  "age",
];

function items(list: string): string {
  let out = list;
  for (const k of MISSING) {
    const f = FR[k];
    if (f) out = out.split(k).join(f);
  }
  return out;
}

const semi = (s: string) => s.split("; ").map(T).join("; ");
const paren = (s: string) => s.replace(/\((.+)\)$/, (_m, l: string) => `(${T(l)})`);

type Rule = [RegExp, (m: RegExpMatchArray) => string];

const RULES: Rule[] = [
  [/^Hello, (.+)$/, (m) => `Bonjour, ${m[1]}`],
  [/^Average sleep over the last (\d+) logged day\(s\): ([\d.]+) hours, which (.+)\.$/, (m) => `Sommeil moyen sur les ${m[1]} derniers jours not\u00e9s : ${m[2]} heures, ce qui ${T(m[3]!)}.`],
  [/^Average water: ([\d.]+) glasses a day\.$/, (m) => `Eau moyenne : ${m[1]} verres par jour.`],
  [/^Latest blood pressure (\d+)\/(\d+): (.+)\.$/, (m) => `Derni\u00e8re tension art\u00e9rielle ${m[1]}/${m[2]} : ${T(m[3]!)}.`],
  [/^Latest fasting glucose ([\d.]+) mg\/dL: (.+)\.$/, (m) => `Derni\u00e8re glyc\u00e9mie \u00e0 jeun ${m[1]} mg/dL : ${T(m[2]!)}.`],
  [/^Type 2 diabetes risk score (\d+) of (\d+) \((.+)\), meaning about (\d+) in (\d+) chance over 10 years for people with this score\.$/,
    (m) => `Score de risque de diab\u00e8te de type 2 : ${m[1]} sur ${m[2]} (${T("risk: " + m[3])}), soit environ ${m[4]} chance sur ${m[5]} sur 10 ans pour les personnes ayant ce score.`],
  [/^The diabetes risk score needs more information: (.+)\.$/, (m) => `Le score de risque de diab\u00e8te a besoin de plus d'informations : ${items(m[1]!)}.`],
  [/^The type 2 diabetes risk score is not shown\. (.+)$/, (m) => `Le score de risque de diab\u00e8te de type 2 n'est pas affich\u00e9. ${T(m[1]!)}`],
  [/^This score was designed for adults aged (\d+) and over, so it is not shown\.$/, (m) => `Ce score a \u00e9t\u00e9 con\u00e7u pour les adultes de ${m[1]} ans et plus, il n'est donc pas affich\u00e9.`],
  [/^(Mood check \(PHQ-2\)|Worry check \(GAD-2\)): (\d+) of (\d+)\.( That is at or above the usual cutoff of (\d+), so it is worth talking with a doctor or counsellor\.| That is below the usual cutoff\.)$/,
    (m) => {
      const head = m[1]!.startsWith("Mood") ? "Test d'humeur (PHQ-2)" : "Test d'inqui\u00e9tude (GAD-2)";
      const tail = m[4]!.includes("below")
        ? " C'est en dessous du seuil habituel."
        : ` C'est au niveau du seuil habituel de ${m[5]} ou au-dessus, \u00e7a vaut donc la peine d'en parler avec un m\u00e9decin ou un conseiller.`;
      return `${head} : ${m[2]} sur ${m[3]}.${tail}`;
    }],
  [/^(.+) was logged on (\d+) of (\d+) (days with under 6 hours of sleep|days with under 4 glasses of water), against (\d+) of (\d+) (days with more sleep|days with more water)\. This is an association in your own log, not proof of a cause\.$/,
    (m) => `${T(m[1]!)} a \u00e9t\u00e9 not\u00e9 ${m[2]} jours sur ${m[3]} parmi ${T(m[4]!)}, contre ${m[5]} sur ${m[6]} parmi ${T(m[7]!)}. C'est une association dans ton propre journal, pas la preuve d'une cause.`],
  [/^(.+) seems to come more often when my (sleep|water) is lower\. Is that worth looking into\?$/,
    (m) => `${T(m[1]!)} semble arriver plus souvent ${m[2] === "sleep" ? "quand je dors moins" : "quand je bois moins d'eau"}. Est-ce que \u00e7a vaut la peine d'y regarder ?`],
  [/^Most frequent symptom: (.+), on (\d+) of (\d+) logged day\(s\)\.$/, (m) => `Sympt\u00f4me le plus fr\u00e9quent : ${T(m[1]!)}, sur ${m[2]} des ${m[3]} jours not\u00e9s.`],
  [/^Logged: (.+)\.$/, (m) => `Not\u00e9 : ${semi(m[1]!)}.`],
  [/^Marked recently: (.+)\.$/, (m) => `Not\u00e9 r\u00e9cemment : ${semi(m[1]!)}.`],
  [/^You marked: (.+)\. (.+)$/, (m) => `Tu as not\u00e9 : ${m[1]!.split(", ").map(T).join(", ")}. ${T(m[2]!)}`],
  [/^The score needs: (.+)\.$/, (m) => `Le score a besoin de : ${items(m[1]!)}.`],
  [/^Not computed\. Missing: (.+)\.$/, (m) => `Non calcul\u00e9. Manque : ${items(m[1]!)}.`],
  [/^About (\d+) in (\d+) chance over 10 years for people with this score\.$/, (m) => `Environ ${m[1]} chance sur ${m[2]} sur 10 ans pour les personnes ayant ce score.`],
  [/^(\d+) of (\d+): (.+), about (\d+) in (\d+) over 10 years for people with this score\. A screening score, not a diagnosis\.$/,
    (m) => `${m[1]} sur ${m[2]} : ${T("risk: " + m[3])}, environ ${m[4]} sur ${m[5]} sur 10 ans pour les personnes ayant ce score. Un score de d\u00e9pistage, pas un diagnostic.`],
  [/^Source: (.+)\. (Validated mainly in European populations\. A screening score, not a diagnosis\.|A screen, not a diagnosis\.)$/,
    (m) => `Source : ${T(m[1]!)}. ${m[2]!.startsWith("Validated") ? "Valid\u00e9 surtout dans des populations europ\u00e9ennes. Un score de d\u00e9pistage, pas un diagnostic." : "Un d\u00e9pistage, pas un diagnostic."}`],
  [/^(Mood|Worry) \((PHQ-2|GAD-2)\): (\d+) of (\d+)(, at or above the usual cutoff|, below the usual cutoff)$/,
    (m) => `${m[1] === "Mood" ? "Humeur" : "Inqui\u00e9tude"} (${m[2]}) : ${m[3]} sur ${m[4]}${m[5]!.includes("below") ? ", en dessous du seuil habituel" : ", au niveau du seuil habituel ou au-dessus"}`],
  [/^(Mood|Worry) (\d+) of (\d+)( \(at or above the usual cutoff\))?$/,
    (m) => `${m[1] === "Mood" ? "Humeur" : "Inqui\u00e9tude"} ${m[2]} sur ${m[3]}${m[4] ? " (au niveau du seuil habituel ou au-dessus)" : ""}`],
  [/^Mood not answered$/, () => "Humeur sans r\u00e9ponse"],
  [/^Worry not answered$/, () => "Inqui\u00e9tude sans r\u00e9ponse"],
  [/^Screening questions, not a diagnosis\.$/, () => "Questions de d\u00e9pistage, pas un diagnostic."],
  [/^Prepared (\S+) from (\d+) logged day\(s\)\. Self-reported\. (.+)$/, (m) => `Pr\u00e9par\u00e9 le ${m[1]} \u00e0 partir de ${m[2]} jour(s) not\u00e9(s). D\u00e9clar\u00e9 par la personne. ${T(m[3]!)}`],
  [/^Health summary(?:: (.+))?$/, (m) => `R\u00e9sum\u00e9 de sant\u00e9${m[1] ? ` : ${m[1]}` : ""}`],
  [/^Last (\d+) logged day\(s\)$/, (m) => `${m[1]} derniers jours not\u00e9s`],
  [/^Age (.*) \| Sex (.*) \| Blood group (.*) \| BMI (.*)$/,
    (m) => `\u00c2ge ${m[1]} | Sexe ${T(m[2]!)} | Groupe sanguin ${m[3]} | IMC ${paren(m[4]!)}`],
  [/^Average sleep: (.+)$/, (m) => `Sommeil moyen : ${paren(m[1]!.replace(/^not logged$/, "non not\u00e9"))}`],
  [/^Average water: (.+)$/, (m) => `Eau moyenne : ${m[1]!.replace(" glasses a day", " verres par jour").replace(/^not logged$/, "non not\u00e9")}`],
  [/^Latest blood pressure: (.+)$/, (m) => `Derni\u00e8re tension art\u00e9rielle : ${paren(m[1]!.replace(/^not logged$/, "non not\u00e9"))}`],
  [/^Latest fasting glucose: (.+)$/, (m) => `Derni\u00e8re glyc\u00e9mie \u00e0 jeun : ${paren(m[1]!.replace(/^not logged$/, "non not\u00e9"))}`],
  [/^(Allergies|Known conditions|Regular medication): (.*)$/, (m) => `${T(m[1]!)} : ${T(m[2]!)}`],
  [/^Where felt: (.+)$/, (m) => `O\u00f9 ressenti : ${m[1]!.replace(/(^|, )([A-Za-z ]+?) \((\d+) day\(s\)\)/g, (_x, p: string, a: string, n: string) => `${p}${T(a)} (${n} jour(s))`)}`],
  [/^(.+): (\d+) day\(s\)$/, (m) => `${T(m[1]!)} : ${m[2]} jour(s)`],
  [/^(\d+) day\(s\)$/, (m) => `${m[1]} jour(s)`],
  [/^(\d+) marked$/, (m) => `${m[1]} not\u00e9(s)`],
  [/^Tapped: (.+)$/, (m) => `Touch\u00e9 : ${m[1]!.replace(/^([^(]+?)( \((.+)\))?$/, (_x, a: string, _b: string, c: string | undefined) => `${T(a)}${c ? ` (${T(c)})` : ""}`)}`],
  [/^(\d+(?:\.\d+)?|-) h sleep \| (\d+(?:\.\d+)?|-) water \| (\d+) symptom\(s\)$/, (m) => `${m[1]} h de sommeil | ${m[2]} d'eau | ${m[3]} sympt\u00f4me(s)`],
  // Trace of the tools
  [/^BMI ([\d.]+) \((.+), WHO\)$/, (m) => `IMC ${m[1]} (${T(m[2]!)}, OMS)`],
  [/^(\d+) logged day\(s\) in the window; sleep (.+) h on average$/, (m) => `${m[1]} jour(s) not\u00e9(s) dans la fen\u00eatre ; sommeil moyen ${T(m[2]!)} h`],
  [/^BP (\d+)\/(\d+): (.+)$/, (m) => `Tension ${m[1]}/${m[2]} : ${T(m[3]!)}`],
  [/^glucose ([\d.]+) mg\/dL: (.+)$/, (m) => `glyc\u00e9mie ${m[1]} mg/dL : ${T(m[2]!)}`],
  [/^Score (\d+) of (\d+): (.+), about (\d+) in (\d+) 10-year risk of type 2 diabetes$/,
    (m) => `Score ${m[1]} sur ${m[2]} : ${T("risk: " + m[3])}, environ ${m[4]} sur ${m[5]} de risque de diab\u00e8te de type 2 \u00e0 10 ans`],
  [/^Skipped: designed for adults aged (\d+) and over$/, (m) => `Ignor\u00e9 : con\u00e7u pour les adultes de ${m[1]} ans et plus`],
  [/^Not computed: missing (.+)$/, (m) => `Non calcul\u00e9 : manque ${items(m[1]!)}`],
  [/^PHQ-2 (\d+) of (\d+)$/, (m) => `PHQ-2 ${m[1]} sur ${m[2]}`],
  [/^GAD-2 (\d+) of (\d+)$/, (m) => `GAD-2 ${m[1]} sur ${m[2]}`],
  [/^(\d+) association\(s\) found in your log$/, (m) => `${m[1]} association(s) trouv\u00e9e(s) dans ton journal`],
  [/^Needs (\d+) logged days, has (\d+)$/, (m) => `Il faut ${m[1]} jours not\u00e9s, il y en a ${m[2]}`],
  [/^Urgent: (.+)$/, (m) => `Urgent : ${m[1]!.split(", ").map(T).join(", ")}`],
];

function T(text: string): string {
  const d = dict(text);
  if (d !== undefined) return d;
  for (const [re, fn] of RULES) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  if (text.includes("; ")) return semi(text);
  return text;
}
