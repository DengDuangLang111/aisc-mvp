import { z } from 'zod';

/**
 * 消息角色枚举
 */
export const MessageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/**
 * 单条消息的结构
 */
export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1),
  timestamp: z.number().optional(),
});
export type Message = z.infer<typeof MessageSchema>;

/**
 * 提示等级：1 (轻微) → 2 (中等) → 3 (详细)
 */
export const HintLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type HintLevel = z.infer<typeof HintLevelSchema>;

/**
 * 聊天请求
 */
export const ChatRequestSchema = z.object({
  uploadId: z.string().uuid().optional(),
  message: z.string().min(1).max(1000),
  conversationHistory: z.array(MessageSchema).default([]),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * 聊天响应
 */
export const ChatResponseSchema = z.object({
  reply: z.string(),
  hintLevel: HintLevelSchema,
  sources: z.array(z.string()).optional(),
  timestamp: z.number(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
