// The reconciliation engine's specification, written BEFORE the engine (golden rule 9, D-022).
// Covers the 13 edge cases from consult-review.md (P7), the needs-review rules (D-032), the owner's rules from
// 17 Nov (D-044) and the main demo case DMS-0042 (architecture.md section 12).
// The engine is a pure function: lists in, lines out. No database, no AI, no network.
import { describe, expect, it } from "vitest";
import type { ComparedMedicine, ReconciliationLine } from "@dischargeiq/shared";
import { reconcile } from "../services/reconcile.service";
import { DMS_0042, DMS_0043, DMS_0044, DMS_0045, DMS_0046, DMS_0047, type DemoCase } from "../db/demoCases";

// ---- helpers -------------------------------------------------------------------------------------------

let nextId = 0;

// `Partial<ComparedMedicine>` means "any of ComparedMedicine's fields, all optional", so a test only spells out
// the fields it cares about; everything else gets a sensible default.
function med(name: string, fields: Partial<ComparedMedicine> = {}): ComparedMedicine {
  nextId += 1;
  return {
    id: `m${nextId}`,
    name,
    strength: null,
    form: null,
    dose: null,
    frequency: null,
    route: null,
    letterStatus: null,
    sourceText: null,
    aiConfidence: null,
    sourceFound: true,
    ...fields,
  };
}

// The single line in a result (fails loudly if there isn't exactly one).
function only(lines: ReconciliationLine[]): ReconciliationLine {
  expect(lines).toHaveLength(1);
  return lines[0];
}

function types(lines: ReconciliationLine[]): string[] {
  return lines.map((line) => line.changeType).sort();
}

function allReasons(line: ReconciliationLine): string {
  return line.reviewReasons.join(" | ");
}

// ---- edge case 1: case, whitespace and order -------------------------------------------------------------

describe("1. case, whitespace and list order don't matter", () => {
  it("pairs medicines whatever their capitals, spaces or position", () => {
    const from = [
      med("  ATORVASTATIN ", { strength: "20 mg", frequency: "at night" }),
      med("Amlodipine", { strength: "5 mg", frequency: "once daily" }),
    ];
    const to = [
      med("amlodipine", { strength: "5mg", frequency: "Once Daily" }),
      med("atorvastatin", { strength: "20  mg", frequency: "AT NIGHT" }),
    ];
    const lines = reconcile(from, to);
    expect(types(lines)).toEqual(["unchanged", "unchanged"]);
    expect(lines.every((line) => !line.needsReview)).toBe(true);
  });

  it("ignores form words in the name (tablets, capsules)", () => {
    const line = only(reconcile([med("Lansoprazole capsules", { strength: "30 mg" })], [med("Lansoprazole", { strength: "30 mg" })]));
    expect(line.changeType).toBe("unchanged");
  });
});

// ---- edge case 2: brand vs generic -------------------------------------------------------------------------

describe("2. brand vs generic", () => {
  it("pairs a brand with its generic, but flags it for review (Zestril / lisinopril)", () => {
    const line = only(
      reconcile(
        [med("Lisinopril", { strength: "10 mg", frequency: "each morning" })],
        [med("Zestril", { strength: "10 mg", dose: "one tablet", frequency: "in the morning" })],
      ),
    );
    expect(line.changeType).toBe("unchanged");
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("Possible brand/generic match: Zestril is a brand of lisinopril");
  });

  it("works the other way round too (Lipitor before, atorvastatin after)", () => {
    const line = only(reconcile([med("Lipitor", { strength: "20 mg" })], [med("Atorvastatin", { strength: "20 mg" })]));
    expect(line.changeType).toBe("unchanged");
    expect(allReasons(line)).toContain("Lipitor is a brand of atorvastatin");
  });
});

// ---- edge case 3: units -------------------------------------------------------------------------------------

