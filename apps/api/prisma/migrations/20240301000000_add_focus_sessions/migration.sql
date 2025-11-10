-- 20240301000000_add_focus_sessions
-- Adds focus_sessions / focus_distractions (legacy script add_focus_sessions.sql)

CREATE TABLE IF NOT EXISTS "focus_sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "documentId" TEXT,
    "conversationId" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endTime" TIMESTAMP(3),
    "totalDuration" INTEGER,
    "activeDuration" INTEGER,
    "pauseCount" INTEGER NOT NULL DEFAULT 0,
    "distractionCount" INTEGER NOT NULL DEFAULT 0,
    "tabSwitchCount" INTEGER NOT NULL DEFAULT 0,
    "questionsAsked" INTEGER NOT NULL DEFAULT 0,
    "focusScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'active',
    "completionProofId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "focus_distractions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "distractionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    CONSTRAINT "focus_distractions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "focus_sessions_userId_status_idx" ON "focus_sessions"("userId", "status");
CREATE INDEX IF NOT EXISTS "focus_sessions_startTime_idx" ON "focus_sessions"("startTime");
CREATE INDEX IF NOT EXISTS "focus_distractions_sessionId_timestamp_idx" ON "focus_distractions"("sessionId", "timestamp");

ALTER TABLE "focus_distractions"
    ADD CONSTRAINT "focus_distractions_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "focus_sessions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
