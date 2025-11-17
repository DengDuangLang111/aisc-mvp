import { logger } from './logger';

/**
 * 统一的 API 客户端
 * 封装所有与后端的交互
 */

import type { 
  Message, 
  ChatRequest, 
  ChatResponse, 
  HintLevel 
} from '@study-oasis/contracts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const MOCK_API = process.env.NEXT_PUBLIC_API_MOCK === '1';

export interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  // 后端返回的数据库文档 ID（用于查询 OCR 结果等）。在旧实现中只有 upload id（id）可用，
  // 新实现会同时返回 documentId，用于访问 /upload/documents/:documentId 接口。
  documentId?: string;
}

/**
 * OCR 结果接口
 */
export interface OcrResult {
  fullText: string;
  confidence: number;
  language: string;
  pageCount: number;
  structuredData?: Record<string, unknown>;
}

// Re-export types for convenience
export type { Message, ChatRequest, ChatResponse, HintLevel };

/**
 * 自定义 API 错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API 客户端类
 */
export class ApiClient {
  /**
   * 发送聊天消息
   */
  static async chat(request: ChatRequest): Promise<ChatResponse> {
    if (MOCK_API || !API_URL) {
      // Simple mock response for local development
      return Promise.resolve({
        reply: `This is a mocked assistant reply to: "${request.message}"`,
        conversationId: request.conversationId || `mock-${Date.now()}`,
        timestamp: Date.now(),
        hintLevel: 1,
      } as ChatResponse);
    }

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || `请求失败: ${response.statusText}`,
          response.status,
          error
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : '网络请求失败',
        0
      );
    }
  }

  /**
   * 发送聊天消息（流式响应）
   * 返回 AsyncIterable，可用于逐个处理响应 chunks
   */
  static async *chatStream(request: ChatRequest): AsyncIterable<{ 
    token: string; 
    complete: boolean;
    conversationId?: string;
  }> {
    if (MOCK_API || !API_URL) {
      // Yield a few mocked tokens to simulate streaming
      const text = `This is a mocked streaming reply to: ${request.message}`;
      const tokens = text.split(' ');
      let accumulated = '';
      for (let i = 0; i < tokens.length; i++) {
        accumulated += (i === 0 ? '' : ' ') + tokens[i];
        yield { token: accumulated, complete: i === tokens.length - 1, conversationId: request.conversationId || `mock-${Date.now()}` };
        // slight delay to mimic streaming (consumer controls pacing)
        await new Promise((r) => setTimeout(r, 30));
      }
      return;
    }

    const params = new URLSearchParams({
      message: request.message,
      conversationId: request.conversationId || '',
      uploadId: request.documentId || request.uploadId || '', // 支持 documentId（推荐）和 uploadId（兼容）
    });

    try {
      const response = await fetch(`${API_URL}/chat/stream?${params}`, {
        method: 'GET',
        headers: {
          'Accept': 'text/event-stream',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || `请求失败: ${response.statusText}`,
          response.status,
          error
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              yield {
                token: data.token || '',
                complete: data.complete || false,
                conversationId: data.conversationId,
              };
            } catch (e) {
              logger.error('Failed to parse SSE data', e, {});
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : '流式请求失败',
        0
      );
    }
  }

  /**
   * 上传文件
   */
  static async uploadFile(file: File): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || `上传失败: ${response.statusText}`,
          response.status,
          error
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : '文件上传失败',
        0
      );
    }
  }

  /**
   * 获取 OCR 结果
   */
  static async getOcrResult(documentId: string): Promise<OcrResult | null> {
    try {
      // documentId is the DB document id returned in UploadResponse.documentId
      const response = await fetch(`${API_URL}/upload/documents/${documentId}/ocr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new ApiError(
          error.message || `获取 OCR 结果失败: ${response.statusText}`,
          response.status,
          error
        );
      }

      return response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        error instanceof Error ? error.message : '获取 OCR 结果失败',
        0
      );
    }
  }

  /**
   * 构建文件 URL
   */
  static buildFileUrl(fileId: string, extension: string): string {
    return `${API_URL}/uploads/${fileId}.${extension}`;
  }

  /**
   * 获取 API 基础 URL
   */
  static getBaseUrl(): string {
    return API_URL;
  }
}
