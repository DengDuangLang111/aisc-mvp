import { Card } from "../../components/Card";
import { UploadRecord } from "../../../lib/storage";

interface UploadHistoryProps {
  uploadHistory: UploadRecord[];
  onContinueWithFile: (record: UploadRecord) => void;
  onDeleteRecord: (id: string) => void;
  onClearHistory: () => void;
}

function formatFileSize(bytes?: number): string {
  if (!bytes) return '未知';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 60000) return '刚刚';
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function UploadHistory({
  uploadHistory,
  onContinueWithFile,
  onDeleteRecord,
  onClearHistory,
}: UploadHistoryProps) {
  if (uploadHistory.length === 0) return null;

  return (
    <Card>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">📚 最近上传</h3>
          <button
            onClick={onClearHistory}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            清空历史
          </button>
        </div>

        <div className="space-y-2">
          {uploadHistory.slice(0, 10).map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {record.filename}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{formatFileSize(record.fileSize)}</span>
                  <span>•</span>
                  <span>{formatDate(record.uploadedAt)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onContinueWithFile(record)}
                  className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                >
                  继续学习
                </button>
                <button
                  onClick={() => onDeleteRecord(record.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  title="删除记录"
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

        {uploadHistory.length > 10 && (
          <p className="text-xs text-center text-gray-500">
            还有 {uploadHistory.length - 10} 条历史记录未显示
          </p>
        )}
      </div>
    </Card>
  );
}
