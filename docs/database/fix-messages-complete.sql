-- 添加 messages 表的所有必需列
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "conversationId" TEXT NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "content" TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "hintLevel" INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "modelUsed" TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "tokensUsed" INTEGER;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- 清理 snake_case 列
ALTER TABLE messages DROP COLUMN IF EXISTS conversation_id;
ALTER TABLE messages DROP COLUMN IF EXISTS hint_level;
ALTER TABLE messages DROP COLUMN IF EXISTS model_used;
ALTER TABLE messages DROP COLUMN IF EXISTS tokens_used;
ALTER TABLE messages DROP COLUMN IF EXISTS created_at;

-- 验证
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'messages'
ORDER BY ordinal_position;
