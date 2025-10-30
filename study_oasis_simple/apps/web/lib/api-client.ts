/**
 * 统一的 API 客户端
 * 封装所有与后端的交互
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  hintLevel?: 1 | 2 | 3;
}

export interface ChatRequest {
  message: string;
  conversationHistory?: Omit<Message, 'timestamp' | 'hintLevel'>[];
  fileId?: string;
}

export interface ChatResponse {
  reply: string;
  hintLevel: 1 | 2 | 3;
  timestamp: number;
}

export interface UploadResponse {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

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
