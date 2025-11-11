import type { HintLevel } from '@study-oasis/contracts';
import { ChatPromptBuilder } from './chat-prompt.builder';

/**
 * 数据库消息类型（匹配实际Prisma返回）
 */
interface DbMessage {
  id: string;
  role: string;
  content: string;
  tokensUsed: number | null;
  hintLevel: number | null;
  modelUsed: string | null;
  createdAt: Date;
  conversationId: string;
}

/**
 * DeepSeek API 消息类型
 */
interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * ChatMessageHelper
 *
 * 负责消息历史的构建和处理
 * - 构建 AI API 消息历史
 * - 添加系统提示和文档上下文
 * - 消息历史裁剪（避免超过token限制）
 */
export class ChatMessageHelper {
  /**
   * 构建消息历史（用于发送给 AI API）
   * @param dbMessages 数据库中的历史消息
   * @param documentContext 文档上下文（可选）
   * @param hintLevel 提示等级
   * @returns DeepSeek API 格式的消息数组
   */
  static buildMessageHistory(
    dbMessages: DbMessage[],
    documentContext: string | undefined,
    hintLevel: HintLevel,
  ): DeepSeekMessage[] {
    const messages: DeepSeekMessage[] = [];

    // 1. 系统提示（根据 hintLevel 调整）
    const systemPrompt = ChatPromptBuilder.buildSystemPrompt(
      hintLevel,
      !!documentContext,
    );
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    // 2. 文档上下文（如果有）
    if (documentContext) {
      this.appendDocumentContext(messages, documentContext);
    }

    // 3. 历史消息（最近 10 条）
    dbMessages.slice(-10).forEach((msg: DbMessage) => {
      messages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    });

    return messages;
  }

  /**
   * 生成会话 ID
   * @returns 唯一的会话ID
   */
  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static appendDocumentContext(
    messages: DeepSeekMessage[],
    documentContext: string,
  ): void {
    const NORMALIZED = documentContext.replace(/\s+\n/g, '\n').trim();
    const CHUNK_SIZE = 2000;
    const MAX_CONTEXT = 20000;
    const limitedContext = NORMALIZED.slice(0, MAX_CONTEXT);
    const totalChunks = Math.ceil(limitedContext.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const chunk = limitedContext.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      messages.push({
        role: 'system',
        content: `文档片段 ${i + 1}/${totalChunks}（保持原始顺序）：\n${chunk}`,
      });
    }

    if (NORMALIZED.length > MAX_CONTEXT) {
      messages.push({
        role: 'system',
        content:
          '⚠️ 文档内容较长，只截取了前半部分。若需要更详细的段落，可让学生指定页码或关键段落，我会再深入查阅。',
      });
    }
  }
}
