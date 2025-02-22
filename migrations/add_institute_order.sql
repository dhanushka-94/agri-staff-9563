-- Add order column to institutes table
ALTER TABLE institutes ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Update existing institutes with incremental order within each department
WITH ordered_institutes AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY department_id 
      ORDER BY created_at
    ) as row_num
  FROM institutes
)
UPDATE institutes
SET "order" = od.row_num
FROM ordered_institutes od
WHERE institutes.id = od.id; 