-- Add new values to resource_type enum safely
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'NOTES';
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'PRESENTATION';
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'EXTERNAL';
ALTER TYPE resource_type ADD VALUE IF NOT EXISTS 'SIMULATION';

-- Core taxonomy fields
ALTER TABLE resources
  ADD COLUMN IF NOT EXISTS board text,
  ADD COLUMN IF NOT EXISTS curriculum text,
  ADD COLUMN IF NOT EXISTS chapter text,
  ADD COLUMN IF NOT EXISTS subtopic text,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS duration_mins integer,

  -- Source & verification
  ADD COLUMN IF NOT EXISTS source_origin text DEFAULT 'PalmLeef',
  ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'VERIFIED',
  ADD COLUMN IF NOT EXISTS access_level text DEFAULT 'SCHOOL',

  -- Multiple selections as arrays
  ADD COLUMN IF NOT EXISTS learning_purpose text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS content_style text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS learning_outcome text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS recommended_for text[] DEFAULT '{}',

  -- Analytics
  ADD COLUMN IF NOT EXISTS downloads integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bookmarks integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reviews_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS average_rating numeric(3,2) DEFAULT 0.00;

-- Auto-generate human-readable resource IDs (RES-YYYY-XXXXXX)
-- Add ID column if it doesn't exist
ALTER TABLE resources ADD COLUMN IF NOT EXISTS resource_id text UNIQUE;

-- Backfill existing rows
UPDATE resources
SET resource_id = 'RES-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD((row_number() OVER (ORDER BY created_at))::text, 6, '0')
WHERE resource_id IS NULL;

-- Create a function + trigger to assign resource_id on insert
CREATE OR REPLACE FUNCTION assign_resource_id()
RETURNS TRIGGER AS $$
DECLARE
  seq_num bigint;
BEGIN
  SELECT COALESCE(MAX(REPLACE(SPLIT_PART(resource_id, '-', 3), '', '')::bigint), 0) + 1
  INTO seq_num
  FROM resources
  WHERE resource_id IS NOT NULL;
  NEW.resource_id := 'RES-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(seq_num::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assign_resource_id ON resources;
CREATE TRIGGER trg_assign_resource_id
BEFORE INSERT ON resources
FOR EACH ROW
WHEN (NEW.resource_id IS NULL)
EXECUTE FUNCTION assign_resource_id();
