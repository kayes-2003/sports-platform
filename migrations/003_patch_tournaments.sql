-- Run this in Neon Console → SQL Editor
-- Safely adds any columns that the migration may have missed

ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS venue VARCHAR(150);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS prize VARCHAR(150);
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS group_count INTEGER DEFAULT 2;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS teams_advance_per_group INTEGER DEFAULT 2;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Verify
SELECT column_name FROM information_schema.columns
WHERE table_name = 'tournaments' AND table_schema = 'public'
ORDER BY ordinal_position;