describe("3. units", () => {
  it("treats micrograms, mcg and µg as the same unit", () => {
    const line = only(reconcile([med("Levothyroxine", { strength: "100 mcg" })], [med("Levothyroxine", { strength: "100 micrograms" })]));
    expect(line.changeType).toBe("unchanged");
    const line2 = only(reconcile([med("Levothyroxine", { strength: "100µg" })], [med("Levothyroxine", { strength: "100 microgram" })]));
    expect(line2.changeType).toBe("unchanged");
  });

  it("converts between micrograms, mg and g", () => {
    expect(only(reconcile([med("Digoxin", { strength: "500 micrograms" })], [med("Digoxin", { strength: "0.5 mg" })])).changeType).toBe("unchanged");
    expect(only(reconcile([med("Paracetamol", { strength: "1 g" })], [med("Paracetamol", { strength: "1000 mg" })])).changeType).toBe("unchanged");
  });

  it("compares insulin units", () => {
    const line = only(reconcile([med("Insulin glargine", { dose: "10 units" })], [med("Insulin glargine", { dose: "12 units" })]));
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails.join(" ")).toContain("10 units → 12 units");
  });
});

// ---- edge case 4: frequency synonyms (owner rule D-044: compare times per day) -------------------------------

describe("4. frequency synonyms", () => {
  const pairs: [string, string][] = [
    ["OD", "once daily"],
    ["once a day", "daily"],
    ["BD", "twice daily"],
    ["TDS", "three times a day"],
    ["QDS", "four times daily"],
    ["nocte", "at night"],
    ["ON", "each night"],
    ["om", "mane"],
    ["PRN", "when required"],
    ["as required", "when needed"],
  ];
  for (const [a, b] of pairs) {
    it(`"${a}" = "${b}"`, () => {
      const line = only(reconcile([med("Drug", { strength: "5 mg", frequency: a })], [med("Drug", { strength: "5 mg", frequency: b })]));
      expect(line.changeType).toBe("unchanged");
      expect(line.timingNote).toBeNull();
    });
  }

  it("once daily vs each morning is UNCHANGED with a 'timing differs' note", () => {
    const line = only(reconcile([med("Drug", { strength: "5 mg", frequency: "each morning" })], [med("Drug", { strength: "5 mg", frequency: "OD" })]));
    expect(line.changeType).toBe("unchanged");
    expect(line.needsReview).toBe(false);
    expect(line.timingNote).toBe("Timing differs: each morning → OD");
  });

  it("morning vs night is UNCHANGED (same times per day) with a timing note", () => {
    const line = only(reconcile([med("Drug", { strength: "5 mg", frequency: "om" })], [med("Drug", { strength: "5 mg", frequency: "nocte" })]));
    expect(line.changeType).toBe("unchanged");
    expect(line.timingNote).toContain("Timing differs");
  });

  it("a real change in times per day is CHANGED", () => {
    const line = only(reconcile([med("Drug", { strength: "5 mg", frequency: "BD" })], [med("Drug", { strength: "5 mg", frequency: "TDS" })]));
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toContain("Frequency BD → TDS");
  });

  it("regular vs when required is CHANGED", () => {
    const line = only(reconcile([med("Drug", { frequency: "four times a day" })], [med("Drug", { frequency: "four times a day when required" })]));
    expect(line.changeType).toBe("changed");
  });

  it("a frequency the engine can't read is flagged, never silently passed", () => {
    const line = only(reconcile([med("Drug", { frequency: "as directed" })], [med("Drug", { frequency: "alternate days" })]));
    expect(line.changeType).toBe("changed");
    expect(line.needsReview).toBe(true);
  });
});

// ---- edge case 5: same drug, different strength ---------------------------------------------------------------

describe("5. same drug, different strength", () => {
  it("is ONE changed line, not stopped + started", () => {
    const line = only(
      reconcile(
        [med("Amlodipine", { strength: "5 mg", frequency: "once daily" })],
        [med("Amlodipine", { strength: "10 mg", frequency: "once daily" })],
      ),
    );
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toEqual(["Strength 5 mg → 10 mg"]);
  });

  it("a different number of tablets is a dose change", () => {
    const line = only(reconcile([med("Drug", { strength: "5 mg", dose: "one tablet" })], [med("Drug", { strength: "5 mg", dose: "two tablets" })]));
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toEqual(["Dose one tablet → two tablets"]);
  });
});

