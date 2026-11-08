/**
 * Health Twin engine: pure functions, no network, no storage.
 * Principle (same as Dhow): the model explains, tools compute, a verifier enforces.
 *
 * NOT a medical device. Nothing here diagnoses a disease or predicts when one will happen.
 * Every threshold below comes from a published reference and is named next to it.
 */

export type Level = "ok" | "watch" | "high" | "urgent";

export type SymptomDef = { id: string; label: string; red?: boolean };

/** Controlled vocabulary: structured symptoms can be counted, free text cannot. Red = needs prompt care. */
export const SYMPTOMS: SymptomDef[] = [
  { id: "headache", label: "Headache" },
  { id: "fatigue", label: "Unusual tiredness" },
  { id: "dizziness", label: "Dizziness" },
  { id: "nausea", label: "Nausea" },
  { id: "stomach_pain", label: "Stomach pain" },
  { id: "back_pain", label: "Back pain" },
  { id: "joint_pain", label: "Joint or muscle pain" },
  { id: "cough", label: "Cough" },
  { id: "fever", label: "Fever" },
  { id: "palpitations", label: "Racing or irregular heartbeat" },
  { id: "chest_pain", label: "Chest pain", red: true },
  { id: "breathless", label: "Shortness of breath", red: true },
  { id: "fainting", label: "Fainting", red: true },
  { id: "weakness_speech", label: "Sudden weakness or trouble speaking", red: true },
  { id: "severe_headache", label: "Sudden severe headache", red: true },
];

export const symptomLabel = (id: string) => SYMPTOMS.find((s) => s.id === id)?.label ?? id;

export type Entry = {
  date: string; // YYYY-MM-DD
  sleepHours: number | null;
  water: number | null; // glasses
  symptoms: string[]; // ids from SYMPTOMS
  systolic: number | null;
  diastolic: number | null;
  glucose: number | null; // fasting, mg/dL
  areas: string[]; // body areas with discomfort
};

export function num(s: string | number | null | undefined): number | null {
  if (s === null || s === undefined || s === "") return null;
  const n = typeof s === "number" ? s : parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/* ------------------------------------------------------------------ BMI (WHO) */

export function bmiValue(heightCm: number | null, weightKg: number | null): number | null {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  const h = heightCm / 100;
  return Math.round((weightKg / (h * h)) * 10) / 10;
}

/** WHO adult categories. */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal range";
  if (bmi < 30) return "overweight";
  return "obesity range";
}

/* --------------------------------------------------- Blood pressure (AHA 2017) */

export type Reading = { label: string; level: Level };

export function bpCategory(sys: number, dia: number): Reading {
  if (sys > 180 || dia > 120) return { label: "very high (hypertensive crisis range)", level: "urgent" };
  if (sys >= 140 || dia >= 90) return { label: "stage 2 high range", level: "high" };
  if (sys >= 130 || dia >= 80) return { label: "stage 1 high range", level: "watch" };
  if (sys >= 120) return { label: "elevated", level: "watch" };
  return { label: "normal range", level: "ok" };
}

/* ------------------------------------------- Fasting glucose, mg/dL (ADA / WHO) */

export function glucoseCategory(mgdl: number): Reading {
  if (mgdl < 54) return { label: "very low", level: "urgent" };
  if (mgdl < 70) return { label: "low", level: "watch" };
  if (mgdl < 100) return { label: "normal range", level: "ok" };
  if (mgdl < 126) return { label: "above normal (prediabetes range)", level: "watch" };
  return { label: "in the diabetes range (needs confirmation by a clinician)", level: "high" };
}

/* ------------------------------------------------------------- Sleep (AASM/SRS) */

export function sleepReading(avgHours: number): Reading {
  if (avgHours >= 7) return { label: "meets the 7 hours or more usually advised for adults", level: "ok" };
  if (avgHours >= 6) return { label: "a little under the 7 hours usually advised for adults", level: "watch" };
  return { label: "well under the 7 hours usually advised for adults", level: "high" };
}

/* ---------------------------------------------------------------------- FINDRISC
 * Finnish Diabetes Risk Score. Lindstrom J, Tuomilehto J. Diabetes Care 2003;26(3):725-731.
 * Estimates the 10-year risk of type 2 diabetes. Validated mainly in European populations. */

export type FamilyDiabetes = "none" | "extended" | "close";

export type FindriscInput = {
  age: number;
  bmi: number;
  waistCm: number;
  sex: "Female" | "Male";
  activeDaily: boolean; // at least 30 minutes of physical activity every day
  fruitVegDaily: boolean;
  bpMedication: boolean;
  highGlucoseHistory: boolean;
  family: FamilyDiabetes;
};

