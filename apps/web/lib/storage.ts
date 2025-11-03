import { logger } from './logger';

/**
 * Local Storage Management
 * 管理聊天历史和上传记录的本地持久化
 * 
 * 新增功能：
 * - 数据过期机制
 * - 容量管理
 * - 可配置限制
 */

import { Message } from '../app/chat/components/MessageBubble'

// Storage Keys
const STORAGE_KEYS = {
  CHAT_HISTORY: 'study_oasis_chat_history',
  UPLOAD_HISTORY: 'study_oasis_upload_history',
  CHAT_SESSIONS: 'study_oasis_chat_sessions',
  CONFIG: 'study_oasis_config',
} as const

// Storage Configuration (可通过环境变量或配置覆盖)
export interface StorageConfig {
  maxUploadRecords: number
  maxChatSessions: number
  defaultExpiry: number // 毫秒，默认 7 天
  maxStorageSize: number // bytes，默认 5MB (localStorage 通常限制)
  enableAutoCleanup: boolean
}

// Default configuration
const DEFAULT_CONFIG: StorageConfig = {
  maxUploadRecords: 50,
  maxChatSessions: 20,
  defaultExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxStorageSize: 5 * 1024 * 1024, // 5MB
  enableAutoCleanup: true,
}

// Storage item with expiration
interface StorageItem<T> {
  data: T
  timestamp: number
  expiresAt?: number
}

// Types
export interface UploadRecord {
  id: string
  documentId?: string
  filename: string
  url: string
  uploadedAt: number
  fileSize?: number
  fileType?: string
  expiresAt?: number // 可选的过期时间
}

export interface ChatSession {
  id: string
  fileId?: string
  filename?: string
  conversationId?: string // Backend conversation ID for context persistence
  messages: Message[]
  createdAt: number
  updatedAt: number
  expiresAt?: number // 可选的过期时间
}

/**
 * Configuration Management
 */
export class ConfigStorage {
  /**
   * 获取存储配置
   */
  static getConfig(): StorageConfig {
    if (!isLocalStorageAvailable()) return DEFAULT_CONFIG

    try {
      const configStr = localStorage.getItem(STORAGE_KEYS.CONFIG)
      if (!configStr) return DEFAULT_CONFIG

      const savedConfig = JSON.parse(configStr) as Partial<StorageConfig>
      return { ...DEFAULT_CONFIG, ...savedConfig }
    } catch (e) {
      logger.error('Failed to load config:', e)
      return DEFAULT_CONFIG
    }
  }

  /**
   * 更新存储配置
   */
  static updateConfig(config: Partial<StorageConfig>): void {
    if (!isLocalStorageAvailable()) return

    try {
      const currentConfig = this.getConfig()
      const newConfig = { ...currentConfig, ...config }
      localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(newConfig))
    } catch (e) {
      logger.error('Failed to update config:', e)
    }
  }

  /**
   * 重置配置为默认值
   */
  static resetConfig(): void {
    if (!isLocalStorageAvailable()) return

    try {
      localStorage.removeItem(STORAGE_KEYS.CONFIG)
    } catch (e) {
      logger.error('Failed to reset config:', e)
    }
  }
}

// Helper: Check if localStorage is available
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch (e) {
    return false
  }
}

// Helper: Safe JSON parse
function safeParse<T>(value: string | null, defaultValue: T): T {
  if (!value) return defaultValue
  try {
    return JSON.parse(value) as T
  } catch (e) {
    logger.error('Failed to parse JSON from localStorage:', e)
    return defaultValue
  }
}

// Helper: Check if item is expired
function isExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false
  return Date.now() > expiresAt
}

// Helper: Clean expired items from array
function cleanExpired<T extends { expiresAt?: number }>(items: T[]): T[] {
  return items.filter(item => !isExpired(item.expiresAt))
}

// Helper: Set item with expiration wrapper
function setItemWithExpiry<T>(key: string, data: T, expiryMs?: number): void {
  if (!isLocalStorageAvailable()) return

  try {
    const item: StorageItem<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: expiryMs ? Date.now() + expiryMs : undefined,
    }
    localStorage.setItem(key, JSON.stringify(item))
  } catch (e) {
    logger.error(`Failed to set item ${key}:`, e)
  }
}