// ---- dose written differently (owner's paracetamol example) -----------------------------------------------------

describe("dose written differently", () => {
  it("1 g vs 2 × 500 mg is UNCHANGED but needs review", () => {
    const line = only(
      reconcile(
        [med("Paracetamol", { strength: "1 g", frequency: "four times a day when required" })],
        [med("Paracetamol", { strength: "500 mg", dose: "two tablets", frequency: "up to four times a day when required" })],
      ),
    );
    expect(line.changeType).toBe("unchanged");
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("Dose written differently");
  });

  it("a different total dose is CHANGED", () => {
    const line = only(reconcile([med("Paracetamol", { strength: "1 g" })], [med("Paracetamol", { strength: "500 mg", dose: "one tablet" })]));
    expect(line.changeType).toBe("changed");
  });
});

// ---- edge case 6: same drug listed twice ----------------------------------------------------------------------

describe("6. same drug listed twice in one list", () => {
  it("identical pairs on both sides are matched one-to-one as unchanged", () => {
    const lines = reconcile(
      [med("Warfarin", { strength: "3 mg" }), med("Warfarin", { strength: "1 mg" })],
      [med("Warfarin", { strength: "1 mg" }), med("Warfarin", { strength: "3 mg" })],
    );
    expect(types(lines)).toEqual(["unchanged", "unchanged"]);
    expect(lines.every((line) => !line.needsReview)).toBe(true);
  });

  it("anything it can't pair exactly is flagged instead of guessed", () => {
    const lines = reconcile(
      [med("Warfarin", { strength: "3 mg" }), med("Warfarin", { strength: "1 mg" })],
      [med("Warfarin", { strength: "2 mg" })],
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.needsReview)).toBe(true);
    expect(lines.every((line) => allReasons(line).includes("listed more than once"))).toBe(true);
  });
});

// ---- edge case 7: missing strength -------------------------------------------------------------------------------

describe("7. strength missing in one list", () => {
  it("is never silently unchanged", () => {
    const line = only(reconcile([med("Amlodipine", { strength: "5 mg" })], [med("Amlodipine")]));
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("Strength missing");
  });
});

// ---- edge case 8: modified release ---------------------------------------------------------------------------------

describe("8. modified release vs standard release", () => {
  it("is CHANGED when MR is in the name", () => {
    const line = only(reconcile([med("Metformin", { strength: "500 mg" })], [med("Metformin MR", { strength: "500 mg" })]));
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toContain("Release standard → modified-release");
  });

  it("is CHANGED when MR is in the form", () => {
    const line = only(reconcile([med("Metformin", { strength: "500 mg", form: "modified-release tablets" })], [med("Metformin", { strength: "500 mg", form: "tablets" })]));
    expect(line.changeType).toBe("changed");
  });
});

// ---- edge case 9: combination products ----------------------------------------------------------------------------

describe("9. combination products", () => {
  it("co-codamol 8/500 vs 30/500 is CHANGED", () => {
    const line = only(reconcile([med("Co-codamol", { strength: "8/500" })], [med("Co-codamol", { strength: "30 mg/500 mg" })]));
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toContain("Strength 8/500 → 30 mg/500 mg");
  });

  it("the same combination written two ways is unchanged", () => {
    const line = only(reconcile([med("Co-codamol", { strength: "30/500" })], [med("Co-codamol", { strength: "30mg/500mg" })]));
    expect(line.changeType).toBe("unchanged");
  });
});

// ---- edge case 10: weekly vs daily ----------------------------------------------------------------------------------

describe("10. once weekly vs once daily (methotrexate)", () => {
  it("is CHANGED and high-risk", () => {
    const line = only(
      reconcile(
        [med("Methotrexate", { strength: "10 mg", frequency: "once weekly" })],
        [med("Methotrexate", { strength: "10 mg", frequency: "once daily" })],
      ),
    );
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toContain("Frequency once weekly → once daily");
    expect(line.highRisk).toBe(true);
  });
});

