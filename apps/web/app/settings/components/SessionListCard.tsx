"use client";

import { ChatSession } from "../../../lib/storage";

interface SessionListCardProps {
  sessions: ChatSession[];
  onViewSession: (session: ChatSession) => void;
  onDeleteSession: (id: string) => void;
}

export function SessionListCard({
  sessions,
  onViewSession,
  onDeleteSession,
}: SessionListCardProps) {
  if (sessions.length === 0) {
    return null;
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">
        💬 聊天会话 ({sessions.length})
      </h3>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {session.filename || "通用会话"}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>{session.messages.length} 条消息</span>
                <span>•</span>
                <span>{formatDate(session.updatedAt)}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onViewSession(session)}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
              >
                查看
              </button>
              <button
                onClick={() => onDeleteSession(session.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                title="删除会话"
              >
                <svg
                  className="h-4 w-4"
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
