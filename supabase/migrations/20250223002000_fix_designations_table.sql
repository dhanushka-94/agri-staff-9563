-- Drop existing triggers and functions if they exist
DROP TRIGGER IF EXISTS set_designation_level ON designations;
DROP TRIGGER IF EXISTS prevent_circular_reference ON designations;
DROP TRIGGER IF EXISTS update_designations_updated_at ON designations;

DROP FUNCTION IF EXISTS calculate_designation_level();
DROP FUNCTION IF EXISTS check_circular_reference();
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS designations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES designations(id),
    level INTEGER DEFAULT 0,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    CONSTRAINT prevent_self_reference CHECK (id != parent_id)
);

-- Create or replace functions and triggers
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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER set_designation_level
    BEFORE INSERT OR UPDATE OF parent_id
    ON designations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_designation_level();

CREATE TRIGGER prevent_circular_reference
    BEFORE INSERT OR UPDATE OF parent_id
    ON designations
    FOR EACH ROW
    EXECUTE FUNCTION check_circular_reference();

CREATE TRIGGER update_designations_updated_at
    BEFORE UPDATE ON designations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_designations_parent_id ON designations(parent_id);
CREATE INDEX IF NOT EXISTS idx_designations_level_order ON designations(level, "order");

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