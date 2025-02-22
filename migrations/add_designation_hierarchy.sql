-- Add hierarchy columns to designations table
ALTER TABLE designations 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES designations(id),
ADD COLUMN IF NOT EXISTS "level" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 0;

-- Add constraint to prevent self-referencing
ALTER TABLE designations
ADD CONSTRAINT prevent_self_reference 
CHECK (id != parent_id);

-- Create function to calculate level
CREATE OR REPLACE FUNCTION calculate_designation_level()
RETURNS TRIGGER AS $$
DECLARE
    parent_level INTEGER;
BEGIN
    IF NEW.parent_id IS NULL THEN
        NEW.level := 0;
    ELSE
        SELECT level INTO parent_level
        FROM designations
        WHERE id = NEW.parent_id;
        
        NEW.level := parent_level + 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate level
CREATE TRIGGER set_designation_level
    BEFORE INSERT OR UPDATE OF parent_id
    ON designations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_designation_level();

-- Function to check for circular references
CREATE OR REPLACE FUNCTION check_circular_reference()
RETURNS TRIGGER AS $$
DECLARE
    current_parent_id UUID;
BEGIN
    IF NEW.parent_id IS NULL THEN
        RETURN NEW;
    END IF;

    current_parent_id := NEW.parent_id;
    WHILE current_parent_id IS NOT NULL LOOP
        IF current_parent_id = NEW.id THEN
            RAISE EXCEPTION 'Circular reference detected in designation hierarchy';
        END IF;
        
        SELECT parent_id INTO current_parent_id
        FROM designations
        WHERE id = current_parent_id;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular references
CREATE TRIGGER prevent_circular_reference
    BEFORE INSERT OR UPDATE OF parent_id
    ON designations
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_reference();

-- Update existing designations to have correct levels
WITH RECURSIVE designation_tree AS (
    -- Base case: root designations
    SELECT id, parent_id, 0 as calculated_level
    FROM designations
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child designations
    SELECT d.id, d.parent_id, dt.calculated_level + 1
    FROM designations d
    JOIN designation_tree dt ON d.parent_id = dt.id
)
UPDATE designations d
SET level = dt.calculated_level
FROM designation_tree dt
WHERE d.id = dt.id; 