export type FindriscResult = {
  score: number;
  max: 26;
  band: "low" | "slightly elevated" | "moderate" | "high" | "very high";
  tenYearRisk: string; // e.g. "about 1 in 25"
  parts: { label: string; points: number }[];
  source: string;
};

export const FINDRISC_SOURCE = "FINDRISC, Lindstrom and Tuomilehto, Diabetes Care 2003";

export function findrisc(a: FindriscInput): FindriscResult {
  const parts: { label: string; points: number }[] = [];
  const add = (label: string, points: number) => parts.push({ label, points });

  add("Age", a.age < 45 ? 0 : a.age <= 54 ? 2 : a.age <= 64 ? 3 : 4);
  add("Body mass index", a.bmi < 25 ? 0 : a.bmi <= 30 ? 1 : 3);
  const lo = a.sex === "Male" ? 94 : 80;
  const hi = a.sex === "Male" ? 102 : 88;
  add("Waist circumference", a.waistCm < lo ? 0 : a.waistCm <= hi ? 3 : 4);
  add("Physical activity", a.activeDaily ? 0 : 2);
  add("Fruit, vegetables or berries", a.fruitVegDaily ? 0 : 1);
  add("Blood pressure medication", a.bpMedication ? 2 : 0);
  add("Past high blood glucose", a.highGlucoseHistory ? 5 : 0);
  add("Family history of diabetes", a.family === "close" ? 5 : a.family === "extended" ? 3 : 0);

  const score = parts.reduce((s, p) => s + p.points, 0);
  let band: FindriscResult["band"];
  let tenYearRisk: string;
  if (score < 7) { band = "low"; tenYearRisk = "about 1 in 100"; }
  else if (score <= 11) { band = "slightly elevated"; tenYearRisk = "about 1 in 25"; }
  else if (score <= 14) { band = "moderate"; tenYearRisk = "about 1 in 6"; }
  else if (score <= 20) { band = "high"; tenYearRisk = "about 1 in 3"; }
  else { band = "very high"; tenYearRisk = "about 1 in 2"; }
  return { score, max: 26, band, tenYearRisk, parts, source: FINDRISC_SOURCE };
}

/* ----------------------------------------------------------- Patterns in the log */

export type Pattern = {
  symptom: string; // label
  factor: string;
  daysWith: number;
  daysWithSymptom: number;
  daysWithout: number;
  daysWithoutSymptom: number;
  text: string;
};

const MIN_DAYS_LOGGED = 7;
const MIN_PER_GROUP = 3;

/**
 * Compares how often a symptom was logged on "exposed" days (short sleep, low water) against other days.
 * An association in the person's own log, never a cause. Needs enough days in both groups.
 */
export function findPatterns(entries: Entry[]): Pattern[] {
  if (entries.length < MIN_DAYS_LOGGED) return [];
  const factors: { name: string; known: (e: Entry) => boolean; exposed: (e: Entry) => boolean; withText: string; withoutText: string }[] = [
    {
      name: "sleep",
      known: (e) => e.sleepHours !== null,
      exposed: (e) => (e.sleepHours as number) < 6,
      withText: "days with under 6 hours of sleep",
      withoutText: "days with more sleep",
    },
    {
      name: "water",
      known: (e) => e.water !== null,
      exposed: (e) => (e.water as number) < 4,
      withText: "days with under 4 glasses of water",
      withoutText: "days with more water",
    },
  ];
  const out: Pattern[] = [];
  const ids = new Set<string>();
  entries.forEach((e) => e.symptoms.forEach((s) => ids.add(s)));
  for (const id of ids) {
    const total = entries.filter((e) => e.symptoms.includes(id)).length;
    if (total < MIN_PER_GROUP) continue;
    for (const f of factors) {
      const pool = entries.filter(f.known);
      const exp = pool.filter(f.exposed);
      const rest = pool.filter((e) => !f.exposed(e));
      if (exp.length < MIN_PER_GROUP || rest.length < MIN_PER_GROUP) continue;
      const a = exp.filter((e) => e.symptoms.includes(id)).length;
      const b = rest.filter((e) => e.symptoms.includes(id)).length;
      const ra = a / exp.length;
      const rb = b / rest.length;
      if (ra - rb < 0.3 || ra < rb * 1.5) continue;
      const label = symptomLabel(id).toLowerCase();
      out.push({
        symptom: symptomLabel(id),
        factor: f.name,
        daysWith: exp.length,
        daysWithSymptom: a,
        daysWithout: rest.length,
        daysWithoutSymptom: b,
        text: `${symptomLabel(id)} was logged on ${a} of ${exp.length} ${f.withText}, against ${b} of ${rest.length} ${f.withoutText}. This is an association in your own log, not proof of a cause.`,
      });
      void label;
    }
  }
  return out.sort((x, y) => y.daysWithSymptom / y.daysWith - x.daysWithSymptom / x.daysWith);
}

