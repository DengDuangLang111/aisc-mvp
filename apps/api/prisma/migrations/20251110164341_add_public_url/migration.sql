-- Add optional public_url column for storing signed URLs
ALTER TABLE "public"."documents"
  ADD COLUMN IF NOT EXISTS "public_url" TEXT;
