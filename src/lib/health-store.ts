import { useEffect, useState, useCallback } from "react";

export type Profile = {
  name: string;
  age: string;
  sex: string;
  bloodGroup: string;
  heightCm: string;
  weightKg: string;
};

export type DailyLog = {
  date: string; // YYYY-MM-DD
  meals: string;
  medications: string;
  sleepHours: string;
  waterGlasses: string;
  symptoms: string;
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
};

export function emptyLog(date: string): DailyLog {
  return { date, meals: "", medications: "", sleepHours: "", waterGlasses: "", symptoms: "" };
}

export function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function computeBmi(heightCm: string, weightKg: string): number | null {
  const h = parseFloat(heightCm) / 100;
  const w = parseFloat(weightKg);
  if (!h || !w || h <= 0 || w <= 0) return null;
  return Math.round((w / (h * h)) * 10) / 10;
}

export function bmiLabel(bmi: number) {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy";
  if (bmi < 30) return "Overweight";
  return "Obese";
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setProfile({ ...emptyProfile, ...read(PROFILE_KEY, emptyProfile) });
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
    setLogs(read(LOGS_KEY, {}));
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
