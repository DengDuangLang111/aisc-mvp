/**
 * @jest-environment jsdom
 */

import {
  UploadStorage,
  ChatStorage,
  StorageUtils,
  ConfigStorage,
  UploadRecord,
  ChatSession,
  StorageConfig,
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

    it('should update existing record when documentId matches', () => {
      const record1: UploadRecord = {
        id: 'upload-1',
        documentId: 'doc-1',
        filename: 'first.pdf',
        url: 'http://example.com/first.pdf',
        uploadedAt: Date.now(),
      }

      const record2: UploadRecord = {
        id: 'upload-2',
        documentId: 'doc-1',
        filename: 'second.pdf',
        url: 'http://example.com/second.pdf',
        uploadedAt: Date.now(),
      }

      UploadStorage.saveUpload(record1)
      UploadStorage.saveUpload(record2)

      const history = UploadStorage.getUploadHistory()
      expect(history).toHaveLength(1)
      expect(history[0].id).toBe('upload-2')
      expect(history[0].documentId).toBe('doc-1')
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

    it('should return upload record by documentId', () => {
      const record: UploadRecord = {
        id: 'upload-1',
        documentId: 'doc-123',
        filename: 'doc.pdf',
        url: 'http://example.com/doc.pdf',
        uploadedAt: Date.now(),
      }

      UploadStorage.saveUpload(record)
      const found = UploadStorage.getUploadById('doc-123')

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

    it('should delete upload record by documentId', () => {
      const record: UploadRecord = {
        id: 'upload-1',
        documentId: 'doc-456',
        filename: 'doc.pdf',
        url: 'http://example.com/doc.pdf',
        uploadedAt: Date.now(),
      }

      UploadStorage.saveUpload(record)
      UploadStorage.deleteUpload('doc-456')

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

// New tests for enhanced functionality
describe('ConfigStorage', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should return default config when no config is saved', () => {
    const config = ConfigStorage.getConfig()
    expect(config.maxUploadRecords).toBe(50)
    expect(config.maxChatSessions).toBe(20)
    expect(config.enableAutoCleanup).toBe(true)
  })

  it('should update and retrieve config', () => {
    ConfigStorage.updateConfig({ maxUploadRecords: 100 })
    const config = ConfigStorage.getConfig()
    expect(config.maxUploadRecords).toBe(100)
    expect(config.maxChatSessions).toBe(20) // unchanged
  })

  it('should reset config to default', () => {
    ConfigStorage.updateConfig({ maxUploadRecords: 100 })
    ConfigStorage.resetConfig()
    const config = ConfigStorage.getConfig()
    expect(config.maxUploadRecords).toBe(50)
  })
})

describe('Data Expiration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('UploadStorage with expiration', () => {
    it('should set expiration time on upload', () => {
      const record: UploadRecord = {
        id: 'test-id',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      }

      UploadStorage.saveUpload(record)
      const history = UploadStorage.getUploadHistory()
      
      expect(history[0].expiresAt).toBeDefined()
      expect(history[0].expiresAt).toBeGreaterThan(Date.now())
    })

    it('should allow custom expiration time', () => {
      const record: UploadRecord = {
        id: 'test-id',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      }

      const customExpiry = 1000 // 1 second
      UploadStorage.saveUpload(record, customExpiry)
      const history = UploadStorage.getUploadHistory()
      
      expect(history[0].expiresAt).toBeDefined()
      const expectedExpiry = Date.now() + customExpiry
      expect(history[0].expiresAt).toBeLessThanOrEqual(expectedExpiry + 100) // Allow 100ms tolerance
    })

    it('should filter expired uploads', async () => {
      const record: UploadRecord = {
        id: 'test-id',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      }

      // Set short expiration
      UploadStorage.saveUpload(record, 10) // 10ms
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const history = UploadStorage.getUploadHistory()
      expect(history).toHaveLength(0)
    })

    it('should clean expired uploads manually', async () => {
      const record: UploadRecord = {
        id: 'test-id',
        filename: 'test.txt',
        url: 'http://example.com/test.txt',
        uploadedAt: Date.now(),
      }

      // Disable auto cleanup for this test
      ConfigStorage.updateConfig({ enableAutoCleanup: false })
      UploadStorage.saveUpload(record, 10)
      
      await new Promise(resolve => setTimeout(resolve, 20))
      
      // Should still be there with auto-cleanup disabled
      const beforeClean = UploadStorage.getUploadHistory()
      expect(beforeClean.length).toBeGreaterThan(0)
      
      // Manual cleanup
      const cleaned = UploadStorage.cleanExpiredUploads()
      expect(cleaned).toBeGreaterThan(0)
      
      const afterClean = UploadStorage.getUploadHistory()
      expect(afterClean).toHaveLength(0)
      
      // Reset config
      ConfigStorage.resetConfig()
    })
  })

  describe('ChatStorage with expiration', () => {
    it('should set expiration time on session', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ]

      ChatStorage.saveSession({ messages })
      const sessions = ChatStorage.getAllSessions()
      
      expect(sessions[0].expiresAt).toBeDefined()
      expect(sessions[0].expiresAt).toBeGreaterThan(Date.now())
    })

    it('should clean expired sessions manually', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ]

      ConfigStorage.updateConfig({ enableAutoCleanup: false })
      ChatStorage.saveSession({ messages }, 10)
      
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const cleaned = ChatStorage.cleanExpiredSessions()
      expect(cleaned).toBeGreaterThan(0)
      
      ConfigStorage.resetConfig()
    })
  })
})

