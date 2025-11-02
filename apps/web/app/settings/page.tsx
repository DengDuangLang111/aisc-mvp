"use client";

import { Layout } from "../components/Layout";
import { StatsCard } from "./components/StatsCard";
import { DataManagementCard } from "./components/DataManagementCard";
import { SessionListCard } from "./components/SessionListCard";
import { StorageInfoCard } from "./components/StorageInfoCard";
import { useSettingsData } from "./hooks/useSettingsData";

export default function SettingsPage() {
  const {
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
  } = useSettingsData();

  return (
    <Layout maxWidth="lg">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">设置</h1>
          <p className="mt-2 text-gray-600">管理你的数据和偏好设置</p>
        </div>

        {/* Stats */}
        <StatsCard
          sessions={stats.sessions}
          messages={stats.messages}
          uploads={stats.uploads}
          storageSize={stats.storageSize}
        />

        {/* Data Management */}
        <DataManagementCard
          onExport={handleExportData}
          onImport={handleImportData}
          onClearAll={handleClearAllData}
          showExport={showExport}
          exportData={exportData}
          onCloseExport={() => setShowExport(false)}
          onDownloadExport={handleDownloadExport}
        />

        {/* Session List */}
        <SessionListCard
          sessions={sessions}
          onViewSession={handleViewSession}
          onDeleteSession={handleDeleteSession}
        />

        {/* Storage Info */}
        <StorageInfoCard />
      </div>
    </Layout>
  );
}
