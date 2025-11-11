DO $$
DECLARE
    doc_column_type TEXT;
BEGIN
    SELECT data_type
    INTO doc_column_type
    FROM information_schema.columns
    WHERE table_name = 'documents'
      AND column_name = 'id';

    IF doc_column_type IS NULL THEN
        RAISE EXCEPTION 'documents.id column not found';
    END IF;

    EXECUTE format(
        'CREATE TABLE "ocr_pages" (
            "id" TEXT NOT NULL,
            "document_id" %s NOT NULL,
            "page_number" INTEGER NOT NULL,
            "content" TEXT NOT NULL,
            "summary" TEXT,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ocr_pages_pkey" PRIMARY KEY ("id")
        )',
        doc_column_type
    );

    EXECUTE format(
        'CREATE TABLE "document_insights" (
            "id" TEXT NOT NULL,
            "document_id" %s NOT NULL,
            "summary" TEXT,
            "faq" JSONB,
            "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "document_insights_pkey" PRIMARY KEY ("id")
        )',
        doc_column_type
    );
END $$;

CREATE UNIQUE INDEX "ocr_pages_document_id_page_number_key"
  ON "ocr_pages"("document_id", "page_number");

ALTER TABLE "ocr_pages"
  ADD CONSTRAINT "ocr_pages_document_id_fkey"
  FOREIGN KEY ("document_id")
  REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "document_insights_document_id_key"
  ON "document_insights"("document_id");

ALTER TABLE "document_insights"
  ADD CONSTRAINT "document_insights_document_id_fkey"
  FOREIGN KEY ("document_id")
  REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
