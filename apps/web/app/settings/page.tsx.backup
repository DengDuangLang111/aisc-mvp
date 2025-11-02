"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../components/Card";
import { Button } from "../components/Button";
import { Layout } from "../components/Layout";
import {
  ChatStorage,
  UploadStorage,
  StorageUtils,
  ChatSession,
} from "../../lib/storage";

export default function SettingsPage() {
  const router = useRouter();
  const [stats, setStats] = useState({
    sessions: 0,
    messages: 0,
    uploads: 0,
    storageSize: 0,
  });
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState("");

  useEffect(() => {
    loadStats();
    loadSessions();
  }, []);

  function loadStats() {
    const sessionStats = ChatStorage.getSessionStats();
    const uploadHistory = UploadStorage.getUploadHistory();
    const storageSize = StorageUtils.getStorageSize();

    setStats({
      sessions: sessionStats.totalSessions,
      messages: sessionStats.totalMessages,
      uploads: uploadHistory.length,
      storageSize,
    });
  }

  function loadSessions() {
    const allSessions = ChatStorage.getAllSessions();
    setSessions(allSessions);
  }

  function handleExportData() {
    const data = StorageUtils.exportData();
    setExportData(data);
    setShowExport(true);
  }

  function handleDownloadExport() {
    const blob = new Blob([exportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `study-oasis-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = event.target?.result as string;
          const success = StorageUtils.importData(data);
          if (success) {
            alert("数据导入成功！");
            loadStats();
            loadSessions();
          } else {
            alert("数据导入失败，请检查文件格式");
          }
        } catch (err) {
          alert("导入失败：" + (err instanceof Error ? err.message : "未知错误"));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleClearAllData() {
    if (
      confirm(
        "警告：此操作将清空所有聊天记录和上传历史，且不可恢复。确定要继续吗？"
      )
    ) {
      StorageUtils.clearAllAppData();
      loadStats();
      loadSessions();
      alert("所有数据已清空");
    }
  }

  function handleDeleteSession(id: string) {
    if (confirm("确定要删除这个会话吗？")) {
      ChatStorage.deleteSession(id);
      loadStats();
      loadSessions();
    }
  }

  function handleViewSession(session: ChatSession) {
    if (session.fileId) {
      router.push(
        `/chat?fileId=${session.fileId}&filename=${encodeURIComponent(
          session.filename || ""
        )}`
      );
    } else {
      router.push("/chat");
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
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
    <Layout maxWidth="lg">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="mt-2 text-gray-600">管理你的数据和偏好设置</p>
        </div>

        {/* 统计信息 */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">📊 数据统计</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">
                {stats.sessions}
              </div>
              <div className="text-sm text-gray-600 mt-1">聊天会话</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">
                {stats.messages}
              </div>
              <div className="text-sm text-gray-600 mt-1">对话消息</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-700">
                {stats.uploads}
              </div>
              <div className="text-sm text-gray-600 mt-1">上传文件</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">
                {formatBytes(stats.storageSize)}
              </div>
              <div className="text-sm text-gray-600 mt-1">存储空间</div>
            </div>
          </div>
        </Card>

        {/* 数据管理 */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-4">💾 数据管理</h3>
          <div className="space-y-3">
            <Button
              onClick={handleExportData}
              variant="outline"
              className="w-full"
            >
              📥 导出数据备份
            </Button>
            <Button
              onClick={handleImportData}
              variant="outline"
              className="w-full"
            >
              📤 从备份导入数据
            </Button>
            <Button
              onClick={handleClearAllData}
              variant="outline"
              className="w-full text-red-600 border-red-300 hover:bg-red-50"
            >
              🗑️ 清空所有数据
            </Button>
          </div>

          {showExport && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-900">
                  导出的数据
                </h4>
                <button
                  onClick={() => setShowExport(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-auto max-h-40">
                {exportData}
              </pre>
              <Button
                onClick={handleDownloadExport}
                variant="primary"
                className="w-full mt-3"
              >
                下载为文件
              </Button>
            </div>
          )}
        </Card>

        {/* 会话历史 */}
        {sessions.length > 0 && (
          <Card>
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
                      onClick={() => handleViewSession(session)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    >
                      查看
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
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
          </Card>
        )}

        {/* 使用说明 */}
        <Card>
          <h3 className="font-semibold text-gray-900 mb-3">ℹ️ 关于数据存储</h3>
          <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
            <li>所有数据存储在浏览器本地 (localStorage)</li>
            <li>数据不会上传到服务器，完全保护您的隐私</li>
            <li>清除浏览器数据会导致历史记录丢失</li>
            <li>建议定期导出数据备份</li>
            <li>
              最多保存 20 个聊天会话和 50 条上传记录
            </li>
          </ul>
        </Card>
      </div>
    </Layout>
  );
}
