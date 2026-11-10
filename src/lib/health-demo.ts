import type { DailyLog, Profile } from "@/lib/health-store";

/**
 * Example data so a visitor can see the app working in one tap.
 * Entirely invented: a fictional person, never real health data.
 * The keys must match PROFILE_KEY and LOGS_KEY in health-store.ts.
 */
const PROFILE_KEY = "health-twin:profile";
const LOGS_KEY = "health-twin:logs";

export const DEMO_PROFILE: Profile = {
  name: "Demo",
  age: "34",
  sex: "Male",
  bloodGroup: "O+",
  heightCm: "178",
  weightKg: "92",
  waistCm: "98",
  allergies: "Penicillin",
  conditions: "None stated",
  regularMedication: "None",
  emergencyContact: "Example contact +229 00 00 00 00",
  activeDaily: "no",
  fruitVegDaily: "no",
  bpMedication: "no",
  highGlucoseHistory: "no",
  family: "extended",
  phq1: "1",
  phq2: "1",
  gad1: "2",
  gad2: "1",
};

const ymd = (d: Date) => {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

type Row = {
  sleep: string;
  water: string;
  ids?: string[];
  areas?: string[];
  bp?: [string, string];
  glucose?: string;
  meals?: string;
};

// Index 0 = today, 1 = yesterday, ... Headaches fall on the short-sleep nights.
const ROWS: Row[] = [
  { sleep: "5", water: "3", ids: ["headache", "fatigue"], areas: ["head"], bp: ["138", "88"], glucose: "104", meals: "Rice, fried fish, soda" },
  { sleep: "7", water: "6", meals: "Beans, plantain, fruit" },
  { sleep: "5.5", water: "4", ids: ["headache"], areas: ["head"], meals: "Bread, tea, jollof rice" },
  { sleep: "7.5", water: "7", meals: "Yam, vegetable sauce" },
  { sleep: "5", water: "3", ids: ["headache", "stomach_pain"], areas: ["head", "abdomen"], bp: ["134", "86"], meals: "Street food, soda" },
  { sleep: "8", water: "7", meals: "Porridge, fruit, fish" },
  { sleep: "7", water: "6", meals: "Rice, vegetables" },
  { sleep: "5.5", water: "4", ids: ["headache", "fatigue"], areas: ["head"], meals: "Bread, coffee" },
  { sleep: "7.5", water: "6", ids: ["back_pain"], areas: ["back"], meals: "Beans, plantain" },
  { sleep: "8", water: "8", meals: "Fish, vegetables, fruit" },
  { sleep: "7", water: "5", glucose: "101", meals: "Rice, chicken" },
  { sleep: "5", water: "4", ids: ["headache"], areas: ["head"], bp: ["140", "90"], meals: "Bread, tea" },
  { sleep: "7", water: "6", meals: "Yam, egg sauce" },
  { sleep: "8", water: "7", meals: "Rice, beans, fruit" },
];

export function demoLogs(now: Date = new Date()): Record<string, DailyLog> {
  const out: Record<string, DailyLog> = {};
  ROWS.forEach((r, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const date = ymd(d);
    out[date] = {
      date,
      meals: r.meals ?? "",
      medications: "",
      sleepHours: r.sleep,
      waterGlasses: r.water,
      symptoms: "",
      symptomIds: r.ids ?? [],
      areas: r.areas ?? [],
      systolic: r.bp?.[0] ?? "",
      diastolic: r.bp?.[1] ?? "",
      glucose: r.glucose ?? "",
    };
  });
  return out;
}

/** Replaces whatever is stored in this browser with the example, then reloads the page. */
export function loadDemo() {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(DEMO_PROFILE));
  localStorage.setItem(LOGS_KEY, JSON.stringify(demoLogs()));
  window.location.reload();
}

/** Removes everything this app stored in this browser, then reloads the page. */
export function clearAllData() {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem(LOGS_KEY);
  window.location.reload();
}
