"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ChatStorage,
  UploadStorage,
  StorageUtils,
  ChatSession,
} from "../../../lib/storage";

interface Stats {
  sessions: number;
  messages: number;
  uploads: number;
  storageSize: number;
}

export function useSettingsData() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({
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

  return {
    stats,
    sessions,
    showExport,
    exportData,
    setShowExport,
    handleExportData,
    handleDownloadExport,
    handleImportData,
    handleClearAllData,
    handleDeleteSession,
    handleViewSession,
  };
}
