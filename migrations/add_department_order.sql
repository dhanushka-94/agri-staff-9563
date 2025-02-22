-- Add order column to departments table
ALTER TABLE departments ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Update existing departments with incremental order
WITH ordered_departments AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as row_num
  FROM departments
)
UPDATE departments
SET "order" = od.row_num
FROM ordered_departments od
WHERE departments.id = od.id; 