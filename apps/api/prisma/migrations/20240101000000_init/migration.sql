-- 20240101000000_init
-- Consolidated initial schema created from legacy SQL (0_init.sql)

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userid" TEXT,
    "filename" TEXT NOT NULL,
    "originalname" TEXT,
    "s3key" TEXT,
    "gcspath" TEXT,
    "mimetype" TEXT,
    "size" INTEGER NOT NULL,
    "ocrstatus" TEXT NOT NULL DEFAULT 'pending',
    "uploadedat" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ocr_results" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "full_text" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "page_count" INTEGER,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ocr_results_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "documentId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "hintLevel" INTEGER,
    "modelUsed" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL,
    "eventProperties" JSONB NOT NULL DEFAULT '{}',
    "pageUrl" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "api_usage_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseTimeMs" INTEGER,
    "requestSizeBytes" INTEGER,
    "responseSizeBytes" INTEGER,
    "externalApiCalls" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "errorStack" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "api_usage_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_daily_stats" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "date" DATE NOT NULL,
    "filesUploaded" INTEGER NOT NULL DEFAULT 0,
    "ocrPagesProcessed" INTEGER NOT NULL DEFAULT 0,
    "chatMessagesSent" INTEGER NOT NULL DEFAULT 0,
    "chatSessions" INTEGER NOT NULL DEFAULT 0,
    "apiRequestsTotal" INTEGER NOT NULL DEFAULT 0,
    "apiRequestsSuccess" INTEGER NOT NULL DEFAULT 0,
    "apiRequestsFailed" INTEGER NOT NULL DEFAULT 0,
    "googleVisionCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "deepseekCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "storageCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "activeTimeMinutes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_daily_stats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "focus_sessions" (
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
    "completion_proof_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "focus_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "focus_distractions" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "distractionType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "duration" INTEGER,
    CONSTRAINT "focus_distractions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "documents_userid_idx" ON "documents"("userid");
CREATE UNIQUE INDEX "ocr_results_document_id_key" ON "ocr_results"("document_id");
CREATE INDEX "conversations_userId_idx" ON "conversations"("userId");
CREATE INDEX "conversations_documentId_idx" ON "conversations"("documentId");
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");
CREATE INDEX "analytics_events_userId_createdAt_idx" ON "analytics_events"("userId", "createdAt");
CREATE INDEX "analytics_events_eventName_createdAt_idx" ON "analytics_events"("eventName", "createdAt");
CREATE INDEX "analytics_events_sessionId_createdAt_idx" ON "analytics_events"("sessionId", "createdAt");
CREATE INDEX "api_usage_logs_userId_createdAt_idx" ON "api_usage_logs"("userId", "createdAt");
CREATE INDEX "api_usage_logs_endpoint_createdAt_idx" ON "api_usage_logs"("endpoint", "createdAt");
CREATE INDEX "user_daily_stats_userId_date_idx" ON "user_daily_stats"("userId", "date");
CREATE UNIQUE INDEX "user_daily_stats_userId_date_key" ON "user_daily_stats"("userId", "date");
CREATE INDEX "focus_sessions_userId_status_idx" ON "focus_sessions"("userId", "status");
CREATE INDEX "focus_sessions_startTime_idx" ON "focus_sessions"("startTime");
CREATE INDEX "focus_distractions_sessionId_timestamp_idx" ON "focus_distractions"("sessionId", "timestamp");

ALTER TABLE "documents" ADD CONSTRAINT "documents_userid_fkey" FOREIGN KEY ("userid") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ocr_results" ADD CONSTRAINT "ocr_results_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "focus_distractions" ADD CONSTRAINT "focus_distractions_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "focus_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
