import { describe, expect, it } from "vitest";
import {
  allowedNumbersFor,
  bmiCategory,
  bmiValue,
  bpCategory,
  buildBriefing,
  findPatterns,
  findrisc,
  glucoseCategory,
  runHealthTools,
  scanRedFlags,
  verifyBriefing,
  verifyText,
  type Entry,
  type FindriscInput,
  type PersonInput,
} from "./health-engine";

const day = (n: number, o: Partial<Entry> = {}): Entry => ({
  date: `2026-10-${String(n).padStart(2, "0")}`,
  sleepHours: 7,
  water: 6,
  symptoms: [],
  systolic: null,
  diastolic: null,
  glucose: null,
  areas: [],
  ...o,
});

const base: FindriscInput = {
  age: 52, bmi: 27, waistCm: 100, sex: "Male", activeDaily: false, fruitVegDaily: false,
  bpMedication: true, highGlucoseHistory: false, family: "close",
};

describe("FINDRISC", () => {
  it("scores a worked example: 2+1+3+2+1+2+0+5 = 16, high", () => {
    const r = findrisc(base);
    expect(r.score).toBe(16);
    expect(r.band).toBe("high");
    expect(r.tenYearRisk).toBe("about 1 in 3");
  });
  it("gives 0 for the lowest profile and 26 for the highest", () => {
    const low = findrisc({ age: 30, bmi: 22, waistCm: 70, sex: "Female", activeDaily: true, fruitVegDaily: true, bpMedication: false, highGlucoseHistory: false, family: "none" });
    expect(low.score).toBe(0);
    expect(low.band).toBe("low");
    const top = findrisc({ age: 70, bmi: 35, waistCm: 120, sex: "Male", activeDaily: false, fruitVegDaily: false, bpMedication: true, highGlucoseHistory: true, family: "close" });
    expect(top.score).toBe(26);
    expect(top.band).toBe("very high");
  });
  it("uses the sex-specific waist thresholds", () => {
    const m = findrisc({ ...base, sex: "Male", waistCm: 90 }).parts.find((p) => p.label === "Waist circumference")!;
    const f = findrisc({ ...base, sex: "Female", waistCm: 90 }).parts.find((p) => p.label === "Waist circumference")!;
    expect(m.points).toBe(0);
    expect(f.points).toBe(4);
  });
  it("has the published band edges (6/7, 11/12, 14/15, 20/21)", () => {
    const mk = (o: Partial<typeof base>) =>
      findrisc({ age: 30, bmi: 22, waistCm: 70, sex: "Female", activeDaily: true, fruitVegDaily: true, bpMedication: false, highGlucoseHistory: false, family: "none", ...o });
    const at = (o: Partial<typeof base>, score: number, band: string) => {
      const r = mk(o);
      expect(r.score).toBe(score);
      expect(r.band).toBe(band);
    };
    at({ highGlucoseHistory: true, fruitVegDaily: false }, 6, "low");
    at({ highGlucoseHistory: true, bpMedication: true }, 7, "slightly elevated");
    at({ highGlucoseHistory: true, family: "extended", activeDaily: false, fruitVegDaily: false }, 11, "slightly elevated");
    at({ highGlucoseHistory: true, family: "close", bpMedication: true }, 12, "moderate");
    at({ highGlucoseHistory: true, family: "close", bpMedication: true, activeDaily: false }, 14, "moderate");
    at({ highGlucoseHistory: true, family: "close", bpMedication: true, activeDaily: false, fruitVegDaily: false }, 15, "high");
    at({ highGlucoseHistory: true, family: "close", bpMedication: true, activeDaily: false, fruitVegDaily: false, age: 70, bmi: 27 }, 20, "high");
    at({ highGlucoseHistory: true, family: "close", bpMedication: true, activeDaily: false, fruitVegDaily: false, age: 60, bmi: 32 }, 21, "very high");
  });
});

describe("reference ranges", () => {
  it("categorises BMI per WHO", () => {
    expect(bmiValue(170, 70)).toBe(24.2);
    expect(bmiCategory(24.2)).toBe("normal range");
    expect(bmiCategory(31)).toBe("obesity range");
    expect(bmiValue(0, 70)).toBeNull();
  });
  it("categorises blood pressure per AHA 2017", () => {
    expect(bpCategory(118, 76).level).toBe("ok");
    expect(bpCategory(125, 78).level).toBe("watch");
    expect(bpCategory(135, 85).level).toBe("watch");
    expect(bpCategory(150, 95).level).toBe("high");
    expect(bpCategory(190, 100).level).toBe("urgent");
  });
  it("categorises fasting glucose", () => {
    expect(glucoseCategory(90).level).toBe("ok");
    expect(glucoseCategory(110).level).toBe("watch");
    expect(glucoseCategory(130).level).toBe("high");
    expect(glucoseCategory(50).level).toBe("urgent");
  });
});

