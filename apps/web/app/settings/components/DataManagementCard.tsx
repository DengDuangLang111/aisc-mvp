"use client";

import { Button } from "../../components/Button";

interface DataManagementCardProps {
  onExport: () => void;
  onImport: () => void;
  onClearAll: () => void;
  showExport: boolean;
  exportData: string;
  onCloseExport: () => void;
  onDownloadExport: () => void;
}

export function DataManagementCard({
  onExport,
  onImport,
  onClearAll,
  showExport,
  exportData,
  onCloseExport,
  onDownloadExport,
}: DataManagementCardProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">💾 数据管理</h3>
      <div className="space-y-3">
        <Button onClick={onExport} variant="outline" className="w-full">
          📥 导出数据备份
        </Button>
        <Button onClick={onImport} variant="outline" className="w-full">
          📤 从备份导入数据
        </Button>
        <Button
          onClick={onClearAll}
          variant="outline"
          className="w-full text-red-600 border-red-300 hover:bg-red-50"
        >
          🗑️ 清空所有数据
        </Button>
      </div>

      {showExport && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-900">导出的数据</h4>
            <button
              onClick={onCloseExport}
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
            onClick={onDownloadExport}
            variant="primary"
            className="w-full mt-3"
          >
            下载为文件
          </Button>
        </div>
      )}
    </div>
  );
}
