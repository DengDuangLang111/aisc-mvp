-- Refactor document column naming to snake_case and drop legacy s3Key field

ALTER TABLE "documents" RENAME COLUMN "userid" TO "user_id";
ALTER TABLE "documents" RENAME COLUMN "originalname" TO "original_name";
ALTER TABLE "documents" RENAME COLUMN "gcspath" TO "gcs_path";
ALTER TABLE "documents" RENAME COLUMN "mimetype" TO "mime_type";
ALTER TABLE "documents" RENAME COLUMN "ocrstatus" TO "ocr_status";
ALTER TABLE "documents" RENAME COLUMN "uploadedat" TO "uploaded_at";

ALTER TABLE "documents" DROP COLUMN "s3key";
