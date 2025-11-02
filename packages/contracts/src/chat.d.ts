import { z } from 'zod';
export declare const MessageRoleSchema: z.ZodEnum<["user", "assistant"]>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export declare const MessageSchema: z.ZodObject<{
    role: z.ZodEnum<["user", "assistant"]>;
    content: z.ZodString;
    timestamp: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    content: string;
    role: "user" | "assistant";
    timestamp?: number | undefined;
}, {
    content: string;
    role: "user" | "assistant";
    timestamp?: number | undefined;
}>;
export type Message = z.infer<typeof MessageSchema>;
export declare const HintLevelSchema: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
export type HintLevel = z.infer<typeof HintLevelSchema>;
export declare const ChatRequestSchema: z.ZodObject<{
    uploadId: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    conversationHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
        timestamp: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: "user" | "assistant";
        timestamp?: number | undefined;
    }, {
        content: string;
        role: "user" | "assistant";
        timestamp?: number | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    conversationHistory: {
        content: string;
        role: "user" | "assistant";
        timestamp?: number | undefined;
    }[];
    uploadId?: string | undefined;
}, {
    message: string;
    uploadId?: string | undefined;
    conversationHistory?: {
        content: string;
        role: "user" | "assistant";
        timestamp?: number | undefined;
    }[] | undefined;
}>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export declare const ChatResponseSchema: z.ZodObject<{
    reply: z.ZodString;
    hintLevel: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
    sources: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    timestamp: z.ZodNumber;
    conversationId: z.ZodOptional<z.ZodString>;
    tokensUsed: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    reply: string;
    hintLevel: 1 | 2 | 3;
    timestamp: number;
    sources?: string[] | undefined;
    conversationId?: string | undefined;
    tokensUsed?: number | undefined;
}, {
    reply: string;
    hintLevel: 1 | 2 | 3;
    timestamp: number;
    sources?: string[] | undefined;
    conversationId?: string | undefined;
    tokensUsed?: number | undefined;
}>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export declare const UploadResponseSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    filename: string;
    url: string;
}, {
    id: string;
    filename: string;
    url: string;
}>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