describe("red flags", () => {
  it("raises a red-flag symptom from the last two logged days only", () => {
    const e = [day(1, { symptoms: ["chest_pain"] }), day(2), day(3)];
    expect(scanRedFlags(e)).toEqual([]);
    expect(scanRedFlags([...e, day(4, { symptoms: ["fainting"] })])).toEqual(["Fainting"]);
  });
  it("raises a blood pressure in the crisis range", () => {
    expect(scanRedFlags([day(1, { systolic: 190, diastolic: 125 })])).toContain("Blood pressure in the crisis range");
  });
});

describe("patterns in the log", () => {
  it("needs seven logged days", () => {
    expect(findPatterns([day(1), day(2), day(3)])).toEqual([]);
  });
  it("finds headaches that cluster on short-sleep days, with the counts", () => {
    const e: Entry[] = [
      day(1, { sleepHours: 5, symptoms: ["headache"] }), day(2, { sleepHours: 5, symptoms: ["headache"] }),
      day(3, { sleepHours: 5.5, symptoms: ["headache"] }), day(4, { sleepHours: 5 }),
      day(5, { sleepHours: 8 }), day(6, { sleepHours: 7.5 }), day(7, { sleepHours: 8 }), day(8, { sleepHours: 7, symptoms: ["headache"] }),
    ];
    const p = findPatterns(e).find((x) => x.factor === "sleep" && x.symptom === "Headache")!;
    expect(p).toBeDefined();
    expect(p.daysWithSymptom).toBe(3);
    expect(p.daysWith).toBe(4);
    expect(p.daysWithoutSymptom).toBe(1);
    expect(p.text).toContain("not proof of a cause");
  });
  it("finds nothing when the symptom is spread evenly", () => {
    const e: Entry[] = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => day(n, { sleepHours: n % 2 ? 5 : 8, symptoms: n % 2 ? ["headache"] : ["headache"] }));
    expect(findPatterns(e)).toEqual([]);
  });
});

const person: PersonInput = {
  age: 52, sex: "Male", heightCm: 175, weightKg: 83, waistCm: 100,
  answers: { activeDaily: false, fruitVegDaily: false, bpMedication: true, highGlucoseHistory: false, family: "close" },
};

describe("report and briefing", () => {
  const entries = [day(1, { systolic: 142, diastolic: 92, glucose: 108 }), day(2), day(3)];
  const r = runHealthTools(person, entries);
  it("runs every tool and records a trace", () => {
    expect(r.trace.map((t) => t.tool)).toEqual(["compute_bmi", "summarise_log", "check_vitals", "score_findrisc", "detect_patterns", "scan_red_flags"]);
    expect(r.risk && "result" in r.risk && r.risk.result.score).toBe(16);
  });
  it("lists what is missing instead of guessing a risk score", () => {
    const none = runHealthTools({ ...person, waistCm: null }, entries);
    expect(none.risk && "missing" in none.risk && none.risk.missing).toContain("waist circumference");
  });
  it("builds a deterministic briefing that passes its own verifier", () => {
    const b = buildBriefing(r);
    expect(b.urgent).toBe(false);
    expect(verifyBriefing(b, r).ok).toBe(true);
    expect(b.doctorQuestions.length).toBeGreaterThan(0);
  });
  it("turns a red flag into an urgent briefing", () => {
    const rf = runHealthTools(person, [day(1, { symptoms: ["chest_pain"] })]);
    const b = buildBriefing(rf);
    expect(b.urgent).toBe(true);
    expect(b.points.join(" ")).toContain("emergency");
  });
  it("rejects a model briefing that hides a red flag", () => {
    const rf = runHealthTools(person, [day(1, { symptoms: ["chest_pain"] })]);
    const calm = { headline: "All good", points: ["Nothing to report."], doctorQuestions: [], urgent: false };
    expect(verifyBriefing(calm, rf).ok).toBe(false);
  });
});

describe("verifier", () => {
  const allowed = allowedNumbersFor(runHealthTools(person, [day(1), day(2)]));
  it("blocks diagnoses, predictions, doses and invented numbers", () => {
    expect(verifyText("You have diabetes.", allowed).ok).toBe(false);
    expect(verifyText("You will develop a heart problem soon.", allowed).ok).toBe(false);
    expect(verifyText("This will happen in 3 months.", allowed).ok).toBe(false);
    expect(verifyText("Expect trouble around March 2027.", allowed).ok).toBe(false);
    expect(verifyText("Take 500 mg of paracetamol.", allowed).ok).toBe(false);
    expect(verifyText("You could stop your medication.", allowed).ok).toBe(false);
    expect(verifyText("Your risk is 87 percent.", allowed).ok).toBe(false);
  });
  it("allows plain tendencies, the diabetes risk wording and disclaimers", () => {
    expect(verifyText("Your sleep averaged 7 hours. This is not a medical diagnosis.", new Set(["7"])).ok).toBe(true);
    expect(verifyText("Type 2 diabetes risk score is in the moderate band.", allowed).ok).toBe(true);
    expect(verifyText("Ask your doctor whether a check is worthwhile.", allowed).ok).toBe(true);
  });
});
