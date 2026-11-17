// High-risk medicines (owner decision D-044). Based on the UK APINCHS framework for high-risk medicines:
// Anti-infectives, Potassium and other electrolytes, Insulin, Narcotics (opioids), Chemotherapy, Heparin and
// other anticoagulants, Sedatives. Plus lithium, digoxin and amiodarone (narrow therapeutic range).
// A plain list in code for the sprint; later a database table with an admin screen (architecture.md section 4).
// Terms are matched as whole words against the medicine's tidied-up generic name (brands are mapped first),
// so "potassium" matches "potassium chloride" and "insulin" matches "insulin glargine".

export type HighRiskRule = { terms: string[]; category: string };

export const HIGH_RISK_RULES: HighRiskRule[] = [
  { category: "Anti-infective", terms: ["gentamicin", "amikacin", "tobramycin", "vancomycin", "teicoplanin"] },
  { category: "Potassium or electrolyte", terms: ["potassium"] },
  { category: "Insulin", terms: ["insulin"] },
  {
    category: "Opioid",
    terms: [
      "morphine", "diamorphine", "oxycodone", "fentanyl", "buprenorphine", "methadone", "tramadol", "tapentadol",
      "hydromorphone", "codeine", "dihydrocodeine", "co-codamol", "co-dydramol",
    ],
  },
  {
    category: "Chemotherapy",
    terms: ["methotrexate", "capecitabine", "cyclophosphamide", "hydroxycarbamide", "mercaptopurine", "temozolomide"],
  },
  {
    category: "Anticoagulant",
    terms: [
      "warfarin", "apixaban", "rivaroxaban", "edoxaban", "dabigatran", "heparin", "enoxaparin", "dalteparin",
      "tinzaparin", "fondaparinux", "acenocoumarol", "phenindione",
    ],
  },
  {
    category: "Sedative",
    terms: [
      "midazolam", "diazepam", "lorazepam", "temazepam", "nitrazepam", "clonazepam", "chlordiazepoxide",
      "zopiclone", "zolpidem",
    ],
  },
  { category: "Narrow therapeutic range", terms: ["lithium", "digoxin", "amiodarone"] },
];

// The category for a tidied-up generic name, or null if it isn't high-risk.
export function highRiskCategory(genericName: string): string | null {
  const words = genericName.split(" ");
  for (const rule of HIGH_RISK_RULES) {
    if (rule.terms.some((term) => words.includes(term))) {
      return rule.category;
    }
  }
  return null;
}
