'use client'

import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { Button } from '@/app/components/Button'
import { logger } from '../../../lib/logger';

export interface MessageInputProps {
  onSend: (message: string, options?: { conversationId?: string; streaming?: boolean }) => void
  onFileSelect?: (file: File) => void
  conversationId?: string
  disabled?: boolean
  placeholder?: string
}

export function MessageInput({ 
  onSend, 
  onFileSelect,
  conversationId,
  disabled = false,
  placeholder = 'Enter your question...' 
}: MessageInputProps) {
  const [input, setInput] = useState('')
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [streaming, setStreaming] = useState(true) // Enable streaming by default
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSend = () => {
    const trimmedInput = input.trim()
    if (trimmedInput && !disabled) {
      onSend(trimmedInput, { conversationId, streaming })
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileSelect) {
      setIsUploadingFile(true)
      try {
        onFileSelect(file)
      } catch (error) {
        logger.error('File selection error', error, {})
      } finally {
        setIsUploadingFile(false)
      }
    }
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-4">
      {/* Streaming toggle */}
      <div className="mb-3 flex items-center gap-2 max-w-4xl mx-auto">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={streaming}
            onChange={(e) => setStreaming(e.target.checked)}
            className="w-4 h-4 rounded border-gray-300 cursor-pointer"
            title="Enable streaming AI responses"
          />
          <span className="text-sm text-gray-600">Streaming Response (SSE)</span>
        </label>
      </div>

      <div className="flex gap-3 items-end max-w-4xl mx-auto">
        {/* File upload button */}
        {onFileSelect && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
              className="hidden"
              disabled={disabled || isUploadingFile}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isUploadingFile}
              className="p-2 text-gray-600 hover:text-blue-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-lg hover:bg-gray-100"
              title="Upload file"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33A3 3 0 0116.5 19.5H6.75z"
                />
              </svg>
            </button>
          </>
        )}

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
        />

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={!input.trim() || disabled}
          loading={disabled}
          size="md"
          variant="primary"
          title={input.trim() ? 'Send message (Enter)' : 'Please enter a message'}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </Button>
      </div>
      <div className="mt-2 text-xs text-gray-500 text-center max-w-4xl mx-auto">
        Press <kbd className="bg-gray-100 px-2 py-1 rounded text-gray-700">Enter</kbd> to send, <kbd className="bg-gray-100 px-2 py-1 rounded text-gray-700">Shift + Enter</kbd> for new line
      </div>
    </div>
  )
}
