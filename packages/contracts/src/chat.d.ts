import { z } from 'zod';
export declare const MessageRoleSchema: z.ZodEnum<["user", "assistant"]>;
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export declare const HintLevelSchema: z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>;
export type HintLevel = z.infer<typeof HintLevelSchema>;
export declare const MessageSchema: z.ZodObject<{
    role: z.ZodEnum<["user", "assistant"]>;
    content: z.ZodString;
    timestamp: z.ZodOptional<z.ZodNumber>;
    conversationId: z.ZodOptional<z.ZodString>;
    hintLevel: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>;
}, "strip", z.ZodTypeAny, {
    content: string;
    role: "user" | "assistant";
    hintLevel?: 1 | 2 | 3 | undefined;
    timestamp?: number | undefined;
    conversationId?: string | undefined;
}, {
    content: string;
    role: "user" | "assistant";
    hintLevel?: 1 | 2 | 3 | undefined;
    timestamp?: number | undefined;
    conversationId?: string | undefined;
}>;
export type Message = z.infer<typeof MessageSchema>;
export declare const ChatRequestSchema: z.ZodObject<{
    uploadId: z.ZodOptional<z.ZodString>;
    documentId: z.ZodOptional<z.ZodString>;
    conversationId: z.ZodOptional<z.ZodString>;
    message: z.ZodString;
    conversationHistory: z.ZodDefault<z.ZodArray<z.ZodObject<{
        role: z.ZodEnum<["user", "assistant"]>;
        content: z.ZodString;
        timestamp: z.ZodOptional<z.ZodNumber>;
        conversationId: z.ZodOptional<z.ZodString>;
        hintLevel: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>]>>;
    }, "strip", z.ZodTypeAny, {
        content: string;
        role: "user" | "assistant";
        hintLevel?: 1 | 2 | 3 | undefined;
        timestamp?: number | undefined;
        conversationId?: string | undefined;
    }, {
        content: string;
        role: "user" | "assistant";
        hintLevel?: 1 | 2 | 3 | undefined;
        timestamp?: number | undefined;
        conversationId?: string | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    message: string;
    conversationHistory: {
        content: string;
        role: "user" | "assistant";
        hintLevel?: 1 | 2 | 3 | undefined;
        timestamp?: number | undefined;
        conversationId?: string | undefined;
    }[];
    documentId?: string | undefined;
    conversationId?: string | undefined;
    uploadId?: string | undefined;
}, {
    message: string;
    documentId?: string | undefined;
    conversationId?: string | undefined;
    uploadId?: string | undefined;
    conversationHistory?: {
        content: string;
        role: "user" | "assistant";
        hintLevel?: 1 | 2 | 3 | undefined;
        timestamp?: number | undefined;
        conversationId?: string | undefined;
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
    hintLevel: 1 | 2 | 3;
    timestamp: number;
    reply: string;
    tokensUsed?: number | undefined;
    conversationId?: string | undefined;
    sources?: string[] | undefined;
}, {
    hintLevel: 1 | 2 | 3;
    timestamp: number;
    reply: string;
    tokensUsed?: number | undefined;
    conversationId?: string | undefined;
    sources?: string[] | undefined;
}>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export declare const UploadResponseSchema: z.ZodObject<{
    id: z.ZodString;
    filename: z.ZodString;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    filename: string;
    url: string;
    id: string;
}, {
    filename: string;
    url: string;
    id: string;
}>;
export type UploadResponse = z.infer<typeof UploadResponseSchema>;
