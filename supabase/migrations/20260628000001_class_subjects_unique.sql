-- Add unique constraint on (class_id, subject_id) for upsert support
-- Clean up any accidental duplicates first, keeping the earliest row

DELETE FROM class_subjects a USING class_subjects b
WHERE a.id < b.id
  AND a.class_id = b.class_id
  AND a.subject_id = b.subject_id;

ALTER TABLE class_subjects
ADD CONSTRAINT class_subjects_class_id_subject_id_key
UNIQUE (class_id, subject_id);
