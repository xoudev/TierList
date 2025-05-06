-- Enable Storage
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
SELECT 'tier-list-images', 'tier-list-images'
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'tier-list-images');

-- Set up RLS for the bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy pour permettre à tout le monde de voir les images
CREATE POLICY "Les images sont publiquement accessibles"
ON storage.objects FOR SELECT
USING (bucket_id = 'tier-list-images');

-- Policy pour permettre aux utilisateurs authentifiés d'uploader des images
CREATE POLICY "Les utilisateurs authentifiés peuvent uploader des images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'tier-list-images'
  AND auth.role() = 'authenticated'
);

-- Policy pour permettre aux utilisateurs authentifiés de mettre à jour leurs images
CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour leurs images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'tier-list-images'
  AND auth.uid() = owner
)
WITH CHECK (
  bucket_id = 'tier-list-images'
  AND auth.uid() = owner
);

-- Policy pour permettre aux utilisateurs authentifiés de supprimer leurs images
CREATE POLICY "Les utilisateurs authentifiés peuvent supprimer leurs images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'tier-list-images'
  AND auth.uid() = owner
); 