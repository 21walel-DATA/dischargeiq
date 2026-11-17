// The reconciliation (comparison) engine: "AI reads, CODE compares, pharmacist approves" (D-003).
// A pure function: two lists of medicines in, a list of lines out. No database, no AI, no randomness, so the same
// input always gives the same answer and every rule is unit-tested (tests/reconcile.test.ts).
//
// Rules (D-022, D-032, D-037, D-044):
// - Pair medicines ONLY when their tidied-up generic names match exactly. No fuzzy matching: look-alike names
//   (hydralazine / hydroxyzine) must never be paired. Unpaired = STOPPED + STARTED, which is visible and safe.
// - Brands are mapped to generics with a small hand-written list, and such pairs are flagged for review.
// - When the engine can't be sure, it doesn't guess: it sets "needs review" with a plain-English reason.
// - Stage 1 compares pre-admission → discharge; stage 2 compares discharge → new prescription (same engine).
import type { ComparedMedicine, LetterStatus, ReconciliationLine } from "@dischargeiq/shared";
import { highRiskCategory } from "./highrisk.rules";

// ---- 1. Names ---------------------------------------------------------------------------------------------------

// Brand → generic. Deliberately short and hand-checked; production would use dm+d codes instead.
const BRAND_TO_GENERIC: Record<string, string> = {
  zestril: "lisinopril",
  lipitor: "atorvastatin",
  istin: "amlodipine",
  norvasc: "amlodipine",
  zocor: "simvastatin",
  crestor: "rosuvastatin",
  losec: "omeprazole",
  zoton: "lansoprazole",
  nexium: "esomeprazole",
  marevan: "warfarin",
  eliquis: "apixaban",
  xarelto: "rivaroxaban",
  lixiana: "edoxaban",
  pradaxa: "dabigatran",
  clexane: "enoxaparin",
  fragmin: "dalteparin",
  panadol: "paracetamol",
  calpol: "paracetamol",
  naprosyn: "naproxen",
  brufen: "ibuprofen",
  nurofen: "ibuprofen",
  glucophage: "metformin",
  lasix: "furosemide",
  cardicor: "bisoprolol",
  congescor: "bisoprolol",
  tenormin: "atenolol",
  ventolin: "salbutamol",
  lanoxin: "digoxin",
  priadel: "lithium carbonate",
  lantus: "insulin glargine",
  toujeo: "insulin glargine",
  abasaglar: "insulin glargine",
  levemir: "insulin detemir",
  tresiba: "insulin degludec",
  novorapid: "insulin aspart",
  fiasp: "insulin aspart",
  humalog: "insulin lispro",
  apidra: "insulin glulisine",
  zomorph: "morphine sulfate",
  oramorph: "morphine sulfate",
  oxycontin: "oxycodone",
  oxynorm: "oxycodone",
  "sando-k": "potassium chloride",
  solpadol: "co-codamol",
  zapain: "co-codamol",
};

// Words that describe the form, not the drug. Salt names (tartrate, succinate…) are NOT here on purpose (D-022).
const FORM_WORDS = new Set([
  "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "cap", "caps", "oral", "solution", "suspension",
  "liquid", "syrup", "dispersible", "soluble", "effervescent", "film-coated", "gastro-resistant", "orodispersible",
  "chewable", "injection", "pen", "cartridge", "prefilled",
]);

// Modified-release markers, in the name or the form.
const RELEASE_PATTERN = /\b(mr|m\/r|modified[- ]release|prolonged[- ]release|slow[- ]release|sr|xl|la|cr|er)\b/;

// A strength written inside the name, e.g. "Amlodipine 5mg tablets" → removed from the name.
const STRENGTH_IN_NAME = /\b\d+(\.\d+)?(\/\d+(\.\d+)?)?\s*(mg|micrograms?|mcg|µg|ug|g|units?|ml)?(?=\s|$)/g;

function tidy(text: string): string {
  return text.toLowerCase().replace(/[(),.;:]/g, " ").replace(/\s+/g, " ").trim();
}

// "  Metformin MR 500mg Tablets " → "metformin" (release and strength are compared separately).
function nameKey(name: string): string {
  const words = tidy(name)
    .replace(RELEASE_PATTERN, " ")
    .replace(STRENGTH_IN_NAME, " ")
    .split(" ")
    .filter((word) => word !== "" && !FORM_WORDS.has(word));
  return words.join(" ");
}

// ---- 2. Strengths and doses ------------------------------------------------------------------------------------------

type Unit = "mg" | "unit" | "ml";
type Amount = { value: number; unit: Unit };