/* ------------------------------------------------------------------ Red flags */

export const URGENT_ADVICE =
  "Contact a doctor or your local emergency number now. This app cannot assess an emergency.";

/** Red-flag symptoms in the last two logged days, or a blood pressure in the crisis range. */
export function scanRedFlags(entries: Entry[]): string[] {
  const recent = [...entries].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 2);
  const flags: string[] = [];
  for (const e of recent) {
    for (const id of e.symptoms) {
      const d = SYMPTOMS.find((s) => s.id === id);
      if (d?.red && !flags.includes(d.label)) flags.push(d.label);
    }
    if (e.systolic !== null && e.diastolic !== null && bpCategory(e.systolic, e.diastolic).level === "urgent") {
      if (!flags.includes("Blood pressure in the crisis range")) flags.push("Blood pressure in the crisis range");
    }
    if (e.glucose !== null && glucoseCategory(e.glucose).level === "urgent" && !flags.includes("Very low blood glucose")) {
      flags.push("Very low blood glucose");
    }
  }
  return flags;
}

/* ------------------------------------------------------------------ Report */

export type PersonInput = {
  age: number | null;
  sex: "Female" | "Male" | "Other" | null;
  heightCm: number | null;
  weightKg: number | null;
  waistCm: number | null;
  answers: {
    activeDaily: boolean | null;
    fruitVegDaily: boolean | null;
    bpMedication: boolean | null;
    highGlucoseHistory: boolean | null;
    family: FamilyDiabetes | null;
  };
};

export type TraceStep = { tool: string; summary: string };

export type HealthReport = {
  windowDays: number;
  daysLogged: number;
  bmi: { value: number; category: string } | null;
  sleep: { avg: number; reading: Reading } | null;
  water: { avg: number } | null;
  bp: { sys: number; dia: number; reading: Reading } | null;
  glucose: { value: number; reading: Reading } | null;
  risk: { result: FindriscResult } | { missing: string[] } | null;
  patterns: Pattern[];
  symptomDays: { label: string; days: number }[];
  redFlags: string[];
  trace: TraceStep[];
};

const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);

