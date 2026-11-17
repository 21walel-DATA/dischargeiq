// The mock letter reader and the demo letters themselves (D-045, D-047).
import { describe, expect, it } from "vitest";
import { containsRealNhsNumber } from "@dischargeiq/shared";
import { DEMO_CASES } from "../db/demoCases";
import { extractMedicines, sourceIsInLetter } from "../services/ai.service";

describe("demo letters", () => {
  for (const demo of DEMO_CASES) {
    it(`${demo.reference}: synthetic only, and every sample sentence is really in the letter`, () => {
      expect(containsRealNhsNumber(demo.letterText)).toBe(false);
      expect(demo.letterText).toMatch(/999 \d{3} \d{4} \(test range\)/);
      for (const m of demo.extraction) {
        expect(sourceIsInLetter(m.source_text, demo.letterText)).toBe(true);
      }
    });
  }
});

describe("mock letter reader", () => {
  for (const demo of DEMO_CASES) {
    it(`${demo.reference}: returns exactly that letter's lines (no duplicates from other letters)`, async () => {
      const result = await extractMedicines(demo.letterText);
      expect(result.ok && result.mode).toBe("mock");
      expect(result.ok ? result.medicines : []).toEqual(demo.extraction);
    });
  }

  it("returns nothing for a letter it doesn't know", async () => {
    const result = await extractMedicines("Synthetic letter. Continue an unknown medicine.");
    expect(result.ok ? result.medicines : null).toEqual([]);
  });
});
