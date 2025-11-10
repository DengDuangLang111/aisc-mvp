import { HttpException, HttpStatus } from '@nestjs/common';

export enum ErrorCode {
  // 文档相关
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  DOCUMENT_TOO_LARGE = 'DOCUMENT_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_VALIDATION_FAILED = 'FILE_VALIDATION_FAILED',

  // 对话相关
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',

  // 专注模式相关
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_ALREADY_COMPLETED = 'SESSION_ALREADY_COMPLETED',

  // OCR 相关
  OCR_FAILED = 'OCR_FAILED',
  OCR_NOT_READY = 'OCR_NOT_READY',

  // 系统相关
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

export class BusinessException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: Record<string, unknown>,
  ) {
    super(
      {
        code,
        message,
        details,
        timestamp: new Date().toISOString(),
      },
      statusCode,
    );
  }
}
