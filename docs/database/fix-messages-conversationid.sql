-- 添加 messages 表的 conversationId 列
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "conversationId" TEXT NOT NULL;
ALTER TABLE messages DROP COLUMN IF EXISTS conversation_id;

-- 验证
SELECT 'Verification:' as status;
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'messages' AND column_name LIKE '%conversation%';
