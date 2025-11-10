-- 20241110000000_add_document_public_url

ALTER TABLE "documents"
    ADD COLUMN IF NOT EXISTS "public_url" TEXT;