// ---- edge case 11: withheld / stopped in the letter --------------------------------------------------------------------

describe("11. what the letter says (withheld, stopped)", () => {
  it("withheld + absent from the discharge list = STOPPED, quoting the letter (D-037)", () => {
    const sentence = "Warfarin withheld following upper GI bleed; anticoagulant clinic to review.";
    const line = only(
      reconcile(
        [med("Warfarin", { strength: "3 mg", frequency: "each evening" })],
        [med("Warfarin", { letterStatus: "withheld", sourceText: sentence })],
      ),
    );
    expect(line.changeType).toBe("stopped");
    expect(line.letterStatus).toBe("withheld");
    expect(line.sourceText).toBe(sentence);
    expect(line.needsReview).toBe(false);
  });

  it("a letter that says stopped AND lists the drug as continuing is flagged", () => {
    const lines = reconcile(
      [med("Naproxen", { strength: "500 mg" })],
      [med("Naproxen", { letterStatus: "stopped" }), med("Naproxen", { strength: "500 mg", letterStatus: "continued" })],
    );
    const line = only(lines);
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("letter also says");
  });

  it("the letter stops something that isn't on the pre-admission list: shown and flagged", () => {
    const line = only(reconcile([], [med("Ibuprofen", { letterStatus: "stopped", sourceText: "Ibuprofen stopped." })]));
    expect(line.changeType).toBe("stopped");
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("isn't on the");
  });
});

// ---- owner rule (D-044): not mentioned in the letter ------------------------------------------------------------------

describe("a medicine the letter doesn't mention", () => {
  it("is STOPPED and needs review", () => {
    const line = only(reconcile([med("Ramipril", { strength: "5 mg" })], [med("Lansoprazole", { strength: "30 mg" })]).filter((l) => l.changeType === "stopped"));
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("Not mentioned in the discharge letter");
  });

  it("uses the new prescription's name in stage 2", () => {
    const line = only(reconcile([med("Ramipril")], [], { afterListName: "new prescription" }));
    expect(allReasons(line)).toContain("Not on the new prescription");
  });
});

// ---- edge case 12: empty lists ---------------------------------------------------------------------------------------

describe("12. empty lists", () => {
  it("both empty: no lines", () => {
    expect(reconcile([], [])).toEqual([]);
  });

  it("nothing before: everything is STARTED", () => {
    expect(types(reconcile([], [med("A"), med("B")]))).toEqual(["started", "started"]);
  });

  it("nothing after: everything is STOPPED and needs review", () => {
    const lines = reconcile([med("A"), med("B")], []);
    expect(types(lines)).toEqual(["stopped", "stopped"]);
    expect(lines.every((line) => line.needsReview)).toBe(true);
  });
});

// ---- edge case 13: identical lists ---------------------------------------------------------------------------------------

describe("13. identical lists", () => {
  it("are all UNCHANGED with nothing to review", () => {
    const list = () => [
      med("Atorvastatin", { strength: "20 mg", dose: "one tablet", frequency: "at night", route: "oral" }),
      med("Levothyroxine", { strength: "100 micrograms", frequency: "each morning", route: "oral" }),
    ];
    const lines = reconcile(list(), list());
    expect(types(lines)).toEqual(["unchanged", "unchanged"]);
    expect(lines.some((line) => line.needsReview || line.timingNote || line.changeDetails.length > 0)).toBe(false);
  });
});

// ---- safety: no fuzzy matching (D-022) -------------------------------------------------------------------------------------

describe("no fuzzy matching", () => {
  it("never pairs look-alike names (hydralazine / hydroxyzine)", () => {
    expect(types(reconcile([med("Hydralazine", { strength: "25 mg" })], [med("Hydroxyzine", { strength: "25 mg" })]))).toEqual(["started", "stopped"]);
  });

  it("keeps salts apart (metoprolol tartrate / metoprolol succinate)", () => {
    expect(types(reconcile([med("Metoprolol tartrate")], [med("Metoprolol succinate")]))).toEqual(["started", "stopped"]);
  });
});

