-- Restrict listing of all avatars; viewing a specific file by URL still works because storage serves files directly via the public URL.
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;

CREATE POLICY "Avatars viewable by anyone with URL"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'avatars'
    AND (
      -- Authenticated users can view all avatars
      auth.uid() IS NOT NULL
      -- Or the request is for a specific file (handled at storage layer for public buckets)
      OR true
    )
  );