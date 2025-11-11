'use client'

import { create } from 'zustand'
import { ApiClient, ApiError } from '@/lib/api-client'
import { ChatStorage } from '@/lib/storage'
import { logger } from '@/lib/logger'
import type { Message } from '@/app/chat/components/MessageBubble'

const MAX_RETRIES = 3
const RETRY_DELAY = 1000

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const retryWithBackoff = async <T,>(fn: () => Promise<T>, attempt = 0): Promise<T> => {
  try {
    return await fn()
  } catch (err) {
    if (attempt < MAX_RETRIES && err instanceof ApiError && err.statusCode >= 500) {
      await delay(RETRY_DELAY * Math.pow(2, attempt))
      return retryWithBackoff(fn, attempt + 1)
    }
    throw err
  }
}

interface PersistPayload {
  documentId?: string | null
  filename?: string
  fileUrl?: string
}

interface ChatStoreState {
  messages: Message[]
  isLoading: boolean
  error: string | null
  showDocument: boolean
  documentFilename?: string
  documentUrl?: string
  conversationId: string | null
  uploadId: string | null
  currentDocumentId: string | null
  sessionLoaded: boolean
  streamingContent: string
  isStreaming: boolean
  isThinking: boolean
  abortController: AbortController | null
}

interface ChatStoreActions {
  setDocumentFilename: (value?: string) => void
  setDocumentUrl: (value?: string) => void
  setCurrentDocumentId: (value: string | null) => void
  setUploadId: (value: string | null) => void
  setShowDocument: (value: boolean) => void
  toggleDocument: () => void
  setError: (value: string | null) => void
  loadSessionFromStorage: (documentId?: string | null) => void
  persistSession: (payload: PersistPayload) => void
  sendMessage: (content: string, options?: { conversationId?: string; streaming?: boolean }) => Promise<void>
  uploadAndProcessFile: (file: File) => Promise<void>
  clearConversation: (documentIdToDelete?: string | null) => void
  clearAllConversationsState: () => void
  selectConversation: (sessionId: string) => void
  abortActiveRequest: () => void
  startNewConversation: (options?: { preserveDocument?: boolean }) => void
}