// ---- AI checks -------------------------------------------------------------------------------------------------------------

describe("checks on AI-extracted lines", () => {
  it("flags a line whose quoted sentence isn't in the letter", () => {
    const line = only(reconcile([], [med("Ramipril", { sourceText: "Ramipril 5 mg daily.", sourceFound: false })]));
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("isn't in the letter");
  });

  it("flags a line the AI was unsure about", () => {
    const line = only(reconcile([], [med("Ramipril", { aiConfidence: 0.55 })]));
    expect(allReasons(line)).toContain("The AI was unsure");
  });
});

// ---- high-risk (owner rule D-044: every line, APINCHS) ---------------------------------------------------------------------

describe("high-risk medicines", () => {
  it("are flagged on every line, unchanged ones included", () => {
    const line = only(reconcile([med("Warfarin", { strength: "3 mg" })], [med("Warfarin", { strength: "3 mg" })]));
    expect(line.changeType).toBe("unchanged");
    expect(line.highRisk).toBe(true);
    expect(line.highRiskReason).toContain("Anticoagulant");
  });

  it("recognise brands and categories (Eliquis, insulin, opioids, potassium)", () => {
    const lines = reconcile([], [med("Eliquis"), med("Insulin aspart"), med("Morphine sulfate"), med("Potassium chloride")]);
    expect(lines.every((line) => line.highRisk)).toBe(true);
  });

  it("leave ordinary medicines alone", () => {
    expect(only(reconcile([], [med("Atorvastatin")])).highRisk).toBe(false);
  });
});

// ---- line keys (D-032) -------------------------------------------------------------------------------------------------------

describe("line keys", () => {
  it("are built from the paired medicine ids", () => {
    const before = med("Amlodipine");
    const after = med("Amlodipine");
    expect(only(reconcile([before], [after])).key).toBe(`from:${before.id}|to:${after.id}`);
  });

  it("change when a medicine is replaced (edited), so it must be acknowledged again", () => {
    const before = med("Amlodipine");
    const first = only(reconcile([before], [med("Amlodipine")])).key;
    const second = only(reconcile([before], [med("Amlodipine")])).key;
    expect(first).not.toBe(second);
  });
});

// ---- the main demo case, end to end ------------------------------------------------------------------------------------------

describe("DMS-0042 (architecture.md section 12)", () => {
  const before = DMS_0042.preAdmission.map((m, i) =>
    med(m.name, { ...m, id: `pre-${i}` }),
  );
  const after = DMS_0042.extraction.map((m, i) =>
    med(m.name, {
      id: `dis-${i}`,
      strength: m.strength ?? null,
      dose: m.dose ?? null,
      frequency: m.frequency ?? null,
      letterStatus: m.status_in_letter ?? null,
      sourceText: m.source_text,
      aiConfidence: m.confidence,
    }),
  );
  const lines = reconcile(before, after);
  const lineFor = (name: string): ReconciliationLine => {
    const found = lines.find((line) => (line.from ?? line.to)?.name.toLowerCase() === name.toLowerCase());
    if (!found) throw new Error(`No line for ${name}`);
    return found;
  };

  it("has one line per medicine", () => {
    expect(lines).toHaveLength(8);
  });

  it("warfarin: STOPPED, high-risk, quotes 'withheld'", () => {
    const line = lineFor("Warfarin");
    expect(line.changeType).toBe("stopped");
    expect(line.highRisk).toBe(true);
    expect(line.sourceText).toContain("withheld");
    expect(line.needsReview).toBe(false);
  });

  it("naproxen: STOPPED", () => {
    expect(lineFor("Naproxen").changeType).toBe("stopped");
    expect(lineFor("Naproxen").needsReview).toBe(false);
  });

  it("lansoprazole: STARTED", () => {
    expect(lineFor("Lansoprazole").changeType).toBe("started");
  });

  it("amlodipine: CHANGED 5 mg → 10 mg, with a timing note", () => {
    const line = lineFor("Amlodipine");
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toEqual(["Strength 5 mg → 10 mg"]);
    expect(line.timingNote).toBe("Timing differs: each morning → once daily");
  });

  it("lisinopril / Zestril: UNCHANGED + needs review (brand)", () => {
    const line = lineFor("Lisinopril");
    expect(line.changeType).toBe("unchanged");
    expect(line.reviewReasons).toEqual(["Possible brand/generic match: Zestril is a brand of lisinopril"]);
  });

  it("paracetamol: UNCHANGED + needs review (dose written differently)", () => {
    const line = lineFor("Paracetamol");
    expect(line.changeType).toBe("unchanged");
    expect(line.needsReview).toBe(true);
    expect(allReasons(line)).toContain("Dose written differently");
  });

  it("atorvastatin and levothyroxine: UNCHANGED, nothing to review", () => {
    for (const name of ["Atorvastatin", "Levothyroxine"]) {
      const line = lineFor(name);
      expect(line.changeType).toBe("unchanged");
      expect(line.needsReview).toBe(false);
      expect(line.timingNote).toBeNull();
    }
  });

  it("exactly two lines need review", () => {
    expect(lines.filter((line) => line.needsReview)).toHaveLength(2);
  });
});

