-- 20240401000000_fix_completion_proof_id

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'focus_sessions'
          AND column_name = 'completionProofId'
    ) THEN
        ALTER TABLE "focus_sessions" RENAME COLUMN "completionProofId" TO "completion_proof_id";
    END IF;
END $$;

ALTER TABLE "focus_sessions"
    ADD COLUMN IF NOT EXISTS "completion_proof_id" TEXT;
