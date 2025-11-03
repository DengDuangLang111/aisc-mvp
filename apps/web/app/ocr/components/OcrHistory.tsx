import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import type { OcrHistoryItem } from "../hooks/useOcrLogic";

interface OcrHistoryProps {
  history: OcrHistoryItem[];
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function OcrHistory({ history, onDelete, onClearAll }: OcrHistoryProps) {
  if (history.length === 0) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">暂无历史记录</p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            识别历史 ({history.length})
          </h2>
          <Button onClick={onClearAll} variant="secondary" size="sm">
            清空历史
          </Button>
        </div>

        {/* History List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {history.map((item) => (
            <div
              key={item.id}
              className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.filename}
                    </p>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-medium">
                      {(item.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(item.uploadedAt).toLocaleString("zh-CN")}
                  </p>
                  <p className="text-sm text-gray-700 line-clamp-2">
                    {item.text.slice(0, 100)}
                    {item.text.length > 100 ? "..." : ""}
                  </p>
                </div>
                <button
                  onClick={() => onDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-600 transition-all"
                  title="删除"
                >
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