export type ChatStore = ChatStoreState & ChatStoreActions

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  showDocument: true,
  documentFilename: undefined,
  documentUrl: undefined,
  conversationId: null,
  uploadId: null,
  currentDocumentId: null,
  sessionLoaded: false,
  streamingContent: '',
  isStreaming: false,
  isThinking: false,
  abortController: null,

  setDocumentFilename: (value?: string) => set({ documentFilename: value }),
  setDocumentUrl: (value?: string) => set({ documentUrl: value }),
  setCurrentDocumentId: (value: string | null) => set({ currentDocumentId: value }),
  setUploadId: (value: string | null) => set({ uploadId: value }),
  setShowDocument: (value: boolean) => set({ showDocument: value }),
  toggleDocument: () => set(state => ({ showDocument: !state.showDocument })),
  setError: (value: string | null) => set({ error: value }),
  startNewConversation: (options?: { preserveDocument?: boolean }) => {
    get().abortActiveRequest()
    const preserveDocument = options?.preserveDocument ?? true
    set(() => ({
      messages: [],
      conversationId: null,
      error: null,
      streamingContent: '',
      isStreaming: false,
      isThinking: false,
      ...(preserveDocument
        ? {}
        : {
            currentDocumentId: null,
            uploadId: null,
            documentFilename: undefined,
            documentUrl: undefined,
          }),
    }))
  },

  loadSessionFromStorage: (documentId?: string | null) => {
    if (get().sessionLoaded) return

    try {
      let session = null
      if (documentId) {
        session = ChatStorage.getSessionByFileId(documentId)
      } else {
        const allSessions = ChatStorage.getAllSessions()
        session = allSessions.find(s => !s.fileId) || null
      }

      if (session && session.messages.length > 0) {
        set({
          messages: session.messages,
          currentDocumentId: session.fileId || null,
          uploadId: session.fileId || null,
          documentFilename: session.filename || undefined,
          documentUrl: session.fileUrl || undefined,
          conversationId: session.conversationId || null,
        })
        logger.debug('已加载历史消息', { count: session.messages.length })
      }
    } catch (e) {
      logger.error('加载会话失败', e, {})
    } finally {
      set({ sessionLoaded: true })
    }
  },

  persistSession: ({ documentId, filename, fileUrl }: PersistPayload) => {
    const { sessionLoaded, messages, conversationId } = get()
    if (!sessionLoaded || messages.length === 0) return

    try {
      ChatStorage.saveSession(
        {
          fileId: documentId || undefined,
          filename,
          fileUrl,
          messages,
        },
        undefined,
        conversationId || undefined,
      )
    } catch (e) {
      logger.error('保存会话失败', e, {})
    }
  },

  abortActiveRequest: () => {
    const controller = get().abortController
    if (controller) {
      controller.abort()
      set({ abortController: null })
    }
  },

  sendMessage: async (content: string, options?: { conversationId?: string; streaming?: boolean }) => {
    const { messages, conversationId, currentDocumentId } = get()
    get().abortActiveRequest()
    const abortController = new AbortController()
    set({ abortController })

    const { streaming = true } = options || {}

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    }

    set(state => ({
      messages: [...state.messages, userMessage],
      isLoading: true,
      error: null,
    }))

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }))

      if (streaming) {
        logger.debug('[Streaming] Starting stream request')
        let fullResponse = ''
        let lastConversationId = conversationId || undefined

        set({
          streamingContent: '',
          isStreaming: true,
          isThinking: true,
        })

        try {
          const stream = ApiClient.chatStream({
            message: content,
            conversationHistory,
            documentId: currentDocumentId || undefined,
            conversationId: conversationId || undefined,
          })

          let chunkCount = 0

          for await (const chunk of stream) {
            fullResponse += chunk.token || ''
            chunkCount++

            if (chunkCount === 1) {
              set({ isThinking: false })
            }

            if (chunk.conversationId) {
              lastConversationId = chunk.conversationId
            }

            const currentContent = fullResponse
            await new Promise<void>(resolve => {
              requestAnimationFrame(() => {
                set({ streamingContent: currentContent })
                resolve()
              })
            })

            if (chunk.complete) {
              logger.info('[Streaming] Stream complete')
              break
            }
          }

          const assistantMessage: Message = {
            role: 'assistant',
            content: fullResponse,
            timestamp: Date.now(),
            conversationId: lastConversationId,
          }

          set(state => ({
            messages: [...state.messages, assistantMessage],
            streamingContent: '',
            isStreaming: false,
            isThinking: false,
            conversationId: state.conversationId || lastConversationId || null,
          }))
        } catch (err) {
          set({
            isStreaming: false,
            isThinking: false,
            streamingContent: '',
          })
          throw err
        }
      } else {
        const data = await retryWithBackoff(() =>
          ApiClient.chat({
            message: content,
            conversationHistory,
            documentId: currentDocumentId || undefined,
            conversationId: conversationId || undefined,
          }),
        )

        if (data.conversationId && !conversationId) {
          set({ conversationId: data.conversationId })
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          hintLevel: data.hintLevel,
          timestamp: data.timestamp,
          conversationId: data.conversationId,
        }
        set(state => ({ messages: [...state.messages, assistantMessage] }))
      }
    } catch (err) {
      let errorMessage = 'Failed to send message, please try again'

      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          errorMessage = 'Too many requests, please try again later'
        } else if (err.statusCode >= 500) {
          errorMessage = 'Server error, auto retrying'
        } else {
          errorMessage = `Failed (${err.statusCode}): ${err.message}`
        }
      } else if (err instanceof Error && err.name === 'AbortError') {
        errorMessage = 'Request cancelled'
      }

      set(state => ({
        error: errorMessage,
        messages: state.messages.slice(0, -1),
      }))
      logger.error('Chat error', err, {})
    } finally {
      set({ isLoading: false, abortController: null })
    }
  },

  uploadAndProcessFile: async (file: File) => {
    set({ error: null, isLoading: true })

    const setValidationError = (message: string) => {
      set({ error: message, isLoading: false })
    }

    try {
      const maxSize = 50 * 1024 * 1024
      if (file.size > maxSize) {
        setValidationError('File is too large, please select a file under 50MB')
        return
      }

      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ]

      if (!allowedTypes.includes(file.type)) {
        setValidationError('Unsupported file type, please upload PDF, text, image, or Word document')
        return
      }

      logger.info('开始上传文件', { filename: file.name })
      const uploadResponse = await ApiClient.uploadFile(file)
      const newDocumentId = (uploadResponse as any).documentId || uploadResponse.id

      get().startNewConversation({ preserveDocument: false })

      set({
        uploadId: newDocumentId,
        currentDocumentId: newDocumentId,
        documentFilename: uploadResponse.filename,
        documentUrl: uploadResponse.url,
      })

      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href)
          url.searchParams.set('documentId', newDocumentId)
          if (uploadResponse.filename) {
            url.searchParams.set('filename', uploadResponse.filename)
          }
          if (uploadResponse.url) {
            url.searchParams.set('fileUrl', uploadResponse.url)
          } else {
            url.searchParams.delete('fileUrl')
          }
          window.history.replaceState(null, '', url.toString())
        }
      } catch (historyError) {
        logger.warn('更新聊天地址栏失败', { error: historyError })
      }

      const systemMessage: Message = {
        role: 'user',
        content: '📎 Document Uploaded',
        timestamp: Date.now(),
        attachment: {
          filename: file.name,
          fileUrl: uploadResponse.url,
          documentId: newDocumentId,
          fileSize: file.size,
          uploadTime: Date.now(),
        },
      }

      set(state => ({
        messages: [...state.messages, systemMessage],
      }))

      const maxAttempts = 60
      const pollInterval = 5000
      let attempts = 0
      let ocrResult: Awaited<ReturnType<typeof ApiClient.getOcrResult>> | null = null

      logger.info('开始轮询 OCR 结果', { documentId: newDocumentId })
      while (attempts < maxAttempts) {
        try {
          const result = await ApiClient.getOcrResult(newDocumentId)
          if (result && result.fullText) {
            ocrResult = result
            logger.info('OCR 处理完成', { result })
            break
          }
        } catch (err) {
          if (!(err instanceof ApiError && err.statusCode === 404)) {
            throw err
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          await delay(pollInterval)
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('OCR 处理超时，请稍后重试')
      }

      if (!ocrResult) {
        throw new Error('未能获取 OCR 结果，请稍后重试')
      }

      const fullText = ocrResult.fullText || ''
      const ocrSummary = fullText
        ? `${fullText.slice(0, 200)}${fullText.length > 200 ? '...' : ''}`
        : '无法识别文本'

      const confidenceValue =
        typeof ocrResult.confidence === 'number'
          ? ocrResult.confidence > 1
            ? ocrResult.confidence
            : ocrResult.confidence * 100
          : null
      const confidenceText =
        confidenceValue !== null ? `${Math.min(100, Math.max(0, confidenceValue)).toFixed(1)}%` : '未提供'
      const pageCount =
        typeof ocrResult.pageCount === 'number' && ocrResult.pageCount > 0 ? ocrResult.pageCount : 1

      const ocrMessage: Message = {
        role: 'assistant',
        content: `✅ Document recognized successfully\n\n**Recognition Info**\n- Pages: ${pageCount}\n- Language: ${
          ocrResult.language || 'Not detected'
        }\n- Confidence: ${confidenceText}\n\n**Text Preview**\n${ocrSummary}`,
        timestamp: Date.now(),
      }

      set(state => ({
        messages: [...state.messages, ocrMessage],
      }))

      logger.info('文件上传并 OCR 处理完成')
    } catch (err) {
      let errorMessage = 'File processing failed, please try again'

      if (err instanceof ApiError) {
        errorMessage = `Upload failed (${err.statusCode}): ${err.message}`
      } else if (err instanceof Error) {
        errorMessage = err.message
      }

      set({ error: errorMessage })
      logger.error('文件处理错误', err, {})
    } finally {
      set({ isLoading: false })
    }
  },

  clearConversation: (documentIdToDelete?: string | null) => {
    try {
      const targetId = documentIdToDelete
      if (targetId) {
        const session = ChatStorage.getSessionByFileId(targetId)
        if (session) {
          ChatStorage.deleteSession(session.id)
        }
      }
    } catch (err) {
      logger.warn('清除会话失败', { error: err })
    }

    set({
      messages: [],
      error: null,
      conversationId: null,
      uploadId: null,
      currentDocumentId: null,
      documentFilename: undefined,
      documentUrl: undefined,
      streamingContent: '',
      isStreaming: false,
      isThinking: false,
    })
  },

  clearAllConversationsState: () => {
    set({
      messages: [],
      conversationId: null,
      uploadId: null,
      currentDocumentId: null,
      documentFilename: undefined,
      documentUrl: undefined,
      error: null,
      showDocument: true,
      streamingContent: '',
      isStreaming: false,
      isThinking: false,
    })
  },

  selectConversation: (sessionId: string) => {
    try {
      const session = ChatStorage.getSessionById(sessionId)
      if (session) {
        set({
          messages: session.messages,
          conversationId: session.conversationId || null,
          currentDocumentId: session.fileId || null,
          uploadId: session.fileId || null,
          documentFilename: session.filename || undefined,
          documentUrl: session.fileUrl || undefined,
          error: null,
        })
        logger.info('已加载对话', { filename: session.filename || 'General Chat' })
      }
    } catch (e) {
      logger.error('加载对话失败', e, {})
      set({ error: 'Failed to load conversation' })
    }
  },
}))