// Helper: Get item with expiration check
function getItemWithExpiry<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue

  try {
    const itemStr = localStorage.getItem(key)
    if (!itemStr) return defaultValue

    const item = JSON.parse(itemStr) as StorageItem<T>
    
    // Check if expired
    if (item.expiresAt && isExpired(item.expiresAt)) {
      localStorage.removeItem(key)
      return defaultValue
    }

    return item.data
  } catch (e) {
    logger.error(`Failed to get item ${key}:`, e)
    return defaultValue
  }
}

/**
 * Upload History Management
 */
export class UploadStorage {
  /**
   * 保存上传记录
   */
  static saveUpload(record: UploadRecord, expiryMs?: number): void {
    if (!isLocalStorageAvailable()) return

    try {
      const config = ConfigStorage.getConfig()
      let history = this.getUploadHistory()
      
      // 自动清理过期数据
      if (config.enableAutoCleanup) {
        history = cleanExpired(history)
      }
      
      // 设置默认过期时间（如果未指定）
      if (!record.expiresAt && !expiryMs) {
        record.expiresAt = Date.now() + config.defaultExpiry
      } else if (expiryMs) {
        record.expiresAt = Date.now() + expiryMs
      }
      
      if (!record.documentId) {
        record.documentId = record.id
      }

      const recordKey = record.documentId || record.id

      // 避免重复，如果已存在相同文档或上传 ID 则更新
      const existingIndex = history.findIndex(r => {
        const existingKey = r.documentId || r.id
        return existingKey === recordKey
      })
      if (existingIndex >= 0) {
        history[existingIndex] = record
      } else {
        // 新记录添加到开头
        history.unshift(record)
      }

      // 使用配置的限制
      const limitedHistory = history.slice(0, config.maxUploadRecords)
      
      localStorage.setItem(
        STORAGE_KEYS.UPLOAD_HISTORY,
        JSON.stringify(limitedHistory)
      )
    } catch (e) {
      logger.error('Failed to save upload record:', e)
    }
  }

  /**
   * 获取上传历史（自动过滤过期数据）
   */
  static getUploadHistory(): UploadRecord[] {
    if (!isLocalStorageAvailable()) return []

    const data = localStorage.getItem(STORAGE_KEYS.UPLOAD_HISTORY)
    const history = safeParse(data, [])
    
    // 过滤过期数据
    const config = ConfigStorage.getConfig()
    if (config.enableAutoCleanup) {
      return cleanExpired(history)
    }
    
    return history
  }

  /**
   * 根据 ID 获取上传记录
   */
  static getUploadById(id: string): UploadRecord | null {
    const history = this.getUploadHistory()
    return history.find(r => r.id === id || r.documentId === id) || null
  }

  /**
   * 删除上传记录
   */
  static deleteUpload(id: string): void {
    if (!isLocalStorageAvailable()) return

    try {
      const history = this.getUploadHistory()
      const filtered = history.filter(r => r.id !== id && r.documentId !== id)
      localStorage.setItem(
        STORAGE_KEYS.UPLOAD_HISTORY,
        JSON.stringify(filtered)
      )
    } catch (e) {
      logger.error('Failed to delete upload record:', e)
    }
  }

  /**
   * 清空所有上传历史
   */
  static clearUploadHistory(): void {
    if (!isLocalStorageAvailable()) return

    try {
      localStorage.removeItem(STORAGE_KEYS.UPLOAD_HISTORY)
    } catch (e) {
      logger.error('Failed to clear upload history:', e)
    }
  }

  /**
   * 手动清理过期的上传记录
   */
  static cleanExpiredUploads(): number {
    if (!isLocalStorageAvailable()) return 0

    try {
      const history = this.getUploadHistory()
      const beforeCount = history.length
      const cleaned = cleanExpired(history)
      const afterCount = cleaned.length

      if (beforeCount !== afterCount) {
        localStorage.setItem(
          STORAGE_KEYS.UPLOAD_HISTORY,
          JSON.stringify(cleaned)
        )
      }

      return beforeCount - afterCount
    } catch (e) {
      logger.error('Failed to clean expired uploads:', e)
      return 0
    }
  }
}

/**
 * Chat Session Management
 */
