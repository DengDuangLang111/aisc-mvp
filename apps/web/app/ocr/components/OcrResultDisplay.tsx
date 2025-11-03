import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import type { OcrResult } from "../hooks/useOcrLogic";

interface OcrResultDisplayProps {
  result: OcrResult | null;
  processing: boolean;
  onRetry: () => void;
  onCopy: () => void;
  onStartChat: () => void;
}

export function OcrResultDisplay({
  result,
  processing,
  onRetry,
  onCopy,
  onStartChat,
}: OcrResultDisplayProps) {
  if (!result && !processing) {
    return (
      <Card>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-gray-500">识别结果将显示在这里</p>
        </div>
      </Card>
    );
  }

  if (processing) {
    return (
      <Card>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">识别结果</h2>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
            <p className="text-gray-600 font-medium">正在识别文字...</p>
            <p className="text-sm text-gray-500 mt-2">这可能需要 10-30 秒</p>
          </div>
        </div>
      </Card>
    );
  }

  if (!result) return null;

  return (
    <Card>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">识别结果</h2>
          <div className="flex gap-2">
            <Button onClick={onRetry} variant="secondary" size="sm">
              🔄 重试
            </Button>
            <Button onClick={onCopy} variant="secondary" size="sm">
              📋 复制
            </Button>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-3 text-xs">
          <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded-full font-medium">
            ✅ 识别成功
          </div>
          <div className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full font-medium">
            置信度: {(result.confidence * 100).toFixed(1)}%
          </div>
          <div className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full font-medium">
            语言: {result.language || "未知"}
          </div>
          {result.pageCount > 0 && (
            <div className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full font-medium">
              {result.pageCount} 页
            </div>
          )}
        </div>

        {/* Text Content */}
        <div className="border border-gray-200 rounded-lg">
          <div className="p-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm font-medium text-gray-700">
              识别的文字内容（共 {result.fullText.length} 字）
            </p>
          </div>
          <div className="p-4 max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
              {result.fullText || "（无文字内容）"}
            </p>
          </div>
        </div>

        {/* Action Button */}
        <Button onClick={onStartChat} variant="primary" className="w-full">
          💬 用这段文字开始对话 →
        </Button>

        {/* Structured Data (Optional) */}
        {result.structuredData && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
              查看结构化数据
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
              {JSON.stringify(result.structuredData, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </Card>
  );
}