// ---- The owner's further demo cases (D-047): each one exercises one rule end to end ---------------------------------

// Runs the engine on a demo case's pre-admission list and its sample extraction, like the real app does.
function demoLines(demo: DemoCase): ReconciliationLine[] {
  const before = demo.preAdmission.map((m, i) => med(m.name, { ...m, id: `${demo.reference}-pre-${i}` }));
  const after = demo.extraction.map((m, i) =>
    med(m.name, {
      id: `${demo.reference}-dis-${i}`,
      strength: m.strength ?? null,
      form: m.form ?? null,
      dose: m.dose ?? null,
      frequency: m.frequency ?? null,
      route: m.route ?? null,
      letterStatus: m.status_in_letter ?? null,
      sourceText: m.source_text,
      aiConfidence: m.confidence,
    }),
  );
  return reconcile(before, after);
}

function named(lines: ReconciliationLine[], name: string): ReconciliationLine {
  const found = lines.find((l) => (l.from ?? l.to)?.name.toLowerCase() === name.toLowerCase());
  if (!found) throw new Error(`No line for ${name}`);
  return found;
}

describe("DMS-0043 anticoagulant switch", () => {
  const lines = demoLines(DMS_0043);
  it("warfarin STOPPED and apixaban STARTED, both high-risk, nothing to review", () => {
    expect(named(lines, "Warfarin")).toMatchObject({ changeType: "stopped", highRisk: true, needsReview: false, letterStatus: "stopped" });
    expect(named(lines, "Apixaban")).toMatchObject({ changeType: "started", highRisk: true, needsReview: false });
    expect(named(lines, "Apixaban").highRiskReason).toContain("Anticoagulant");
  });
  it("never pairs warfarin with apixaban (different drugs)", () => {
    expect(lines.filter((l) => l.from && l.to && l.from.name !== l.to.name)).toHaveLength(0);
  });
  it("the rest is unchanged", () => {
    expect(named(lines, "Bisoprolol").changeType).toBe("unchanged");
    expect(named(lines, "Atorvastatin").changeType).toBe("unchanged");
  });
});

describe("DMS-0044 insulin dose reduced", () => {
  const lines = demoLines(DMS_0044);
  it("insulin glargine is CHANGED 20 units → 16 units, high-risk (insulin)", () => {
    const line = named(lines, "Insulin glargine");
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toEqual(["Dose 20 units → 16 units"]);
    expect(line.highRiskReason).toContain("Insulin");
    expect(line.needsReview).toBe(false);
  });
  it("metformin and ramipril unchanged", () => {
    expect(named(lines, "Metformin").changeType).toBe("unchanged");
    expect(named(lines, "Ramipril").changeType).toBe("unchanged");
  });
});

