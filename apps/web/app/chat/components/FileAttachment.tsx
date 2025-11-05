'use client'

import { useState } from 'react'

export interface FileAttachmentProps {
  filename: string
  fileUrl?: string
  fileSize?: number
  uploadTime?: number
  onClick?: () => void
}

export function FileAttachment({ 
  filename, 
  fileUrl, 
  fileSize,
  uploadTime,
  onClick 
}: FileAttachmentProps) {
  const [isHovered, setIsHovered] = useState(false)

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    const mb = bytes / (1024 * 1024)
    return mb.toFixed(2) + ' MB'
  }

  const formatTime = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'pdf':
        return '📄'
      case 'doc':
      case 'docx':
        return '📝'
      case 'xls':
      case 'xlsx':
        return '📊'
      case 'ppt':
      case 'pptx':
        return '📽️'
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️'
      default:
        return '📎'
    }
  }

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md' : ''}
        ${isHovered ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* File Icon */}
      <div className="text-3xl flex-shrink-0">
        {getFileIcon(filename)}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">
          {filename}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          {fileSize && (
            <span className="flex items-center gap-1">
              <span>📦</span>
              <span>{formatFileSize(fileSize)}</span>
            </span>
          )}
          {uploadTime && (
            <span className="flex items-center gap-1">
              <span>🕐</span>
              <span>{formatTime(uploadTime)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Action Icon */}
      {onClick && (
        <div className={`
          flex-shrink-0 transition-all
          ${isHovered ? 'text-blue-500 scale-110' : 'text-gray-400'}
        `}>
          <svg 
            className="w-5 h-5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
            />
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
            />
          </svg>
        </div>
      )}
    </div>
  )
}
