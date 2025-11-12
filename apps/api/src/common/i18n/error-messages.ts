import { ErrorCode } from '../exceptions/business.exception';
import { SupportedLocale } from './i18n.config';

// Minimal, non-breaking mapping from ErrorCode to localized messages.
// Fallback behavior: if no match or i18n disabled, existing message is used.
export const ERROR_MESSAGES: Record<SupportedLocale, Partial<Record<ErrorCode, string>>> = {
  en: {
    [ErrorCode.DOCUMENT_NOT_FOUND]: 'Document not found',
    [ErrorCode.DOCUMENT_TOO_LARGE]: 'File size exceeds limit',
    [ErrorCode.INVALID_FILE_TYPE]: 'Invalid or unsupported file type',
    [ErrorCode.CONVERSATION_NOT_FOUND]: 'Conversation not found',
    [ErrorCode.UNAUTHORIZED_ACCESS]: 'You do not have permission to perform this action',
    [ErrorCode.SESSION_NOT_FOUND]: 'Focus session not found',
    [ErrorCode.SESSION_ALREADY_COMPLETED]: 'Focus session already completed',
    [ErrorCode.OCR_FAILED]: 'OCR processing failed',
    [ErrorCode.OCR_NOT_READY]: 'OCR result is not ready yet',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: 'External service error',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: 'Rate limit exceeded',
  },
  'zh-CN': {
    [ErrorCode.DOCUMENT_NOT_FOUND]: '未找到文档',
    [ErrorCode.DOCUMENT_TOO_LARGE]: '文件大小超过限制',
    [ErrorCode.INVALID_FILE_TYPE]: '文件类型不受支持或不安全',
    [ErrorCode.CONVERSATION_NOT_FOUND]: '会话不存在',
    [ErrorCode.UNAUTHORIZED_ACCESS]: '没有执行该操作的权限',
    [ErrorCode.SESSION_NOT_FOUND]: '未找到专注会话',
    [ErrorCode.SESSION_ALREADY_COMPLETED]: '专注会话已完成',
    [ErrorCode.OCR_FAILED]: 'OCR 识别失败',
    [ErrorCode.OCR_NOT_READY]: 'OCR 结果尚未准备好',
    [ErrorCode.EXTERNAL_SERVICE_ERROR]: '外部服务异常',
    [ErrorCode.RATE_LIMIT_EXCEEDED]: '请求频率超出限制',
  },
};

export function resolveErrorMessage(
  code: ErrorCode,
  fallback: string,
  locale: SupportedLocale,
): string {
  const localized = ERROR_MESSAGES[locale]?.[code];
  return localized || fallback;
}
