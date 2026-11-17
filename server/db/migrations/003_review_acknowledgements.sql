-- 003_review_acknowledgements.sql: who checked each "Needs review" line, when, and their optional note (D-048).
-- Additive only (D-020). Replaces the plain key list dms_stages.acknowledged_review_keys as the place the
-- approval gate looks (D-032's rule is unchanged: every flagged line must be acknowledged before completing).
-- The old column stays in place, unused, so nothing existing breaks.
CREATE TABLE review_acknowledgements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id         uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  stage           smallint NOT NULL CHECK (stage IN (1, 2)),
  review_key      text NOT NULL,           -- the comparison line's key, e.g. "from:<id>|to:<id>"
  acknowledged_by uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  note            text,
  UNIQUE (case_id, stage, review_key)      -- one acknowledgement per line
);
CREATE INDEX review_acknowledgements_case_id_idx ON review_acknowledgements (case_id);

-- Same lock-down as every other table (D-017).
ALTER TABLE review_acknowledgements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON review_acknowledgements FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON review_acknowledgements FROM authenticated;
  END IF;
END
$$;
