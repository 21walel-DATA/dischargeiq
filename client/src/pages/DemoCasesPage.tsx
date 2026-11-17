// Demo cases (docs/designs/demo-cases-desktop.png): public, synthetic, read-only. No login needed to look.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import type { CaseSummary } from "@dischargeiq/shared";
import { listDemoCases } from "../api/cases";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";

// One line per demo case: what the scenario shows. Written by the owner (architecture.md section 12, D-047).
const SCENARIOS: Record<string, string> = {
  "DMS-0042": "Upper GI bleed: warfarin withheld, naproxen stopped, lansoprazole started, amlodipine increased",
  "DMS-0043": "Anticoagulant switch: warfarin stopped, apixaban started (atrial fibrillation)",
  "DMS-0044": "Hypoglycaemia: insulin glargine reduced from 20 to 16 units at night",
  "DMS-0045": "Omission: levothyroxine on the PMR but not mentioned in the letter",
  "DMS-0046": "Heart failure: furosemide once daily to twice daily, spironolactone started",
  "DMS-0047": "After knee surgery: 5-day morphine MR course and senna started, ibuprofen stopped",
};

export function DemoCasesPage() {
  const [cases, setCases] = useState<CaseSummary[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    listDemoCases().then((result) => {
      if (result.ok) setCases(result.cases);
      else setError(result.message);
    });
  }, []);

  return (
    <>
      <div className={page.head}>
        <div>
          <h1>Demo cases</h1>
          <p className={`${page.lead} ${page.muted}`}>
            Synthetic discharge referrals written for this prototype. Open one to see the comparison; you can't change them.
          </p>
        </div>
      </div>

      {error && (
        <div className={form.alert} role="alert">
          {error}
        </div>
      )}
      {!cases && !error && <p role="status">Loading demo cases…</p>}
      {cases && cases.length === 0 && <p>No demo cases yet.</p>}

      {cases && cases.length > 0 && (
        <table className={page.table}>
          <thead>
            <tr>
              <th>Case</th>
              <th>Scenario</th>
              <th>Hospital</th>
              <th>
                <span className="visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {cases.map((item) => (
              <tr key={item.id}>
                <td className={page.main} data-label="Case">
                  <strong>{item.reference}</strong>
                </td>
                <td data-label="Scenario">{SCENARIOS[item.reference] ?? "Synthetic referral"}</td>
                <td data-label="Hospital">{item.hospitalName ?? "Not recorded"}</td>
                <td data-label="">
                  <Link to={`/demo/${item.id}`}>Open {item.reference}</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
