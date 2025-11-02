/**
 * @jest-environment jsdom
 */

import {
  UploadStorage,
  ChatStorage,
  StorageUtils,
  UploadRecord,
  ChatSession,
} from '../storage'
import { Message } from '../../app/chat/components/MessageBubble'

// Mock localStorage
class LocalStorageMock {
  private store: Record<string, string> = {}

  getItem(key: string): string | null {
    return this.store[key] || null
  }

  setItem(key: string, value: string): void {
    this.store[key] = value.toString()
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  clear(): void {
    this.store = {}
  }

  get length(): number {
    return Object.keys(this.store).length
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] || null
  }

  hasOwnProperty(key: string): boolean {
    return this.store.hasOwnProperty(key)
  }

  // Make keys enumerable
  *[Symbol.iterator]() {
    for (const key of Object.keys(this.store)) {
      yield key
    }
  }
}

const localStorageMock = new LocalStorageMock()

// Copy store keys to localStorage object to make them enumerable
Object.defineProperty(localStorageMock, Symbol.iterator, {
  enumerable: false,
  writable: false,
})

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

describe('UploadStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveUpload', () => {
    it('should save upload record', () => {
      const record: UploadRecord = {
        id: 'test-id-1',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
        fileSize: 1024,
        fileType: 'text/plain',
      }

      UploadStorage.saveUpload(record)
      const history = UploadStorage.getUploadHistory()

      expect(history).toHaveLength(1)
      expect(history[0]).toEqual(record)
    })

    it('should update existing record with same ID', () => {
      const record1: UploadRecord = {
        id: 'test-id-1',
        filename: 'test1.txt',
        url: 'http://example.com/test1.txt',
        uploadedAt: Date.now(),
      }

      const record2: UploadRecord = {
        id: 'test-id-1',
        filename: 'test2.txt',
        url: 'http://example.com/test2.txt',
        uploadedAt: Date.now(),
      }

      UploadStorage.saveUpload(record1)
      UploadStorage.saveUpload(record2)

      const history = UploadStorage.getUploadHistory()
      expect(history).toHaveLength(1)
      expect(history[0].filename).toBe('test2.txt')
    })

    it('should limit history to 50 records', () => {
      for (let i = 0; i < 60; i++) {
        UploadStorage.saveUpload({
          id: `test-id-${i}`,
          filename: `test-${i}.txt`,
          url: `http://example.com/test-${i}.txt`,
          uploadedAt: Date.now(),
        })
      }

      const history = UploadStorage.getUploadHistory()
      expect(history).toHaveLength(50)
    })
  })

  describe('getUploadById', () => {
    it('should return upload record by ID', () => {
      const record: UploadRecord = {
        id: 'test-id-1',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      }

      UploadStorage.saveUpload(record)
      const found = UploadStorage.getUploadById('test-id-1')

      expect(found).toEqual(record)
    })

    it('should return null if not found', () => {
      const found = UploadStorage.getUploadById('non-existent')
      expect(found).toBeNull()
    })
  })

  describe('deleteUpload', () => {
    it('should delete upload record', () => {
      const record: UploadRecord = {
        id: 'test-id-1',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      }

      UploadStorage.saveUpload(record)
      UploadStorage.deleteUpload('test-id-1')

      const history = UploadStorage.getUploadHistory()
      expect(history).toHaveLength(0)
    })
  })

  describe('clearUploadHistory', () => {
    it('should clear all upload history', () => {
      UploadStorage.saveUpload({
        id: 'test-id-1',
        filename: 'test1.txt',
        url: 'http://example.com/test1.txt',
        uploadedAt: Date.now(),
      })

      UploadStorage.saveUpload({
        id: 'test-id-2',
        filename: 'test2.txt',
        url: 'http://example.com/test2.txt',
        uploadedAt: Date.now(),
      })

      UploadStorage.clearUploadHistory()
      const history = UploadStorage.getUploadHistory()

      expect(history).toHaveLength(0)
    })
  })
})

