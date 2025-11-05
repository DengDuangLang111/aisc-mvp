'use client'

import { useState, useEffect } from 'react';
import { ChatStorage } from '../../../lib/storage';
import type { ChatSession } from '../../../lib/storage';

interface ConversationListProps {
  onSelectSession: (session: ChatSession) => void;
  onClearSession: () => void;
  currentSessionId?: string;
}

export function ConversationList({
  onSelectSession,
  onClearSession,
  currentSessionId,
}: ConversationListProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // 加载所有会话
    const allSessions = ChatStorage.getAllSessions();
    setSessions(allSessions);
  }, []);

  const handleSelectSession = (session: ChatSession) => {
    onSelectSession(session);
    setIsOpen(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      ChatStorage.deleteSession(sessionId);
      setSessions(sessions.filter((s) => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        onClearSession();
      }
    }
  };

  const handleNewChat = () => {
    onClearSession();
    setIsOpen(false);
  };

  const getSessionPreview = (session: ChatSession): string => {
    if (session.messages.length === 0) return '(Empty conversation)';
    const lastUserMessage = [...session.messages]
      .reverse()
      .find((m) => m.role === 'user');
    return lastUserMessage ? lastUserMessage.content.slice(0, 40) : '(Assistant replies only)';
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} minutes ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;

    return date.toLocaleDateString('en-US');
  };

  return (
    <div className="relative">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <span>📋</span>
        Chat History ({sessions.length})
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Chat History</h3>
            <button
              onClick={handleNewChat}
              className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              New Chat
            </button>
          </div>

          {/* Sessions List */}
          <div className="max-h-96 overflow-y-auto">
            {sessions.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                No chat history yet
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => handleSelectSession(session)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors flex items-start justify-between group ${
                    currentSessionId === session.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">
                      {session.filename ? `📄 ${session.filename}` : '💬 General Chat'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1 truncate">
                      {getSessionPreview(session)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(session.createdAt)} · {session.messages.length} messages
                    </div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete conversation"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Clear All Button */}
          {sessions.length > 0 && (
            <div className="border-t border-gray-200 px-4 py-2">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to clear all conversations?')) {
                    ChatStorage.clearAllSessions();
                    setSessions([]);
                    onClearSession();
                    setIsOpen(false);
                  }
                }}
                className="w-full text-xs text-red-500 hover:bg-red-50 px-3 py-2 rounded transition-colors"
              >
                Clear All Conversations
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
