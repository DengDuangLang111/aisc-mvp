"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Layout } from "../components/Layout";
import { ApiClient, ApiError } from "../../lib/api-client";
import { UploadStorage, UploadRecord } from "../../lib/storage";

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    filename: string;
    url: string;
  } | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);
  const router = useRouter();

  // 加载上传历史
  useEffect(() => {
    const history = UploadStorage.getUploadHistory();
    setUploadHistory(history);
  }, []);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus("请选择一个文件");
      return;
    }

    console.log("选中文件：", file.name, file.type, file.size, "bytes");
    setStatus(`正在上传：${file.name}...`);
    setUploading(true);

    try {
      const result = await ApiClient.uploadFile(file);
      console.log("上传成功：", result);
      
      // 保存到 localStorage
      const uploadRecord: UploadRecord = {
        id: result.id,
        filename: result.filename,
        url: result.url,
        uploadedAt: Date.now(),
        fileSize: file.size,
        fileType: file.type,
      };
      UploadStorage.saveUpload(uploadRecord);
      
      // 更新状态
      setUploadedFile(result);
      setUploadHistory(UploadStorage.getUploadHistory());
      setStatus(`✅ 上传成功！文件：${result.filename}`);
    } catch (err) {
      console.error("上传错误：", err);
      if (err instanceof ApiError) {
        setStatus(`❌ 上传失败 (${err.statusCode}): ${err.message}`);
      } else {
        setStatus(`❌ 上传失败：${err instanceof Error ? err.message : "未知错误"}`);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleStartChat() {
    if (uploadedFile) {
      router.push(`/chat?fileId=${uploadedFile.id}&filename=${encodeURIComponent(uploadedFile.filename)}`);
    } else {
      router.push('/chat');
    }
  }

  function handleContinueWithFile(record: UploadRecord) {
    router.push(`/chat?fileId=${record.id}&filename=${encodeURIComponent(record.filename)}`);
  }

  function handleDeleteRecord(id: string) {
    if (confirm('确定要删除这条上传记录吗？')) {
      UploadStorage.deleteUpload(id);
      setUploadHistory(UploadStorage.getUploadHistory());
    }
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
    
    // 小于1分钟
    if (diff < 60000) return '刚刚';
    // 小于1小时
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    // 小于24小时
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    // 小于7天
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    
    // 超过7天显示具体日期
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <Layout maxWidth="md">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">上传学习材料</h1>
          <p className="mt-2 text-gray-600">上传文件后，可以开始对话学习</p>
        </div>

        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择文件
              </label>
              <input
                ref={fileRef}
                type="file"
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                disabled={uploading}
                onChange={() => {
                  setStatus("");
                  setUploadedFile(null);
                }}
              />
            </div>

            <Button
              onClick={handleUpload}
              loading={uploading}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? "上传中..." : "上传文件"}
            </Button>

            {status && (
              <div
                className={`p-3 rounded-lg text-sm ${
                  status.includes("✅")
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : status.includes("❌")
                      ? "bg-red-50 text-red-800 border border-red-200"
                      : "bg-blue-50 text-blue-800 border border-blue-200"
                }`}
              >
                {status}
              </div>
            )}

            {uploadedFile && (
              <div className="border-t pt-4 space-y-3">
                <div className="text-sm text-gray-600">
                  <p>
                    <span className="font-medium">文件名：</span>
                    {uploadedFile.filename}
                  </p>
                  <p className="mt-1">
                    <span className="font-medium">文件 ID：</span>
                    {uploadedFile.id}
                  </p>
                </div>

                <Button onClick={handleStartChat} variant="primary" className="w-full">
                  开始对话学习 →
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* 上传历史 */}
        {uploadHistory.length > 0 && (
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">📚 最近上传</h3>
                <button
                  onClick={() => {
                    if (confirm('确定要清空所有上传历史吗？')) {
                      UploadStorage.clearUploadHistory();
                      setUploadHistory([]);
                    }
                  }}
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
                        onClick={() => handleContinueWithFile(record)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                      >
                        继续学习
                      </button>
                      <button
                        onClick={() => handleDeleteRecord(record.id)}
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
        )}

        <Card>
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">💡 使用提示</h3>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>支持的文件格式：PDF, TXT, DOC, DOCX</li>
              <li>上传成功后点击"开始对话学习"</li>
              <li>AI 会根据你的文件内容提供学习帮助</li>
              <li>提供渐进式提示，帮助你独立思考</li>
              <li>上传记录会自动保存，刷新页面不会丢失</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
