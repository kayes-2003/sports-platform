-- Fix: drop old format check constraint and recreate with all 4 formats
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_format_check;

ALTER TABLE tournaments ADD CONSTRAINT tournaments_format_check
  CHECK (format IN ('single_elimination', 'double_elimination', 'round_robin', 'group_knockout'));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'tournaments'::regclass AND contype = 'c';
