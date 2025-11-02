/**
 * 事件名称枚举
 */
export enum EventName {
  // 用户事件
  USER_SIGNUP = 'user_signup',
  USER_LOGIN = 'user_login',
  USER_LOGOUT = 'user_logout',
  
  // 文档事件
  FILE_UPLOAD_START = 'file_upload_start',
  FILE_UPLOAD_SUCCESS = 'file_upload_success',
  FILE_UPLOAD_FAILED = 'file_upload_failed',
  FILE_DELETE = 'file_delete',
  FILE_DOWNLOAD = 'file_download',
  
  // OCR 事件
  OCR_START = 'ocr_start',
  OCR_SUCCESS = 'ocr_success',
  OCR_FAILED = 'ocr_failed',
  
  // 聊天事件
  CHAT_SESSION_START = 'chat_session_start',
  CHAT_MESSAGE_SENT = 'chat_message_sent',
  CHAT_MESSAGE_RECEIVED = 'chat_message_received',
  CHAT_MESSAGE_FAILED = 'chat_message_failed',
  CHAT_HINT_REQUESTED = 'chat_hint_requested',
  
  // AI API 事件
  DEEPSEEK_API_CALL_START = 'deepseek_api_call_start',
  DEEPSEEK_API_CALL_SUCCESS = 'deepseek_api_call_success',
  DEEPSEEK_API_CALL_FAILED = 'deepseek_api_call_failed',
  
  // API 事件
  API_REQUEST = 'api_request',
  API_ERROR = 'api_error',
  API_RATE_LIMIT = 'api_rate_limit',
  
  // 页面浏览
  PAGE_VIEW = 'page_view',
  PAGE_LEAVE = 'page_leave',
}

/**
 * 事件分类枚举
 */
export enum EventCategory {
  USER = 'user',
  DOCUMENT = 'document',
  CHAT = 'chat',
  SYSTEM = 'system',
}

/**
 * 设备类型枚举
 */
export enum DeviceType {
  MOBILE = 'mobile',
  TABLET = 'tablet',
  DESKTOP = 'desktop',
  UNKNOWN = 'unknown',
}
