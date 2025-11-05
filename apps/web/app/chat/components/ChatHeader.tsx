'use client'

import Link from 'next/link'
import { ConversationList } from './ConversationList'

interface ChatHeaderProps {
  messageCount: number;
  hasDocument: boolean;
  showDocument: boolean;
  focusModeActive: boolean;
  onClearChat: () => void;
  onToggleDocument: () => void;
  onToggleFocusMode: () => void;
  onSelectConversation?: (sessionId: string) => void;
  onClearAllConversations?: () => void;
}

export function ChatHeader({
  messageCount,
  hasDocument,
  showDocument,
  focusModeActive,
  onClearChat,
  onToggleDocument,
  onToggleFocusMode,
  onSelectConversation,
  onClearAllConversations,
}: ChatHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 shadow-sm flex-shrink-0">
      <div className="max-w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Home Button */}
          <Link
            href="/"
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            title="返回首页"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
          </Link>
          
          <div>
            <h1 className="text-xl font-semibold text-gray-900">AI Learning Assistant</h1>
            <p className="text-sm text-gray-600 mt-1">
              Intelligent Progressive Prompting System - Helping You Think Independently
              {messageCount > 0 && (
                <span className="ml-2 text-xs text-gray-500">
                  ({messageCount} messages)
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Focus Mode Toggle */}
          <button
            onClick={onToggleFocusMode}
            className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 ${
              focusModeActive
                ? 'border-purple-500 text-purple-700 bg-purple-50 hover:bg-purple-100'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
            title={focusModeActive ? 'Exit Focus Mode' : 'Enter Focus Mode'}
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            {focusModeActive ? '🎯 Focus' : 'Focus'}
          </button>

          {/* Conversation History - Integrated Component */}
          <ConversationList
            onSelectSession={(session) => {
              if (onSelectConversation) {
                onSelectConversation(session.id)
              }
            }}
            onClearSession={() => {
              if (onClearAllConversations) {
                onClearAllConversations()
              }
            }}
          />

          {/* Clear Chat Button */}
          {messageCount > 0 && (
            <button
              onClick={onClearChat}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              title="Clear chat"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}

          {/* Toggle Document Button */}
          {hasDocument && (
            <button
              onClick={onToggleDocument}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg
                className="-ml-1 mr-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {showDocument ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                )}
              </svg>
              {showDocument ? '隐藏文档' : '显示文档'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