describe('ChatStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('saveSession', () => {
    it('should save chat session', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: Date.now(),
        },
      ]

      const sessionId = ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test.txt',
        messages,
      })

      expect(sessionId).toBeTruthy()
      const sessions = ChatStorage.getAllSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].messages).toEqual(messages)
    })

    it('should update existing session with same fileId', () => {
      const messages1: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ]

      const messages2: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
        {
          role: 'assistant',
          content: 'Hi there!',
          timestamp: Date.now(),
        },
      ]

      ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test.txt',
        messages: messages1,
      })

      ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test.txt',
        messages: messages2,
      })

      const sessions = ChatStorage.getAllSessions()
      expect(sessions).toHaveLength(1)
      expect(sessions[0].messages).toHaveLength(2)
    })

    it('should limit sessions to 20', () => {
      for (let i = 0; i < 25; i++) {
        ChatStorage.saveSession({
          fileId: `file-${i}`,
          filename: `test-${i}.txt`,
          messages: [
            {
              role: 'user',
              content: `Message ${i}`,
              timestamp: Date.now(),
            },
          ],
        })
      }

      const sessions = ChatStorage.getAllSessions()
      expect(sessions).toHaveLength(20)
    })
  })

  describe('getSessionById', () => {
    it('should return session by ID', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        },
      ]

      const sessionId = ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test.txt',
        messages,
      })

      const found = ChatStorage.getSessionById(sessionId)
      expect(found).not.toBeNull()
      expect(found?.messages).toEqual(messages)
    })

    it('should return null if not found', () => {
      const found = ChatStorage.getSessionById('non-existent')
      expect(found).toBeNull()
    })
  })

  describe('getSessionByFileId', () => {
    it('should return most recent session for fileId', () => {
      const messages1: Message[] = [
        {
          role: 'user',
          content: 'Message 1',
          timestamp: Date.now(),
        },
      ]

      const messages2: Message[] = [
        {
          role: 'user',
          content: 'Message 2',
          timestamp: Date.now(),
        },
      ]

      ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test.txt',
        messages: messages1,
      })

      // Wait a bit to ensure different timestamps
      setTimeout(() => {
        ChatStorage.saveSession({
          fileId: 'file-1',
          filename: 'test.txt',
          messages: messages2,
        })

        const found = ChatStorage.getSessionByFileId('file-1')
        expect(found).not.toBeNull()
        expect(found?.messages).toEqual(messages2)
      }, 10)
    })

    it('should return null if no session for fileId', () => {
      const found = ChatStorage.getSessionByFileId('non-existent')
      expect(found).toBeNull()
    })
  })

  describe('deleteSession', () => {
    it('should delete session', () => {
      const sessionId = ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test.txt',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          },
        ],
      })

      ChatStorage.deleteSession(sessionId)
      const sessions = ChatStorage.getAllSessions()
      expect(sessions).toHaveLength(0)
    })
  })

  describe('clearAllSessions', () => {
    it('should clear all sessions', () => {
      ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test1.txt',
        messages: [
          {
            role: 'user',
            content: 'Hello 1',
            timestamp: Date.now(),
          },
        ],
      })

      ChatStorage.saveSession({
        fileId: 'file-2',
        filename: 'test2.txt',
        messages: [
          {
            role: 'user',
            content: 'Hello 2',
            timestamp: Date.now(),
          },
        ],
      })

      ChatStorage.clearAllSessions()
      const sessions = ChatStorage.getAllSessions()
      expect(sessions).toHaveLength(0)
    })
  })

  describe('getSessionStats', () => {
    it('should return correct stats', () => {
      ChatStorage.saveSession({
        fileId: 'file-1',
        filename: 'test1.txt',
        messages: [
          {
            role: 'user',
            content: 'Hello 1',
            timestamp: Date.now(),
          },
          {
            role: 'assistant',
            content: 'Hi 1',
            timestamp: Date.now(),
          },
        ],
      })

      ChatStorage.saveSession({
        fileId: 'file-2',
        filename: 'test2.txt',
        messages: [
          {
            role: 'user',
            content: 'Hello 2',
            timestamp: Date.now(),
          },
        ],
      })

      const stats = ChatStorage.getSessionStats()
      expect(stats.totalSessions).toBe(2)
      expect(stats.totalMessages).toBe(3)
      expect(stats.oldestSession).toBeTruthy()
      expect(stats.newestSession).toBeTruthy()
    })
  })
})

describe('StorageUtils', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('getStorageSize', () => {
    it('should return 0 or positive number', () => {
      // In test environment, we just verify it returns a number
      const size = StorageUtils.getStorageSize()
      expect(typeof size).toBe('number')
      expect(size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('clearAllAppData', () => {
    it('should clear all app data', () => {
      UploadStorage.saveUpload({
        id: 'test-id',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      })

      ChatStorage.saveSession({
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: Date.now(),
          },
        ],
      })

      StorageUtils.clearAllAppData()

      expect(UploadStorage.getUploadHistory()).toHaveLength(0)
      expect(ChatStorage.getAllSessions()).toHaveLength(0)
    })
  })

  describe('exportData', () => {
    it('should export data as JSON', () => {
      UploadStorage.saveUpload({
        id: 'test-id',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      })

      const exportedData = StorageUtils.exportData()
      expect(exportedData).toBeTruthy()
      
      const parsed = JSON.parse(exportedData)
      expect(parsed).toHaveProperty('uploadHistory')
      expect(parsed).toHaveProperty('chatSessions')
      expect(parsed).toHaveProperty('exportedAt')
    })
  })

  describe('importData', () => {
    it('should import data from JSON', () => {
      const data = {
        uploadHistory: [
          {
            id: 'test-id',
            filename: 'test.txt',
            url: 'http://example.com/test.txt',
            uploadedAt: Date.now(),
          },
        ],
        chatSessions: [],
        exportedAt: Date.now(),
      }

      const success = StorageUtils.importData(JSON.stringify(data))
      expect(success).toBe(true)

      const history = UploadStorage.getUploadHistory()
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('test-id')
    })

    it('should return false for invalid JSON', () => {
      const success = StorageUtils.importData('invalid json')
      expect(success).toBe(false)
    })
  })
})
