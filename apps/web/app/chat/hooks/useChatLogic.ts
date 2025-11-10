'use client'

import { useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useChatStore } from '@/stores/chat.store'
import { logger } from '../../../lib/logger'

export function useChatLogic() {
  const searchParams = useSearchParams()
  const initialPromptRef = useRef<{ value: string | null; sent: boolean }>({ value: null, sent: false })

  const fileId = searchParams.get('fileId')
  const documentId = searchParams.get('documentId')
  const filenameParam = searchParams.get('filename') || undefined
  const fileUrlParam = searchParams.get('fileUrl') || undefined
  const initialMessageParam = searchParams.get('initialMessage')

  const {
    messages,
    isLoading,
    error,
    showDocument,
    documentUrl,
    documentFilename,
    conversationId,
    uploadId,
    streamingContent,
    isStreaming,
    isThinking,
    currentDocumentId,
    sessionLoaded,
    setDocumentFilename,
    setDocumentUrl,
    setCurrentDocumentId,
    loadSessionFromStorage,
    persistSession,
    sendMessage,
    uploadAndProcessFile,
    toggleDocument,
    selectConversation,
    clearConversation,
    clearAllConversationsState,
    abortActiveRequest,
  } = useChatStore()

  const urlDocumentId = documentId || fileId || null
  const effectiveDocumentId = currentDocumentId || urlDocumentId || null

  useEffect(() => {
    initialPromptRef.current = {
      value: initialMessageParam,
      sent: false,
    }
  }, [initialMessageParam])

  useEffect(() => {
    if (filenameParam !== documentFilename) {
      setDocumentFilename(filenameParam)
    }
  }, [filenameParam, documentFilename, setDocumentFilename])

  useEffect(() => {
    if (fileUrlParam !== documentUrl) {
      setDocumentUrl(fileUrlParam)
    }
  }, [fileUrlParam, documentUrl, setDocumentUrl])

  useEffect(() => {
    if (urlDocumentId && urlDocumentId !== currentDocumentId) {
      setCurrentDocumentId(urlDocumentId)
    } else if (!urlDocumentId && currentDocumentId) {
      setCurrentDocumentId(null)
    }
  }, [urlDocumentId, currentDocumentId, setCurrentDocumentId])

  useEffect(() => {
    if (!sessionLoaded) {
      loadSessionFromStorage(effectiveDocumentId)
    }
  }, [effectiveDocumentId, loadSessionFromStorage, sessionLoaded])

  useEffect(() => {
    persistSession({
      documentId: effectiveDocumentId,
      filename: documentFilename,
      fileUrl: documentUrl,
    })
  }, [messages, effectiveDocumentId, documentFilename, documentUrl, persistSession])

  useEffect(() => {
    if (!sessionLoaded) return
    const initial = initialPromptRef.current
    if (!initial.value || initial.sent) return
    if (messages.length > 0) return

    initial.sent = true
    sendMessage(initial.value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, sessionLoaded])

  useEffect(() => {
    return () => {
      abortActiveRequest()
    }
  }, [abortActiveRequest])

  const clearUrlParams = () => {
    try {
      if (typeof window !== 'undefined') {
        const url = new URL(window.location.href)
        url.searchParams.delete('documentId')
        url.searchParams.delete('fileId')
        url.searchParams.delete('filename')
        url.searchParams.delete('fileUrl')
        url.searchParams.delete('initialMessage')
        window.history.replaceState(null, '', url.toString())
      }
    } catch (historyError) {
      logger.warn('清除 URL 参数失败', { error: historyError })
    }
  }

  const handleSend = (content: string, options?: { conversationId?: string; streaming?: boolean }) =>
    sendMessage(content, options)

  const handleFileSelect = (file: File) => uploadAndProcessFile(file)

  const handleClearChat = () => {
    if (confirm('Are you sure you want to clear the current conversation? This action cannot be undone.')) {
      clearConversation(effectiveDocumentId)
      clearUrlParams()
    }
  }

  const handleToggleDocument = () => toggleDocument()

  const handleSelectConversation = (sessionId: string) => selectConversation(sessionId)

  const handleClearAllConversations = () => {
    clearAllConversationsState()
    clearUrlParams()
    logger.info('已清空当前对话')
  }

  return {
    messages,
    isLoading,
    error,
    showDocument,
    fileUrl: documentUrl,
    filename: documentFilename,
    conversationId,
    uploadId,
    streamingContent,
    isStreaming,
    isThinking,
    handleSend,
    handleFileSelect,
    handleClearChat,
    handleToggleDocument,
    handleSelectConversation,
    handleClearAllConversations,
  }
}