describe("DMS-0045 omission", () => {
  const lines = demoLines(DMS_0045);
  it("levothyroxine, not mentioned in the letter, is STOPPED + needs review", () => {
    const line = named(lines, "Levothyroxine");
    expect(line.changeType).toBe("stopped");
    expect(line.reviewReasons).toEqual(["Not mentioned in the discharge letter: check whether it was stopped on purpose."]);
  });
  it("is the only line that needs review", () => {
    expect(lines.filter((l) => l.needsReview)).toHaveLength(1);
    expect(lines).toHaveLength(3);
  });
});

describe("DMS-0046 heart failure", () => {
  const lines = demoLines(DMS_0046);
  it("furosemide OD → twice daily is CHANGED on times per day only", () => {
    const line = named(lines, "Furosemide");
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toEqual(["Frequency OD → twice daily"]);
    expect(line.highRisk).toBe(false);
  });
  it("spironolactone STARTED; bisoprolol and ramipril unchanged", () => {
    expect(named(lines, "Spironolactone").changeType).toBe("started");
    expect(named(lines, "Bisoprolol").changeType).toBe("unchanged");
    expect(named(lines, "Ramipril").changeType).toBe("unchanged");
  });
});

describe("DMS-0047 post-operative opioid", () => {
  const lines = demoLines(DMS_0047);
  it("morphine sulfate MR STARTED and high-risk (opioid), with the short course in its directions", () => {
    const line = named(lines, "Morphine sulfate");
    expect(line).toMatchObject({ changeType: "started", highRisk: true, needsReview: false });
    expect(line.highRiskReason).toContain("Opioid");
    expect(line.to?.frequency).toContain("for 5 days");
  });
  it("senna STARTED, ibuprofen STOPPED (the letter says so), atorvastatin unchanged", () => {
    expect(named(lines, "Senna")).toMatchObject({ changeType: "started", highRisk: false });
    expect(named(lines, "Ibuprofen")).toMatchObject({ changeType: "stopped", needsReview: false, letterStatus: "stopped" });
    expect(named(lines, "Atorvastatin").changeType).toBe("unchanged");
  });
});

// ---- Stage 2 re-check (owner decision D-048): every difference needs the pharmacist ---------------------------------

describe("stage 2: new prescription vs discharge list", () => {
  const STAGE_2 = { beforeListName: "discharge list", afterListName: "new prescription", flagEveryDifference: true } as const;
  const DIFFERS = "The new prescription differs from the discharge list: check with the prescriber.";

  it("catches the GP prescription that ignores the hospital's change (amlodipine 10 mg back to 5 mg)", () => {
    const line = only(
      reconcile(
        [med("Amlodipine", { strength: "10 mg", frequency: "once daily" })],
        [med("Amlodipine", { strength: "5 mg", frequency: "once daily" })],
        STAGE_2,
      ),
    );
    expect(line.changeType).toBe("changed");
    expect(line.changeDetails).toEqual(["Strength 10 mg → 5 mg"]);
    expect(line.needsReview).toBe(true);
    expect(line.reviewReasons).toContain(DIFFERS);
  });

  it("a stopped medicine that reappears on the prescription is flagged", () => {
    const line = only(reconcile([], [med("Naproxen", { strength: "500 mg" })], STAGE_2));
    expect(line.changeType).toBe("started");
    expect(line.reviewReasons).toContain(DIFFERS);
  });

  it("a matching prescription has nothing to check", () => {
    const line = only(reconcile([med("Lansoprazole", { strength: "30 mg" })], [med("Lansoprazole", { strength: "30 mg" })], STAGE_2));
    expect(line.needsReview).toBe(false);
  });

  it("stage 1 does not use this rule", () => {
    const line = only(reconcile([med("Amlodipine", { strength: "5 mg" })], [med("Amlodipine", { strength: "10 mg" })]));
    expect(line.needsReview).toBe(false);
  });
});
