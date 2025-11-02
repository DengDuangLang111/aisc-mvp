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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
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
    public details?: any
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
  static async *chatStream(request: ChatRequest): AsyncIterable<{ token: string; complete: boolean }> {
    const params = new URLSearchParams({
      message: request.message,
      conversationId: request.conversationId || '',
      uploadId: request.uploadId || '',
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
              };
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
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
  static async getOcrResult(uploadId: string): Promise<any> {
    try {
      const response = await fetch(`${API_URL}/upload/documents/${uploadId}/ocr`, {
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
