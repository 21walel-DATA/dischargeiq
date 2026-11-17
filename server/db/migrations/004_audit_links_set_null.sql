-- 004_audit_links_set_null.sql: "completed by" / "acknowledged by" links no longer block deleting a user (D-048).
-- Postgres could not delete a user who had completed a stage on their own case: the direct link from dms_stages to
-- users was checked before the case (and its stages) had been removed by the cascade. These are audit fields, so
-- when a user is deleted they become empty (SET NULL) instead of blocking. No data changes.
ALTER TABLE dms_stages
  DROP CONSTRAINT dms_stages_completed_by_fkey,
  ADD CONSTRAINT dms_stages_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE reconciliation_items
  DROP CONSTRAINT reconciliation_items_review_acknowledged_by_fkey,
  ADD CONSTRAINT reconciliation_items_review_acknowledged_by_fkey
    FOREIGN KEY (review_acknowledged_by) REFERENCES users (id) ON DELETE SET NULL;