// "500 micrograms" → { value: 0.5, unit: "mg" }. Everything by weight is converted to mg so it can be compared.
function parseAmount(text: string): Amount | null {
  const match = tidyNumberText(text).match(/^(\d+(?:\.\d+)?)\s*(mg|milligrams?|micrograms?|mcg|µg|ug|g|grams?|units?|iu|ml)$/);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  const unit = match[2];
  if (unit === "g" || unit.startsWith("gram")) return { value: value * 1000, unit: "mg" };
  if (unit.startsWith("microgram") || unit === "mcg" || unit === "µg" || unit === "ug") return { value: value / 1000, unit: "mg" };
  if (unit.startsWith("unit") || unit === "iu") return { value, unit: "unit" };
  if (unit === "ml") return { value, unit: "ml" };
  return { value, unit: "mg" };
}

function tidyNumberText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// A "union" type: a strength is one of these four shapes, told apart by `kind`.
type Strength =
  | { kind: "none" }
  | { kind: "amount"; amount: Amount }
  | { kind: "combination"; canonical: string } // e.g. co-codamol "30mg/500mg"
  | { kind: "text"; canonical: string }; // something we couldn't read; compared as tidied text

function parseStrength(text: string | null): Strength {
  if (!text || text.trim() === "") {
    return { kind: "none" };
  }
  const cleaned = tidyNumberText(text);
  if (cleaned.includes("/")) {
    // Each part of a combination: a bare number counts as mg ("30/500" = "30 mg/500 mg").
    const parts = cleaned.split("/").map((part) => parseAmount(/^\d+(\.\d+)?$/.test(part.trim()) ? `${part} mg` : part));
    if (parts.every((part) => part !== null)) {
      return { kind: "combination", canonical: parts.map((part) => `${round(part?.value ?? 0)}${part?.unit}`).join("/") };
    }
    return { kind: "text", canonical: cleaned.replace(/\s/g, "") };
  }
  const amount = parseAmount(cleaned);
  return amount ? { kind: "amount", amount } : { kind: "text", canonical: cleaned };
}

const NUMBER_WORDS: Record<string, number> = { half: 0.5, "a half": 0.5, one: 1, two: 2, three: 3, four: 4 };

type Dose =
  | { kind: "count"; count: number } // "two tablets" → 2 (no dose written = 1)
  | { kind: "amount"; amount: Amount } // "10 units", "1 g"
  | { kind: "text"; canonical: string };

function parseDose(text: string | null): Dose {
  if (!text || text.trim() === "") {
    return { kind: "count", count: 1 };
  }
  const cleaned = tidyNumberText(text);
  const count = cleaned.match(/^(\d+(?:\.\d+)?|half|a half|one|two|three|four)\s*(tablets?|capsules?|caps?|puffs?|sachets?|drops?|patch(?:es)?|x)?$/);
  if (count) {
    const value = NUMBER_WORDS[count[1]] ?? Number(count[1]);
    return { kind: "count", count: value };
  }
  const amount = parseAmount(cleaned);
  return amount ? { kind: "amount", amount } : { kind: "text", canonical: cleaned };
}

// How much is taken each time, e.g. 500 mg × 2 tablets = 1000 mg. Null when it can't be worked out.
function amountPerDose(strength: Strength, dose: Dose): Amount | null {
  if (dose.kind === "amount") return dose.amount;
  if (strength.kind === "amount" && dose.kind === "count") {
    return { value: strength.amount.value * dose.count, unit: strength.amount.unit };
  }
  return null;
}