export class ChatStorage {
  /**
   * 生成会话 ID
   */
  private static generateSessionId(fileId?: string): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 9)
    return fileId ? `${fileId}_${timestamp}_${random}` : `general_${timestamp}_${random}`
  }

  /**
   * 保存聊天会话
   */
  static saveSession(
    session: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>,
    expiryMs?: number,
    conversationId?: string
  ): string {
    if (!isLocalStorageAvailable()) return ''

    try {
      const config = ConfigStorage.getConfig()
      let sessions = this.getAllSessions()
      
      // 自动清理过期数据
      if (config.enableAutoCleanup) {
        sessions = cleanExpired(sessions)
      }
      
      // 查找是否存在相同 fileId 的会话
      let existingSession = sessions.find(
        s => s.fileId === session.fileId && s.messages.length > 0
      )

      let sessionId: string

      if (existingSession) {
        // 更新现有会话
        existingSession.messages = session.messages
        existingSession.updatedAt = Date.now()
        
        // 更新 conversationId（如果提供）
        if (conversationId) {
          existingSession.conversationId = conversationId
        }
        
        // 更新过期时间（如果指定）
        if (expiryMs) {
          existingSession.expiresAt = Date.now() + expiryMs
        } else if (!existingSession.expiresAt) {
          existingSession.expiresAt = Date.now() + config.defaultExpiry
        }
        
        sessionId = existingSession.id
      } else {
        // 创建新会话
        sessionId = this.generateSessionId(session.fileId)
        const newSession: ChatSession = {
          ...session,
          id: sessionId,
          conversationId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expiresAt: expiryMs ? Date.now() + expiryMs : Date.now() + config.defaultExpiry,
        }
        sessions.unshift(newSession)
      }

      // 使用配置的限制
      const limitedSessions = sessions.slice(0, config.maxChatSessions)
      
      localStorage.setItem(
        STORAGE_KEYS.CHAT_SESSIONS,
        JSON.stringify(limitedSessions)
      )

      return sessionId
    } catch (e) {
      logger.error('Failed to save chat session:', e)
      return ''
    }
  }

  /**
   * 获取所有聊天会话（自动过滤过期数据）
   */
  static getAllSessions(): ChatSession[] {
    if (!isLocalStorageAvailable()) return []

    const data = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS)
    const sessions = safeParse(data, [])
    
    // 过滤过期数据
    const config = ConfigStorage.getConfig()
    if (config.enableAutoCleanup) {
      return cleanExpired(sessions)
    }
    
    return sessions
  }

  /**
   * 根据 ID 获取会话
   */
  static getSessionById(id: string): ChatSession | null {
    const sessions = this.getAllSessions()
    return sessions.find(s => s.id === id) || null
  }

  /**
   * 根据 fileId 获取最近的会话
   */
  static getSessionByFileId(fileId: string): ChatSession | null {
    const sessions = this.getAllSessions()
    // 返回最近更新的会话
    const fileSessions = sessions
      .filter(s => s.fileId === fileId)
      .sort((a, b) => b.updatedAt - a.updatedAt)
    
    return fileSessions[0] || null
  }

  /**
   * 删除会话
   */
  static deleteSession(id: string): void {
    if (!isLocalStorageAvailable()) return

    try {
      const sessions = this.getAllSessions()
      const filtered = sessions.filter(s => s.id !== id)
      localStorage.setItem(
        STORAGE_KEYS.CHAT_SESSIONS,
        JSON.stringify(filtered)
      )
    } catch (e) {
      logger.error('Failed to delete chat session:', e)
    }
  }

  /**
   * 清空所有会话
   */
  static clearAllSessions(): void {
    if (!isLocalStorageAvailable()) return

    try {
      localStorage.removeItem(STORAGE_KEYS.CHAT_SESSIONS)
    } catch (e) {
      logger.error('Failed to clear chat sessions:', e)
    }
  }

  /**
   * 手动清理过期的会话
   */
  static cleanExpiredSessions(): number {
    if (!isLocalStorageAvailable()) return 0

    try {
      const sessions = this.getAllSessions()
      const beforeCount = sessions.length
      const cleaned = cleanExpired(sessions)
      const afterCount = cleaned.length

      if (beforeCount !== afterCount) {
        localStorage.setItem(
          STORAGE_KEYS.CHAT_SESSIONS,
          JSON.stringify(cleaned)
        )
      }

      return beforeCount - afterCount
    } catch (e) {
      logger.error('Failed to clean expired sessions:', e)
      return 0
    }
  }

  /**
   * 获取会话统计信息
   */
  static getSessionStats() {
    const sessions = this.getAllSessions()
    return {
      totalSessions: sessions.length,
      totalMessages: sessions.reduce((sum, s) => sum + s.messages.length, 0),
      oldestSession: sessions.length > 0 ? Math.min(...sessions.map(s => s.createdAt)) : null,
      newestSession: sessions.length > 0 ? Math.max(...sessions.map(s => s.createdAt)) : null,
    }
  }
}

