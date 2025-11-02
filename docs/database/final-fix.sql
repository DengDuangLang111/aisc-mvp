-- 添加最后缺失的列
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "documentId" TEXT;
ALTER TABLE conversations DROP COLUMN IF EXISTS document_id;

-- 清理 api_usage_logs 的 snake_case 列
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS status_code;
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS response_time_ms;
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS request_size_bytes;
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS response_size_bytes;
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS external_api_calls;
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS error_message;
ALTER TABLE api_usage_logs DROP COLUMN IF EXISTS error_stack;
