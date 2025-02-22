-- Add order column to subdivisions table
ALTER TABLE subdivisions ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Update existing subdivisions with incremental order within each institute
WITH ordered_subdivisions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY institute_id 
      ORDER BY created_at
    ) as row_num
  FROM subdivisions
)
UPDATE subdivisions
SET "order" = od.row_num
FROM ordered_subdivisions od
WHERE subdivisions.id = od.id; 