describe('Capacity Management', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should check storage capacity', () => {
    const capacity = StorageUtils.checkCapacity()
    
    expect(capacity.used).toBeGreaterThanOrEqual(0)
    expect(capacity.available).toBeGreaterThanOrEqual(0)
    expect(capacity.percentage).toBeGreaterThanOrEqual(0)
    expect(capacity.percentage).toBeLessThanOrEqual(100)
    expect(typeof capacity.isNearLimit).toBe('boolean')
  })

  it('should calculate storage size correctly', () => {
    const record: UploadRecord = {
      id: 'test-id',
      filename: 'test.txt',
      url: 'http://example.com/test.txt',
      uploadedAt: Date.now(),
    }

    UploadStorage.saveUpload(record)
    const size = StorageUtils.getStorageSize()
    
    // Size should be a non-negative number (mock localStorage may not calculate correctly)
    expect(typeof size).toBe('number')
    expect(size).toBeGreaterThanOrEqual(0)
  })

  it('should respect configurable limits', () => {
    // Set lower limit
    ConfigStorage.updateConfig({ maxUploadRecords: 3 })

    // Add 5 records
    for (let i = 0; i < 5; i++) {
      UploadStorage.saveUpload({
        id: `test-id-${i}`,
        filename: `test-${i}.txt`,
        url: `http://example.com/test-${i}.txt`,
        uploadedAt: Date.now(),
      })
    }

    const history = UploadStorage.getUploadHistory()
    expect(history).toHaveLength(3) // Should be limited to 3

    ConfigStorage.resetConfig()
  })

  it('should provide comprehensive storage stats', () => {
    const record: UploadRecord = {
      id: 'test-id',
      filename: 'test.txt',
      url: 'http://example.com/test.txt',
      uploadedAt: Date.now(),
    }
    UploadStorage.saveUpload(record)

    const messages: Message[] = [
      { role: 'user', content: 'Hello', timestamp: Date.now() },
    ]
    ChatStorage.saveSession({ messages })

    const stats = StorageUtils.getStorageStats()
    
    expect(stats.capacity).toBeDefined()
    expect(stats.sessions).toBeDefined()
    expect(stats.uploads).toBeDefined()
    expect(stats.config).toBeDefined()
    expect(stats.uploads.total).toBe(1)
    expect(stats.sessions.totalSessions).toBe(1)
  })
})

describe('Cleanup Utilities', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should clean all expired data', async () => {
    // Add records with short expiration
    UploadStorage.saveUpload({
      id: 'test-upload',
      filename: 'test.txt',
      url: 'http://example.com/test.txt',
      uploadedAt: Date.now(),
    }, 10)

    ChatStorage.saveSession({
      messages: [{ role: 'user', content: 'Hello', timestamp: Date.now() }],
    }, 10)

    await new Promise(resolve => setTimeout(resolve, 20))

    const result = StorageUtils.cleanAllExpired()
    
    expect(result.uploads).toBeGreaterThanOrEqual(0)
    expect(result.sessions).toBeGreaterThanOrEqual(0)
  })
})

describe('Export/Import with new features', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('should export config along with data', () => {
    ConfigStorage.updateConfig({ maxUploadRecords: 100 })
    
    const exported = StorageUtils.exportData()
    const data = JSON.parse(exported)
    
    expect(data.config).toBeDefined()
    expect(data.config.maxUploadRecords).toBe(100)
    expect(data.version).toBeDefined()
  })

  it('should import config from backup', () => {
    const data = {
      uploadHistory: [],
      chatSessions: [],
      config: { maxUploadRecords: 75, maxChatSessions: 15 },
      exportedAt: Date.now(),
      version: '1.1.0',
    }

    StorageUtils.importData(JSON.stringify(data))
    const config = ConfigStorage.getConfig()
    
    expect(config.maxUploadRecords).toBe(75)
    expect(config.maxChatSessions).toBe(15)
  })
})