/**
 * General Storage Utilities
 */
export class StorageUtils {
  /**
   * 获取所有存储数据的大小（估算，单位：bytes）
   */
  static getStorageSize(): number {
    if (!isLocalStorageAvailable()) return 0

    try {
      let total = 0
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          total += localStorage.getItem(key)?.length || 0
        }
      }
      // 每个字符约占 2 bytes (UTF-16)
      return total * 2
    } catch (e) {
      logger.error('Failed to calculate storage size:', e)
      return 0
    }
  }

  /**
   * 检查存储容量
   */
  static checkCapacity(): { used: number; available: number; percentage: number; isNearLimit: boolean } {
    const config = ConfigStorage.getConfig()
    const used = this.getStorageSize()
    const max = config.maxStorageSize
    const available = Math.max(0, max - used)
    const percentage = (used / max) * 100
    const isNearLimit = percentage > 80 // 超过 80% 视为接近限制

    return {
      used,
      available,
      percentage: Math.round(percentage * 100) / 100,
      isNearLimit,
    }
  }

  /**
   * 清理所有过期数据
   */
  static cleanAllExpired(): { uploads: number; sessions: number } {
    const uploads = UploadStorage.cleanExpiredUploads()
    const sessions = ChatStorage.cleanExpiredSessions()

    return { uploads, sessions }
  }

  /**
   * 清空所有应用数据
   */
  static clearAllAppData(): void {
    if (!isLocalStorageAvailable()) return

    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key)
      })
    } catch (e) {
      logger.error('Failed to clear app data:', e)
    }
  }

  /**
   * 导出所有数据（用于备份）
   */
  static exportData(): string {
    if (!isLocalStorageAvailable()) return '{}'

    try {
      const data = {
        uploadHistory: UploadStorage.getUploadHistory(),
        chatSessions: ChatStorage.getAllSessions(),
        config: ConfigStorage.getConfig(),
        exportedAt: Date.now(),
        version: '1.1.0', // 版本号用于未来兼容性
      }
      return JSON.stringify(data, null, 2)
    } catch (e) {
      logger.error('Failed to export data:', e)
      return '{}'
    }
  }

  /**
   * 导入数据（从备份恢复）
   */
  static importData(jsonData: string): boolean {
    if (!isLocalStorageAvailable()) return false

    try {
      const data = JSON.parse(jsonData)
      
      // 验证数据格式
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid data format')
      }

      if (data.uploadHistory) {
        localStorage.setItem(
          STORAGE_KEYS.UPLOAD_HISTORY,
          JSON.stringify(data.uploadHistory)
        )
      }
      
      if (data.chatSessions) {
        localStorage.setItem(
          STORAGE_KEYS.CHAT_SESSIONS,
          JSON.stringify(data.chatSessions)
        )
      }

      if (data.config) {
        localStorage.setItem(
          STORAGE_KEYS.CONFIG,
          JSON.stringify(data.config)
        )
      }

      return true
    } catch (e) {
      logger.error('Failed to import data:', e)
      return false
    }
  }

  /**
   * 获取完整的存储统计信息
   */
  static getStorageStats() {
    const capacity = this.checkCapacity()
    const sessionStats = ChatStorage.getSessionStats()
    const uploadCount = UploadStorage.getUploadHistory().length
    const config = ConfigStorage.getConfig()

    return {
      capacity,
      sessions: sessionStats,
      uploads: {
        total: uploadCount,
        limit: config.maxUploadRecords,
      },
      config,
    }
  }
}
