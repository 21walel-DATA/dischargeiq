// Home page (docs/designs/home-desktop.png). The first thing a visitor sees: what the tool does, the three DMS
// stages, and the safety principle "AI reads, code compares, pharmacist approves" (D-003).
// The example labels use the agreed demo case DMS-0042 (D-037), drawn with the same label styles as the app.
import { Link } from "react-router";
import { STAGE_FEES } from "@dischargeiq/shared";
import { useAuth } from "../auth/AuthContext";
import { StatusMark } from "../components/StatusMark";
import form from "../components/Form.module.css";
import page from "../components/Page.module.css";
import label from "../components/Label.module.css";
import recon from "../components/Recon.module.css";
import styles from "./HomePage.module.css";

export function HomePage() {
  const { user } = useAuth();

  return (
    <>
      <section className={styles.hero}>
        <div>
          <h1 className={styles.title}>See what changed in a discharge letter before the patient's next prescription</h1>
          <p className={styles.lede}>
            Paste the hospital letter and the patient's medicines from your PMR. DischargeIQ lists every medicine that was
            started, stopped or changed, shows the sentence it came from, and takes the referral through all three DMS
            stages to a claim-ready record.
          </p>
          <div className={page.btnRow}>
            <Link className={form.button} to="/demo">
              Try a demo case
            </Link>
            {user ? (
              <Link className={form.buttonSecondary} to="/cases">
                Go to my cases
              </Link>
            ) : (
              <Link className={form.buttonSecondary} to="/login">
                Log in
              </Link>
            )}
          </div>
        </div>

        {/* Three labels from the synthetic demo case: one stopped (high-risk), one changed, one checked. */}
        <div className={styles.labels} role="group" aria-label="Example from the synthetic demo case DMS-0042">
          <div className={`${label.label} ${label.bandStopped} ${label.struck}`}>
            <div className={label.highrisk}>
              <span className={label.octagon} aria-hidden="true">
                !
              </span>
              High-risk medicine (Anticoagulant)
            </div>
            <div className={label.line1}>
              <span className={label.name}>Warfarin</span>
              <span className={`${label.strength} num`}>3 mg</span>
            </div>
            <div className={styles.foot}>
              <StatusMark kind="stopped" />
              <span className={`${page.small} ${page.muted}`}>“Warfarin withheld following upper GI bleed…”</span>
            </div>
          </div>

          <div className={`${label.label} ${label.bandChanged}`}>
            <div className={label.line1}>
              <span className={label.name}>Amlodipine</span>
              <span className={`${label.strength} num`}>
                <span className={recon.was}>5 mg</span> <span className={recon.now}>10 mg</span>
              </span>
            </div>
            <div className={styles.foot}>
              <StatusMark kind="changed" text="Changed: strength" />
              <span className={`${page.small} ${page.muted}`}>“Amlodipine increased to 10 mg once daily.”</span>
            </div>
          </div>

          <div className={`${label.label} ${label.muted}`}>
            <div className={label.line1}>
              <span className={label.name}>Zestril</span>
              <span className={`${label.strength} num`}>10 mg</span>
            </div>
            <div className={styles.foot}>
              <StatusMark kind="resolved" text="Checked: same as lisinopril" />
              <span className={recon.checkedBy}>
                Checked by <span className={recon.box}>DP</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how">The three stages of the Discharge Medicines Service</h2>
        <ol className={styles.steps}>
          <li>
            <h3>1. Review the discharge information</h3>
            <p>
              AI reads the letter; plain code compares it with the pre-admission list. Aim to finish within 72 hours of the
              referral.
            </p>
            <span className={styles.fee}>Fee £{STAGE_FEES[1]}</span>
          </li>
          <li>
            <h3>2. Check the first new prescription</h3>
            <p>The same comparison checks the GP's first prescription against the discharge list, so a missed change stands out.</p>
            <span className={styles.fee}>Fee £{STAGE_FEES[2]}</span>
          </li>
          <li>
            <h3>3. Talk to the patient or carer</h3>
            <p>Record the consultation, then copy a claim-ready summary into Manage Your Service.</p>
            <span className={styles.fee}>Fee £{STAGE_FEES[3]}</span>
          </li>
        </ol>
      </section>

      <section className={styles.principle} aria-label="How the tool stays safe">
        <div>
          <h3>AI only reads</h3>
          <p>It pulls medicines out of the letter and quotes the sentence each came from. It never suggests a dose or a switch.</p>
        </div>
        <div>
          <h3>Code compares</h3>
          <p>
            The started, stopped and changed list comes from tested rules, not from AI. If a match is uncertain, the line is
            marked for review.
          </p>
        </div>
        <div>
          <h3>You approve</h3>
          <p>A stage can't be completed until you've checked every flagged line and added your initials.</p>
        </div>
      </section>
    </>
  );
}
