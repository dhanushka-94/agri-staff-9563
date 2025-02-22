-- Add order column to units table
ALTER TABLE units ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Update existing units with incremental order within each subdivision
WITH ordered_units AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY subdivision_id 
      ORDER BY created_at
    ) as row_num
  FROM units
)
UPDATE units
SET "order" = od.row_num
FROM ordered_units od
WHERE units.id = od.id; 