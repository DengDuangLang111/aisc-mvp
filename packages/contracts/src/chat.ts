import { z } from 'zod';

/**
 * 消息角色枚举
 * - user: 用户发送的消息
 * - assistant: AI助手回复的消息
 */
export const MessageRoleSchema = z.enum(['user', 'assistant']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;

/**
 * 单条消息的结构
 */
export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string().min(1, '消息内容不能为空'),
  timestamp: z.number().optional(), // Unix timestamp
});
export type Message = z.infer<typeof MessageSchema>;

/**
 * 提示等级：1 (轻微) → 2 (中等) → 3 (详细)
 * 根据用户提问次数递增，但永远不给直接答案
 */
export const HintLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type HintLevel = z.infer<typeof HintLevelSchema>;

/**
 * 聊天请求 (前端 → 后端)
 */
export const ChatRequestSchema = z.object({
  uploadId: z.string().uuid('uploadId 必须是有效的 UUID').optional(),
  message: z.string().min(1, '消息不能为空').max(1000, '消息长度不能超过 1000 字符'),
  conversationHistory: z.array(MessageSchema).default([]),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

/**
 * 聊天响应 (后端 → 前端)
 */
export const ChatResponseSchema = z.object({
  reply: z.string(),
  hintLevel: HintLevelSchema,
  sources: z.array(z.string()).optional(), // 未来从上传的文件中提取引用
  timestamp: z.number(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;

/**
 * 文件上传响应 (复用，方便前后端统一)
 */
export const UploadResponseSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  url: z.string().url(),
});
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
