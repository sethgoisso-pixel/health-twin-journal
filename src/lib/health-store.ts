import { useEffect, useState, useCallback } from "react";
import { num, type Entry, type FamilyDiabetes, type PersonInput } from "@/lib/health-engine";

export type YesNo = "" | "yes" | "no";

export type Profile = {
  name: string;
  age: string;
  sex: string;
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
  waistCm: string;
  allergies: string;
  conditions: string;
  regularMedication: string;
  emergencyContact: string;
  activeDaily: YesNo;
  fruitVegDaily: YesNo;
  bpMedication: YesNo;
  highGlucoseHistory: YesNo;
  family: "" | FamilyDiabetes;
  phq1: string;
  phq2: string;
  gad1: string;
  gad2: string;
};

export type DailyLog = {
  date: string; // YYYY-MM-DD
  meals: string;
  medications: string;
  sleepHours: string;
  waterGlasses: string;
  symptoms: string; // free-text notes
  symptomIds: string[];
  areas: string[];
  systolic: string;
  diastolic: string;
  glucose: string;
};

const PROFILE_KEY = "health-twin:profile";
const LOGS_KEY = "health-twin:logs";

export const emptyProfile: Profile = {
  name: "",
  age: "",
  sex: "",
  bloodGroup: "",
  heightCm: "",
  weightKg: "",
  waistCm: "",
  allergies: "",
  conditions: "",
  regularMedication: "",
  emergencyContact: "",
  activeDaily: "",
  fruitVegDaily: "",
  bpMedication: "",
  highGlucoseHistory: "",
  family: "",
  phq1: "",
  phq2: "",
  gad1: "",
  gad2: "",
};

export function emptyLog(date: string): DailyLog {
  return {
    date,
    meals: "",
    medications: "",
    sleepHours: "",
    waterGlasses: "",
    symptoms: "",
    symptomIds: [],
    areas: [],
    systolic: "",
    diastolic: "",
    glucose: "",
  };
}

export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

const yn = (v: YesNo): boolean | null => (v === "yes" ? true : v === "no" ? false : null);

export function toPerson(p: Profile): PersonInput {
  const sex = p.sex === "Female" || p.sex === "Male" || p.sex === "Other" ? p.sex : null;
  return {
    age: num(p.age),
    sex,
    heightCm: num(p.heightCm),
    weightKg: num(p.weightKg),
    waistCm: num(p.waistCm),
    answers: {
      activeDaily: yn(p.activeDaily),
      fruitVegDaily: yn(p.fruitVegDaily),
      bpMedication: yn(p.bpMedication),
      highGlucoseHistory: yn(p.highGlucoseHistory),
      family: p.family || null,
    },
    mood: {
      phq1: num(p.phq1),
      phq2: num(p.phq2),
      gad1: num(p.gad1),
      gad2: num(p.gad2),
    },
  };
}

export function toEntries(logs: Record<string, DailyLog>): Entry[] {
  return Object.values(logs)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((l) => ({
      date: l.date,
      sleepHours: num(l.sleepHours),
      water: num(l.waterGlasses),
      symptoms: l.symptomIds,
      systolic: num(l.systolic),
      diastolic: num(l.diastolic),
      glucose: num(l.glucose),
      areas: l.areas,
    }));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setProfile({ ...emptyProfile, ...read<Partial<Profile>>(PROFILE_KEY, {}) });
    setLoaded(true);
  }, []);
  const save = useCallback((p: Profile) => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
    setProfile(p);
  }, []);
  return { profile, save, loaded };
}

export function useLogs() {
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    // Fill in fields missing from entries saved by older versions.
    const raw = read<Record<string, Partial<DailyLog>>>(LOGS_KEY, {});
    const fixed: Record<string, DailyLog> = {};
    for (const [d, l] of Object.entries(raw)) fixed[d] = { ...emptyLog(d), ...l };
    setLogs(fixed);
    setLoaded(true);
  }, []);
  const saveLog = useCallback((log: DailyLog) => {
    setLogs((prev) => {
      const next = { ...prev, [log.date]: log };
      localStorage.setItem(LOGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const deleteLog = useCallback((date: string) => {
    setLogs((prev) => {
      const next = { ...prev };
      delete next[date];
      localStorage.setItem(LOGS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  return { logs, saveLog, deleteLog, loaded };
}
