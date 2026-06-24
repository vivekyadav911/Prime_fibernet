-- Officer documents: storage_path, display_name, additional document support

ALTER TABLE public.officer_documents ADD COLUMN IF NOT EXISTS storage_path TEXT;
ALTER TABLE public.officer_documents ADD COLUMN IF NOT EXISTS display_name TEXT;

-- storage_path is canonical; file_url is legacy and optional
ALTER TABLE public.officer_documents ALTER COLUMN file_url DROP NOT NULL;

-- Expand document_type to allow additional (multi-file) documents
ALTER TABLE public.officer_documents DROP CONSTRAINT IF EXISTS officer_documents_document_type_check;
ALTER TABLE public.officer_documents ADD CONSTRAINT officer_documents_document_type_check
  CHECK (document_type IN (
    'profile_photo', 'id_proof', 'address_proof',
    'photo_id_front', 'photo_id_back', 'resume', 'additional'
  ));

-- Standard types: one row per officer per type; additional docs can be many
CREATE UNIQUE INDEX IF NOT EXISTS idx_officer_documents_standard_unique
  ON public.officer_documents (officer_id, document_type)
  WHERE document_type != 'additional';

-- Backfill storage_path from legacy file_url (path after /officer-documents/)
UPDATE public.officer_documents
SET storage_path = regexp_replace(file_url, '^.*/officer-documents/', '')
WHERE storage_path IS NULL
  AND file_url IS NOT NULL
  AND file_url LIKE '%/officer-documents/%';

-- Backfill display_name for standard types
UPDATE public.officer_documents d
SET display_name = CASE d.document_type
  WHEN 'photo_id_front' THEN 'Photo ID - Front Side'
  WHEN 'photo_id_back' THEN 'Photo ID - Back Side'
  WHEN 'profile_photo' THEN 'Profile Photo'
  WHEN 'resume' THEN 'Resume/CV'
  WHEN 'id_proof' THEN 'Photo ID - Front Side'
  WHEN 'address_proof' THEN 'Photo ID - Back Side'
  ELSE COALESCE(d.display_name, 'Document')
END
WHERE d.display_name IS NULL
  AND d.document_type != 'additional';
