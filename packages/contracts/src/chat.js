"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadResponseSchema = exports.ChatResponseSchema = exports.ChatRequestSchema = exports.MessageSchema = exports.HintLevelSchema = exports.MessageRoleSchema = void 0;
const zod_1 = require("zod");
exports.MessageRoleSchema = zod_1.z.enum(['user', 'assistant']);
exports.HintLevelSchema = zod_1.z.union([
    zod_1.z.literal(1),
    zod_1.z.literal(2),
    zod_1.z.literal(3),
]);
exports.MessageSchema = zod_1.z.object({
    role: exports.MessageRoleSchema,
    content: zod_1.z.string().min(1, '消息内容不能为空'),
    timestamp: zod_1.z.number().optional(),
    conversationId: zod_1.z.string().optional(),
    hintLevel: exports.HintLevelSchema.optional(),
});
exports.ChatRequestSchema = zod_1.z.object({
    uploadId: zod_1.z.string().optional(),
    documentId: zod_1.z.string().optional(),
    conversationId: zod_1.z.string().optional(),
    message: zod_1.z.string().min(1, '消息不能为空').max(1000, '消息长度不能超过 1000 字符'),
    conversationHistory: zod_1.z.array(exports.MessageSchema).default([]),
});
exports.ChatResponseSchema = zod_1.z.object({
    reply: zod_1.z.string(),
    hintLevel: exports.HintLevelSchema,
    sources: zod_1.z.array(zod_1.z.string()).optional(),
    timestamp: zod_1.z.number(),
    conversationId: zod_1.z.string().optional(),
    tokensUsed: zod_1.z.number().optional(),
});
exports.UploadResponseSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    filename: zod_1.z.string(),
    url: zod_1.z.string().url(),
});
//# sourceMappingURL=chat.js.map