import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { buildBriefing, verifyBriefing, type Briefing, type HealthReport } from "./health-engine";

/**
 * The model only rewrites results the tools already computed. It receives the computed report
 * (numbers, categories, symptom labels). It never receives the name, free-text notes, meals or medication names.
 * Whatever it returns is checked by the verifier; if the check fails, the rule-based briefing is used instead.
 */

const Input = z.object({
  report: z.record(z.string(), z.unknown()),
});

export type BriefingResponse = {
  briefing: Briefing;
  source: "ai" | "rules";
  note: string | null;
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "points", "doctorQuestions", "urgent"],
  properties: {
    headline: { type: "string" },
    points: { type: "array", items: { type: "string" } },
    doctorQuestions: { type: "array", items: { type: "string" } },
    urgent: { type: "boolean" },
  },
} as const;

const INSTRUCTIONS = [
  "You rewrite a computed personal health report in warm, plain language for the person it describes.",
  "Use ONLY facts and numbers present in the report JSON. Never add a number that is not in it.",
  "Never diagnose. Never name a disease as a conclusion (the phrase 'type 2 diabetes risk score' is allowed).",
  "Never predict that something will happen or when. No dates, no time frames.",
  "Never give treatment, medication or dose advice, and never tell the person to start or stop a medicine.",
  "If report.redFlags is not empty, set urgent to true, put it first, and say to contact a doctor or the local emergency number now.",
  "Describe patterns as associations in the person's own log, never as causes.",
  "At most 5 points of one or two sentences each, and at most 3 short questions the person could ask a doctor.",
  "Finish the points with: This is not a medical diagnosis. It cannot replace a doctor.",
].join("\n");

async function callModel(apiKey: string, report: unknown): Promise<Briefing> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, Authorization: `Bearer ${apiKey}`, "X-Lovable-AIG-SDK": "fetch" },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: INSTRUCTIONS,
      input: JSON.stringify(report),
      stream: true,
      store: false,
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "health_briefing", strict: true, schema: SCHEMA } },
    }),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("Health AI gateway error", res.status, body.slice(0, 300));
    throw new Error(res.status === 402 ? "AI credits exhausted" : res.status === 429 ? "AI rate limited" : `AI unavailable (${res.status})`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let text = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i: number;
    while ((i = buf.indexOf("\n\n")) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      for (const line of frame.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const raw = line.slice(5).trim();
        if (!raw || raw === "[DONE]") continue;
        const ev = JSON.parse(raw) as { type?: string; delta?: string };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        if (ev.type === "response.refusal.delta" || ev.type === "response.failed" || ev.type === "error") throw new Error("AI declined or failed");
      }
    }
  }
  const parsed = JSON.parse(text) as Briefing;
  return {
    headline: String(parsed.headline ?? ""),
    points: Array.isArray(parsed.points) ? parsed.points.map(String).slice(0, 6) : [],
    doctorQuestions: Array.isArray(parsed.doctorQuestions) ? parsed.doctorQuestions.map(String).slice(0, 4) : [],
    urgent: Boolean(parsed.urgent),
  };
}

/** Protects the demo's AI credits: at most this many briefings per hour per server instance. */
const HEALTH_AI_RUNS_PER_HOUR = 10;
let bucket = { hour: 0, used: 0 };
function allowAiRun(): boolean {
  const hour = Math.floor(Date.now() / 3_600_000);
  if (bucket.hour !== hour) bucket = { hour, used: 0 };
  if (bucket.used >= HEALTH_AI_RUNS_PER_HOUR) return false;
  bucket.used++;
  return true;
}

export const explainReport = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => {
    const v = Input.parse(d);
    if (JSON.stringify(v.report).length > 20000) throw new Error("Report too large");
    return v;
  })
  .handler(async ({ data }): Promise<BriefingResponse> => {
    const report = data.report as unknown as HealthReport;
    const rules = buildBriefing(report);
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { briefing: rules, source: "rules", note: "AI is not configured on this server. Showing the rule-based briefing." };
    if (!allowAiRun()) return { briefing: rules, source: "rules", note: "The hourly AI limit of this demo was reached. Showing the rule-based briefing." };
    try {
      // Do not send the trace to the model: it only needs the results.
      const { trace: _trace, ...forModel } = report;
      void _trace;
      const ai = await callModel(apiKey, forModel);
      const verdict = verifyBriefing(ai, report);
      if (!verdict.ok) {
        return { briefing: rules, source: "rules", note: `The AI text was rejected by the verifier (${verdict.reasons.join("; ")}). Showing the rule-based briefing.` };
      }
      return { briefing: ai, source: "ai", note: null };
    } catch (err) {
      return { briefing: rules, source: "rules", note: `${err instanceof Error ? err.message : "AI unavailable"}. Showing the rule-based briefing.` };
    }
  });
