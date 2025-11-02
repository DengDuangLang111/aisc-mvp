/**
 * Local Storage Management
 * 管理聊天历史和上传记录的本地持久化
 */

import { Message } from '../app/chat/components/MessageBubble'

// Storage Keys
const STORAGE_KEYS = {
  CHAT_HISTORY: 'study_oasis_chat_history',
  UPLOAD_HISTORY: 'study_oasis_upload_history',
  CHAT_SESSIONS: 'study_oasis_chat_sessions',
} as const

// Types
export interface UploadRecord {
  id: string
  filename: string
  url: string
  uploadedAt: number
  fileSize?: number
  fileType?: string
}

export interface ChatSession {
  id: string
  fileId?: string
  filename?: string
  messages: Message[]
  createdAt: number
  updatedAt: number
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
    console.error('Failed to parse JSON from localStorage:', e)
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
  static saveUpload(record: UploadRecord): void {
    if (!isLocalStorageAvailable()) return

    try {
      const history = this.getUploadHistory()
      
      // 避免重复，如果已存在相同 ID 则更新
      const existingIndex = history.findIndex(r => r.id === record.id)
      if (existingIndex >= 0) {
        history[existingIndex] = record
      } else {
        // 新记录添加到开头
        history.unshift(record)
      }

      // 限制历史记录数量（最多保存 50 条）
      const limitedHistory = history.slice(0, 50)
      
      localStorage.setItem(
        STORAGE_KEYS.UPLOAD_HISTORY,
        JSON.stringify(limitedHistory)
      )
    } catch (e) {
      console.error('Failed to save upload record:', e)
    }
  }

  /**
   * 获取上传历史
   */
  static getUploadHistory(): UploadRecord[] {
    if (!isLocalStorageAvailable()) return []

    const data = localStorage.getItem(STORAGE_KEYS.UPLOAD_HISTORY)
    return safeParse(data, [])
  }

  /**
   * 根据 ID 获取上传记录
   */
  static getUploadById(id: string): UploadRecord | null {
    const history = this.getUploadHistory()
    return history.find(r => r.id === id) || null
  }

  /**
   * 删除上传记录
   */
  static deleteUpload(id: string): void {
    if (!isLocalStorageAvailable()) return

    try {
      const history = this.getUploadHistory()
      const filtered = history.filter(r => r.id !== id)
      localStorage.setItem(
        STORAGE_KEYS.UPLOAD_HISTORY,
        JSON.stringify(filtered)
      )
    } catch (e) {
      console.error('Failed to delete upload record:', e)
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
      console.error('Failed to clear upload history:', e)
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
  static saveSession(session: Omit<ChatSession, 'id' | 'createdAt' | 'updatedAt'>): string {
    if (!isLocalStorageAvailable()) return ''

    try {
      const sessions = this.getAllSessions()
      
      // 查找是否存在相同 fileId 的会话
      let existingSession = sessions.find(
        s => s.fileId === session.fileId && s.messages.length > 0
      )

      let sessionId: string

      if (existingSession) {
        // 更新现有会话
        existingSession.messages = session.messages
        existingSession.updatedAt = Date.now()
        sessionId = existingSession.id
      } else {
        // 创建新会话
        sessionId = this.generateSessionId(session.fileId)
        const newSession: ChatSession = {
          ...session,
          id: sessionId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        sessions.unshift(newSession)
      }

      // 限制会话数量（最多保存 20 个会话）
      const limitedSessions = sessions.slice(0, 20)
      
      localStorage.setItem(
        STORAGE_KEYS.CHAT_SESSIONS,
        JSON.stringify(limitedSessions)
      )

      return sessionId
    } catch (e) {
      console.error('Failed to save chat session:', e)
      return ''
    }
  }

  /**
   * 获取所有聊天会话
   */
  static getAllSessions(): ChatSession[] {
    if (!isLocalStorageAvailable()) return []

    const data = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS)
    return safeParse(data, [])
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
      console.error('Failed to delete chat session:', e)
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
      console.error('Failed to clear chat sessions:', e)
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
   * 获取所有存储数据的大小（估算）
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
      return total
    } catch (e) {
      console.error('Failed to calculate storage size:', e)
      return 0
    }
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
      console.error('Failed to clear app data:', e)
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
        exportedAt: Date.now(),
      }
      return JSON.stringify(data, null, 2)
    } catch (e) {
      console.error('Failed to export data:', e)
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

      return true
    } catch (e) {
      console.error('Failed to import data:', e)
      return false
    }
  }
}
