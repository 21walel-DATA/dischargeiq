-- 001_init.sql: the whole decided data model (architecture.md section 4, D-021, D-032).
-- Runs once, inside a transaction (see runMigrations.ts). Synthetic data only.

-- Users: the minimum we need (golden rule 14). Passwords are stored only as bcrypt hashes.
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  role          text NOT NULL DEFAULT 'pharmacist' CHECK (role IN ('pharmacist', 'admin')),
  created_at    timestamptz NOT NULL DEFAULT now()
);
-- One account per email, ignoring capital letters.
CREATE UNIQUE INDEX users_email_unique ON users (lower(email));

-- Cases (the brief's "collections"). Reference is pseudonymous, never a patient's name.
CREATE TABLE cases (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reference            text NOT NULL,
  referral_received_at timestamptz,
  hospital_name        text,
  letter_text          text,
  status               text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'in_progress', 'complete')),
  claim_status         text NOT NULL DEFAULT 'not_ready' CHECK (claim_status IN ('not_ready', 'ready', 'claimed')),
  claimed_at           timestamptz,
  is_demo              boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, reference)
);
CREATE INDEX cases_user_id_idx ON cases (user_id);

-- DMS stages: exactly three rows per case (D-021).
CREATE TABLE dms_stages (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                  uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  stage                    smallint NOT NULL CHECK (stage IN (1, 2, 3)),
  status                   text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'not_applicable')),
  not_applicable_reason    text,
  completed_at             timestamptz,
  completed_by             uuid REFERENCES users (id),
  notes                    text,
  acknowledged_review_keys text[] NOT NULL DEFAULT '{}',  -- D-032: lines the pharmacist has checked
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (case_id, stage),
  -- "Not applicable" always needs a reason.
  CHECK (status <> 'not_applicable' OR not_applicable_reason IS NOT NULL)
);

-- Medicines (the brief's "things"), on one of three lists.
CREATE TABLE medicines (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  list_type      text NOT NULL CHECK (list_type IN ('pre_admission', 'discharge', 'new_prescription')),
  name           text NOT NULL,
  strength       text,
  form           text,
  dose           text,
  frequency      text,
  route          text,
  dmd_code       text,
  source_text    text,           -- the exact sentence from the letter
  ai_confidence  numeric(3, 2) CHECK (ai_confidence BETWEEN 0 AND 1),
  edited_by_user boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX medicines_case_id_idx ON medicines (case_id);

-- The comparison result, stored when a stage is completed.
CREATE TABLE reconciliation_items (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                uuid NOT NULL REFERENCES cases (id) ON DELETE CASCADE,
  stage                  smallint NOT NULL CHECK (stage IN (1, 2)),
  from_medicine_id       uuid REFERENCES medicines (id) ON DELETE SET NULL,
  to_medicine_id         uuid REFERENCES medicines (id) ON DELETE SET NULL,
  change_type            text NOT NULL CHECK (change_type IN ('started', 'stopped', 'changed', 'unchanged')),
  change_detail          text,
  needs_review           boolean NOT NULL DEFAULT false,
  review_reason          text,
  review_acknowledged_by uuid REFERENCES users (id),
  review_acknowledged_at timestamptz,
  high_risk              boolean NOT NULL DEFAULT false,
  pharmacist_note        text,
  created_at             timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX reconciliation_items_case_id_idx ON reconciliation_items (case_id);

-- Lock the tables down (D-017). Supabase publishes tables in "public" through its Data API using the
-- "anon" and "authenticated" roles. RLS with NO policies denies those roles everything; our server's
-- own role still works. Revoking privileges is a second lock on the same door.
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases                ENABLE ROW LEVEL SECURITY;
ALTER TABLE dms_stages           ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicines            ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations    ENABLE ROW LEVEL SECURITY;

-- These roles exist on Supabase but not in the plain Postgres used by CI, so only revoke when present.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
  END IF;
END
$$;