/** Runs every tool on the last 14 logged days and records what each one did. */
export function runHealthTools(person: PersonInput, all: Entry[], windowDays = 14): HealthReport {
  const entries = [...all].sort((a, b) => b.date.localeCompare(a.date)).slice(0, windowDays);
  const trace: TraceStep[] = [];

  const bmi = bmiValue(person.heightCm, person.weightKg);
  const bmiOut = bmi ? { value: bmi, category: bmiCategory(bmi) } : null;
  trace.push({ tool: "compute_bmi", summary: bmiOut ? `BMI ${bmiOut.value} (${bmiOut.category}, WHO)` : "Height or weight missing" });

  const sleepVals = entries.map((e) => e.sleepHours).filter((v): v is number => v !== null);
  const sleepAvg = avg(sleepVals);
  const sleep = sleepAvg !== null ? { avg: sleepAvg, reading: sleepReading(sleepAvg) } : null;
  const waterAvg = avg(entries.map((e) => e.water).filter((v): v is number => v !== null));
  trace.push({ tool: "summarise_log", summary: `${entries.length} logged day(s) in the window; sleep ${sleepAvg ?? "not logged"} h on average` });

  const lastBp = entries.find((e) => e.systolic !== null && e.diastolic !== null);
  const bp = lastBp ? { sys: lastBp.systolic as number, dia: lastBp.diastolic as number, reading: bpCategory(lastBp.systolic as number, lastBp.diastolic as number) } : null;
  const lastGl = entries.find((e) => e.glucose !== null);
  const glucose = lastGl ? { value: lastGl.glucose as number, reading: glucoseCategory(lastGl.glucose as number) } : null;
  trace.push({
    tool: "check_vitals",
    summary: [bp ? `BP ${bp.sys}/${bp.dia}: ${bp.reading.label}` : "no BP reading", glucose ? `glucose ${glucose.value} mg/dL: ${glucose.reading.label}` : "no glucose reading"].join("; "),
  });

  // FINDRISC needs every input. Anything missing is listed, never guessed.
  let risk: HealthReport["risk"] = null;
  const missing: string[] = [];
  if (person.age === null) missing.push("age");
  if (bmi === null) missing.push("height and weight");
  if (person.waistCm === null) missing.push("waist circumference");
  if (person.sex !== "Female" && person.sex !== "Male") missing.push("sex (Female or Male, needed for waist thresholds)");
  const an = person.answers;
  if (an.activeDaily === null) missing.push("physical activity");
  if (an.fruitVegDaily === null) missing.push("fruit and vegetables");
  if (an.bpMedication === null) missing.push("blood pressure medication");
  if (an.highGlucoseHistory === null) missing.push("past high glucose");
  if (an.family === null) missing.push("family history");
  if (missing.length) {
    risk = { missing };
    trace.push({ tool: "score_findrisc", summary: `Not computed: missing ${missing.join(", ")}` });
  } else {
    const result = findrisc({
      age: person.age as number,
      bmi: bmi as number,
      waistCm: person.waistCm as number,
      sex: person.sex as "Female" | "Male",
      activeDaily: an.activeDaily as boolean,
      fruitVegDaily: an.fruitVegDaily as boolean,
      bpMedication: an.bpMedication as boolean,
      highGlucoseHistory: an.highGlucoseHistory as boolean,
      family: an.family as FamilyDiabetes,
    });
    risk = { result };
    trace.push({ tool: "score_findrisc", summary: `Score ${result.score} of ${result.max}: ${result.band}, ${result.tenYearRisk} 10-year risk of type 2 diabetes` });
  }

  const patterns = findPatterns(entries);
  trace.push({ tool: "detect_patterns", summary: patterns.length ? `${patterns.length} association(s) found in your log` : entries.length < MIN_DAYS_LOGGED ? `Needs ${MIN_DAYS_LOGGED} logged days, has ${entries.length}` : "No clear association found" });

  const counts = new Map<string, number>();
  entries.forEach((e) => e.symptoms.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1)));
  const symptomDays = [...counts.entries()].map(([id, days]) => ({ label: symptomLabel(id), days })).sort((a, b) => b.days - a.days);

  const redFlags = scanRedFlags(entries);
  trace.push({ tool: "scan_red_flags", summary: redFlags.length ? `Urgent: ${redFlags.join(", ")}` : "No red flags in the last two logged days" });

  return {
    windowDays,
    daysLogged: entries.length,
    bmi: bmiOut,
    sleep,
    water: waterAvg !== null ? { avg: waterAvg } : null,
    bp,
    glucose,
    risk,
    patterns,
    symptomDays,
    redFlags,
    trace,
  };
}

/* ------------------------------------------------------------------ Briefing */

export type Briefing = { headline: string; points: string[]; doctorQuestions: string[]; urgent: boolean };

export const NOT_A_DIAGNOSIS = "This is not a medical diagnosis. It cannot replace a doctor.";

/** Deterministic briefing built only from tool results. Used when the AI is unavailable or its text is rejected. */
export function buildBriefing(r: HealthReport): Briefing {
  if (r.redFlags.length) {
    return {
      headline: "Something in your log needs prompt medical attention",
      points: [`Logged: ${r.redFlags.join("; ")}.`, URGENT_ADVICE],
      doctorQuestions: [],
      urgent: true,
    };
  }
  const points: string[] = [];
  const q: string[] = [];
  if (r.daysLogged === 0) {
    return { headline: "Start with a few days of notes", points: ["Log sleep, water and any symptoms for a week and this page will start to show tendencies."], doctorQuestions: [], urgent: false };
  }
  if (r.sleep) points.push(`Average sleep over the last ${r.daysLogged} logged day(s): ${r.sleep.avg} hours, which ${r.sleep.reading.label}.`);
  if (r.water) points.push(`Average water: ${r.water.avg} glasses a day.`);
  if (r.bp) {
    points.push(`Latest blood pressure ${r.bp.sys}/${r.bp.dia}: ${r.bp.reading.label}.`);
    if (r.bp.reading.level !== "ok") q.push("My blood pressure readings were above the normal range. Should I have them checked or monitored?");
  }
  if (r.glucose) {
    points.push(`Latest fasting glucose ${r.glucose.value} mg/dL: ${r.glucose.reading.label}.`);
    if (r.glucose.reading.level !== "ok") q.push("My fasting glucose was outside the normal range. Should it be confirmed with a lab test?");
  }
  if (r.risk && "result" in r.risk) {
    const x = r.risk.result;
    points.push(`Type 2 diabetes risk score ${x.score} of ${x.max} (${x.band}), meaning ${x.tenYearRisk} chance over 10 years for people with this score.`);
    if (x.score >= 12) q.push("My diabetes risk score is moderate or higher. Which tests and lifestyle steps do you advise?");
  } else if (r.risk && "missing" in r.risk) {
    points.push(`The diabetes risk score needs more information: ${r.risk.missing.join(", ")}.`);
  }
  for (const p of r.patterns.slice(0, 2)) {
    points.push(p.text);
    q.push(`${p.symptom} seems to come more often when my ${p.factor} is lower. Is that worth looking into?`);
  }
  if (r.symptomDays.length && !r.patterns.length) {
    const top = r.symptomDays[0]!;
    points.push(`Most frequent symptom: ${top.label.toLowerCase()}, on ${top.days} of ${r.daysLogged} logged day(s).`);
  }
  points.push(NOT_A_DIAGNOSIS);
  return { headline: "Your last weeks, in plain words", points, doctorQuestions: q, urgent: false };
}

