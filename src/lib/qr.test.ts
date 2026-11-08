import { describe, expect, it } from "vitest";
import { qrGrid, qrSvgPath } from "./qr";

describe("qr", () => {
  it("makes a square grid whose size fits a QR version (21 + 4k)", () => {
    const g = qrGrid("EMERGENCY MEDICAL CARD\nBlood group: O+\nAllergies: penicillin");
    expect(g.length).toBeGreaterThanOrEqual(21);
    expect((g.length - 21) % 4).toBe(0);
    expect(g.every((r) => r.length === g.length)).toBe(true);
  });
  it("has the three finder patterns: dark corners at the top-left, top-right and bottom-left", () => {
    const g = qrGrid("hello");
    const n = g.length;
    expect(g[0]![0]).toBe(true);
    expect(g[0]![n - 1]).toBe(true);
    expect(g[n - 1]![0]).toBe(true);
    expect(g[n - 1]![n - 1]).toBe(false); // no finder pattern at the bottom-right
  });
  it("is deterministic and handles non-ASCII text", () => {
    const t = "Allergie: arachide, fève";
    expect(JSON.stringify(qrGrid(t))).toBe(JSON.stringify(qrGrid(t)));
  });
  it("builds an svg path with a quiet zone and rejects text that is too long", () => {
    const g = qrGrid("x");
    const { d, size } = qrSvgPath(g);
    expect(size).toBe(g.length + 8);
    expect(d.startsWith("M")).toBe(true);
    expect(() => qrGrid("a".repeat(5000))).toThrow();
  });
});
