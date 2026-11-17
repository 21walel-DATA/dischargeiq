-- 002_letter_status.sql: what the discharge letter itself says about each extracted medicine (D-045).
-- Additive only (D-020): one new, optional column; existing rows are untouched.
-- Lets a STOPPED line quote the letter ("Warfarin withheld...") instead of losing that sentence (D-037).
ALTER TABLE medicines
  ADD COLUMN letter_status text
  CHECK (letter_status IN ('new', 'stopped', 'changed', 'continued', 'withheld'));