/* ------------------------------------------------------------------ Verifier */

export type Verdict = { ok: boolean; reasons: string[] };

const DISCLAIMERS = /(not a (medical )?diagnosis|cannot diagnose|can't diagnose|does not diagnose|no diagnosis|not a diagnosis)/gi;
const DISEASE_OK = /(type 2 diabetes|diabetes risk|risk of diabetes|prediabetes)/gi;
const DISEASES = /\b(diabetes|diabetic|hypertension|hypertensive|cancer|malaria|an?emia|an?emic|stroke|heart attack|heart disease|heart failure|kidney (disease|failure)|liver (disease|failure)|asthma|pneumonia|tuberculosis|typhoid|covid|hiv|infection|sepsis|epilepsy|depression)\b/i;

export function numbersIn(s: string): string[] {
  return s.match(/\d+(?:\.\d+)?/g) ?? [];
}

/**
 * Rejects model text that diagnoses, predicts a date, gives treatment or dose advice,
 * or contains a number the tools did not produce.
 */
export function verifyText(text: string, allowedNumbers: Set<string>): Verdict {
  const reasons: string[] = [];
  const t = text.replace(DISCLAIMERS, " ").replace(DISEASE_OK, " ");
  if (/\byou (have|has|are suffering|suffer from|will (get|develop|have|suffer|become))\b/i.test(t) || /\byou are (diabetic|hypertensive|an?emic|sick|ill)\b/i.test(t) || /\bdiagnos(ed|e|is)\b/i.test(t)) {
    reasons.push("states or implies a diagnosis");
  }
  if (DISEASES.test(t)) reasons.push("names a disease as a conclusion");
  if (/\b(will|going to) (happen|occur|appear|strike)\b/i.test(t) || /\bin (about |around |roughly )?\d+ (days?|weeks?|months?|years?)\b/i.test(t) || /\b(20\d\d)\b/.test(t) ||
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(t)) {
    reasons.push("predicts a date or a time frame");
  }
  if (/\b\d+(\.\d+)?\s?(mg|mcg|ml|iu|units?|tablets?|pills?)\b(?!\s?\/\s?dl)/i.test(t) || /\b(stop|start|increase|reduce|skip|double|change)\b.{0,40}\b(medication|medicine|tablets?|pills?|dose|insulin|drugs?)\b/i.test(t)) {
    reasons.push("gives treatment or dose advice");
  }
  const bad = numbersIn(t).filter((n) => !allowedNumbers.has(n));
  if (bad.length) reasons.push(`uses numbers the tools did not produce (${[...new Set(bad)].slice(0, 4).join(", ")})`);
  return { ok: reasons.length === 0, reasons };
}

/** Numbers the model may quote: those present in the report. */
export function allowedNumbersFor(r: HealthReport): Set<string> {
  const base = JSON.stringify({ ...r, trace: undefined });
  return new Set([...numbersIn(base), ...numbersIn(JSON.stringify(r.trace))]);
}

/** Verifies every sentence of a model briefing. */
export function verifyBriefing(b: Briefing, r: HealthReport): Verdict {
  const allowed = allowedNumbersFor(r);
  const reasons: string[] = [];
  for (const s of [b.headline, ...b.points, ...b.doctorQuestions]) {
    const v = verifyText(s, allowed);
    v.reasons.forEach((x) => { if (!reasons.includes(x)) reasons.push(x); });
  }
  if (r.redFlags.length && !b.urgent) reasons.push("hides an urgent red flag");
  return { ok: reasons.length === 0, reasons };
}