// Avoids 0.1 + 0.2 style floating-point surprises when comparing amounts.
function round(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function sameAmount(a: Amount | null, b: Amount | null): boolean {
  return a !== null && b !== null && a.unit === b.unit && round(a.value) === round(b.value);
}

function sameStrength(a: Strength, b: Strength): boolean {
  if (a.kind === "amount" && b.kind === "amount") return sameAmount(a.amount, b.amount);
  if (a.kind === "none" || b.kind === "none") return a.kind === b.kind;
  if (a.kind === "amount" || b.kind === "amount") return false;
  return a.canonical === b.canonical;
}

// ---- 3. Frequency (owner rule D-044: compare times per day; timing is a note, not a change) ------------------------------

type Timing = "morning" | "evening" | "night" | null;
type Frequency = { readable: boolean; perDay: number | null; whenRequired: boolean; timing: Timing; canonical: string };

function parseFrequency(text: string | null): Frequency {
  const t = text ? tidy(text) : "";
  const whenRequired = /\b(prn|when required|as required|when needed|as needed|if required|if needed)\b/.test(t);

  let timing: Timing = null;
  if (/\b(om|mane|morning)\b/.test(t)) timing = "morning";
  else if (/\bevening\b/.test(t)) timing = "evening";
  else if (/\b(nocte|night|bedtime)\b/.test(t) || t === "on") timing = "night";

  // Order matters: "twice daily" also contains "daily", so the more specific patterns come first.
  let perDay: number | null = null;
  if (/\b(once weekly|once a week|weekly|every week)\b/.test(t)) perDay = 1 / 7;
  else if (/\b(alternate days|every other day)\b/.test(t)) perDay = 0.5;
  else if (/\b(qds|qid|four times (a|per|each) day|four times daily)\b/.test(t)) perDay = 4;
  else if (/\b(tds|tid|three times (a|per|each) day|three times daily)\b/.test(t)) perDay = 3;
  else if (/\b(bd|bid|twice (a|per|each) day|twice daily|two times (a|per|each) day)\b/.test(t)) perDay = 2;
  else if (/\bevery (\d+) hours?\b/.test(t)) perDay = 24 / Number(t.match(/\bevery (\d+) hours?\b/)?.[1] ?? 24);
  else if (/\b(od|once (a|per|each) day|once daily|daily|om|mane|nocte|morning|evening|night|bedtime)\b/.test(t) || t === "on") perDay = 1;

  return { readable: perDay !== null || whenRequired, perDay, whenRequired, timing, canonical: t };
}

// ---- 4. Route --------------------------------------------------------------------------------------------------------

function parseRoute(text: string | null): string | null {
  if (!text || text.trim() === "") return null;
  const t = tidy(text);
  if (["oral", "orally", "by mouth", "po", "mouth"].includes(t)) return "oral";
  if (["sc", "subcut", "subcutaneous", "subcutaneously"].includes(t)) return "subcutaneous";
  if (["iv", "intravenous", "intravenously"].includes(t)) return "intravenous";
  if (["sl", "sublingual"].includes(t)) return "sublingual";
  if (["pr", "rectal", "rectally"].includes(t)) return "rectal";
  if (["inh", "inhaled", "inhalation"].includes(t)) return "inhaled";
  return t;
}

// ---- 5. Everything the engine works out about one medicine -------------------------------------------------------------

type Parsed = {
  med: ComparedMedicine;
  rawKey: string; // tidied name as written, e.g. "zestril"
  key: string; // generic match key, e.g. "lisinopril"
  isBrand: boolean;
  release: "standard" | "modified-release";
  strength: Strength;
  dose: Dose;
  frequency: Frequency;
  route: string | null;
};

function parse(med: ComparedMedicine): Parsed {
  const rawKey = nameKey(med.name);
  const generic = BRAND_TO_GENERIC[rawKey];
  const releaseText = `${tidy(med.name)} ${med.form ? tidy(med.form) : ""}`;
  return {
    med,
    rawKey,
    key: generic ?? rawKey,
    isBrand: generic !== undefined,
    release: RELEASE_PATTERN.test(releaseText) ? "modified-release" : "standard",
    strength: parseStrength(med.strength),
    dose: parseDose(med.dose),
    frequency: parseFrequency(med.frequency),
    route: parseRoute(med.route),
  };
}

// Two medicines with the same signature are interchangeable (used to pair duplicates exactly).
function signature(p: Parsed): string {
  const strength = p.strength.kind === "amount" ? `${round(p.strength.amount.value)}${p.strength.amount.unit}` : p.strength.kind === "none" ? "" : p.strength.canonical;
  const perDose = amountPerDose(p.strength, p.dose);
  const dose = perDose ? `${round(perDose.value)}${perDose.unit}` : JSON.stringify(p.dose);
  return [p.release, strength, dose, p.frequency.perDay, p.frequency.whenRequired, p.frequency.readable ? "" : p.frequency.canonical, p.route ?? ""].join("|");
}

// ---- 6. Comparing one pair ----------------------------------------------------------------------------------------------

type Comparison = { changeDetails: string[]; reviewReasons: string[]; timingNote: string | null };

function shown(text: string | null): string {
  return text && text.trim() !== "" ? text.trim() : "(not stated)";
}

function comparePair(a: Parsed, b: Parsed): Comparison {
  const changeDetails: string[] = [];
  const reviewReasons: string[] = [];
  let timingNote: string | null = null;

  if (a.release !== b.release) {
    changeDetails.push(`Release ${a.release} → ${b.release}`);
  }

  // Strength and dose.
  const perDoseA = amountPerDose(a.strength, a.dose);
  const perDoseB = amountPerDose(b.strength, b.dose);
  if ((a.strength.kind === "none") !== (b.strength.kind === "none")) {
    reviewReasons.push("Strength missing on one list: check the strength with the letter or the prescriber.");
  } else if (!sameStrength(a.strength, b.strength)) {
    if (sameAmount(perDoseA, perDoseB)) {
      // Owner's paracetamol example: 1 g vs 500 mg × 2 is the same amount, written differently.
      reviewReasons.push(
        `Dose written differently: ${shown(a.med.strength)}${a.med.dose ? ` × ${a.med.dose}` : ""} vs ${shown(b.med.strength)}${b.med.dose ? ` × ${b.med.dose}` : ""}. Same amount per dose: check the tablets supplied.`,
      );
    } else {
      changeDetails.push(`Strength ${shown(a.med.strength)} → ${shown(b.med.strength)}`);
    }
  } else if (perDoseA && perDoseB) {
    if (!sameAmount(perDoseA, perDoseB)) {
      changeDetails.push(`Dose ${shown(a.med.dose)} → ${shown(b.med.dose)}`);
    }
  } else if (JSON.stringify(a.dose) !== JSON.stringify(b.dose)) {
    changeDetails.push(`Dose ${shown(a.med.dose)} → ${shown(b.med.dose)}`);
    if (a.dose.kind === "text" || b.dose.kind === "text") {
      reviewReasons.push("Dose couldn't be compared automatically: check it.");
    }
  }

  // Frequency: times per day and "when required" decide CHANGED; morning/night timing is only a note.
  const fa = a.frequency;
  const fb = b.frequency;
  if (fa.readable && fb.readable) {
    const samePerDay = fa.perDay === fb.perDay || (fa.perDay !== null && fb.perDay !== null && round(fa.perDay) === round(fb.perDay));
    if (!samePerDay || fa.whenRequired !== fb.whenRequired) {
      changeDetails.push(`Frequency ${shown(a.med.frequency)} → ${shown(b.med.frequency)}`);
    } else if (fa.timing !== fb.timing) {
      timingNote = `Timing differs: ${shown(a.med.frequency)} → ${shown(b.med.frequency)}`;
    }
  } else if (fa.canonical !== fb.canonical) {
    changeDetails.push(`Frequency ${shown(a.med.frequency)} → ${shown(b.med.frequency)}`);
    reviewReasons.push("Frequency couldn't be compared automatically: check it.");
  }

  if (a.route && b.route && a.route !== b.route) {
    changeDetails.push(`Route ${a.route} → ${b.route}`);
  }

  return { changeDetails, reviewReasons, timingNote };
}

function brandReason(a: Parsed, b: Parsed): string | null {
  if (a.rawKey === b.rawKey) return null;
  if (a.isBrand && b.isBrand) {
    return `Possible brand/generic match: ${a.med.name.trim()} and ${b.med.name.trim()} are both brands of ${a.key}`;
  }
  const brand = a.isBrand ? a : b;
  return `Possible brand/generic match: ${brand.med.name.trim()} is a brand of ${brand.key}`;
}

// ---- 7. The engine -------------------------------------------------------------------------------------------------------

export type ReconcileOptions = {
  // What the "after" list is called in messages. Stage 1: "discharge letter"; stage 2: "new prescription".
  afterListName?: "discharge letter" | "new prescription";
  beforeListName?: "pre-admission list" | "discharge list";
};

const LOW_CONFIDENCE = 0.7;
const DUPLICATE_REASON = "Same medicine listed more than once: check which lines go together.";
const ORDER = { stopped: 0, started: 1, changed: 2, unchanged: 3 };

function isLetterStop(status: LetterStatus | null): boolean {
  return status === "stopped" || status === "withheld";
}

export function reconcile(
  before: ComparedMedicine[],
  after: ComparedMedicine[],
  options: ReconcileOptions = {},
): ReconciliationLine[] {
  const afterListName = options.afterListName ?? "discharge letter";
  const beforeListName = options.beforeListName ?? "pre-admission list";
  const notListedReason =
    afterListName === "discharge letter"
      ? "Not mentioned in the discharge letter: check whether it was stopped on purpose."
      : `Not on the ${afterListName}: check whether it was stopped on purpose.`;

  const parsedBefore = before.map(parse);
  const parsedAfter = after.filter((m) => !isLetterStop(m.letterStatus)).map(parse);
  const letterStops = after.filter((m) => isLetterStop(m.letterStatus)).map(parse);

  // Every match key, in the order first seen.
  const keys: string[] = [];
  for (const p of [...parsedBefore, ...parsedAfter, ...letterStops]) {
    if (!keys.includes(p.key)) keys.push(p.key);
  }

  const lines: ReconciliationLine[] = [];

  // Builds one line and adds the checks that apply to every line.
  function addLine(
    changeType: ReconciliationLine["changeType"],
    from: Parsed | null,
    to: Parsed | null,
    comparison: Comparison,
    extraReasons: string[],
  ): void {
    const reasons = [...comparison.reviewReasons, ...extraReasons];
    if (to && !to.med.sourceFound) {
      reasons.push("The quoted sentence isn't in the letter: check this line against the letter.");
    }
    if (to && to.med.aiConfidence !== null && to.med.aiConfidence < LOW_CONFIDENCE) {
      reasons.push(`The AI was unsure about this line (confidence ${Math.round(to.med.aiConfidence * 100)}%): check it against the letter.`);
    }
    const category = highRiskCategory(from?.key ?? "") ?? highRiskCategory(to?.key ?? "");
    lines.push({
      key: `from:${from?.med.id ?? "none"}|to:${to?.med.id ?? "none"}`,
      changeType,
      from: from?.med ?? null,
      to: to?.med ?? null,
      changeDetails: comparison.changeDetails,
      timingNote: comparison.timingNote,
      letterStatus: to?.med.letterStatus ?? null,
      sourceText: to?.med.sourceText ?? null,
      needsReview: reasons.length > 0,
      reviewReasons: reasons,
      highRisk: category !== null,
      highRiskReason: category ? `High-risk medicine (${category})` : null,
    });
  }

  const nothing: Comparison = { changeDetails: [], reviewReasons: [], timingNote: null };

  function addPair(a: Parsed, b: Parsed, extraReasons: string[]): void {
    const comparison = comparePair(a, b);
    const brand = brandReason(a, b);
    const reasons = brand ? [brand, ...extraReasons] : extraReasons;
    addLine(comparison.changeDetails.length > 0 ? "changed" : "unchanged", a, b, comparison, reasons);
  }

  for (const key of keys) {
    const fromGroup = parsedBefore.filter((p) => p.key === key);
    const toGroup = parsedAfter.filter((p) => p.key === key);
    const stops = letterStops.filter((p) => p.key === key);

    if (fromGroup.length === 0 && toGroup.length === 0) {
      // The letter stops something that wasn't on the "before" list.
      for (const stop of stops) {
        addLine("stopped", null, stop, nothing, [
          `The letter says ${stop.med.name.trim()} was ${stop.med.letterStatus}, but it isn't on the ${beforeListName}.`,
        ]);
      }
      continue;
    }

    if (toGroup.length === 0) {
      // Stopped. If the letter says so, quote it; if not, flag the silence (owner rule D-044).
      for (const from of fromGroup) {
        const stop = stops[0] ?? null;
        addLine("stopped", from, stop, nothing, stop ? [] : [notListedReason]);
      }
      continue;
    }

    if (fromGroup.length === 0) {
      for (const to of toGroup) {
        addLine("started", null, to, nothing, []);
      }
      continue;
    }

    // Present on both sides. If the letter ALSO says it was stopped, that contradiction needs a person.
    const contradiction = stops.map(
      (stop) => `The letter also says ${stop.med.name.trim()} was ${stop.med.letterStatus}: check which is right.`,
    );

    if (fromGroup.length === 1 && toGroup.length === 1) {
      addPair(fromGroup[0], toGroup[0], contradiction);
      continue;
    }

    // The same drug more than once (e.g. warfarin 3 mg + 1 mg). Pair identical lines first; never guess the rest.
    const leftoverTo = [...toGroup];
    const leftoverFrom: Parsed[] = [];
    for (const from of fromGroup) {
      const index = leftoverTo.findIndex((to) => signature(to) === signature(from));
      if (index >= 0) {
        addPair(from, leftoverTo[index], contradiction);
        leftoverTo.splice(index, 1);
      } else {
        leftoverFrom.push(from);
      }
    }
    if (leftoverFrom.length === 1 && leftoverTo.length === 1) {
      addPair(leftoverFrom[0], leftoverTo[0], [DUPLICATE_REASON, ...contradiction]);
    } else {
      for (const from of leftoverFrom) addLine("stopped", from, null, nothing, [DUPLICATE_REASON, ...contradiction]);
      for (const to of leftoverTo) addLine("started", null, to, nothing, [DUPLICATE_REASON, ...contradiction]);
    }
  }

  // Changes first (stopped, started, changed), then unchanged. `sort` keeps the original order within each group.
  return lines.sort((x, y) => ORDER[x.changeType] - ORDER[y.changeType]);
}
