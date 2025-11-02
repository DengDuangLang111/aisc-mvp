"use client";

interface StatsCardProps {
  sessions: number;
  messages: number;
  uploads: number;
  storageSize: number;
}

export function StatsCard({ sessions, messages, uploads, storageSize }: StatsCardProps) {
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">📊 数据统计</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-700">{sessions}</div>
          <div className="text-sm text-gray-600 mt-1">聊天会话</div>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-700">{messages}</div>
          <div className="text-sm text-gray-600 mt-1">对话消息</div>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-700">{uploads}</div>
          <div className="text-sm text-gray-600 mt-1">上传文件</div>
        </div>
        <div className="text-center p-4 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-700">
            {formatBytes(storageSize)}
          </div>
          <div className="text-sm text-gray-600 mt-1">存储空间</div>
        </div>
      </div>
    </div>
  );
}
