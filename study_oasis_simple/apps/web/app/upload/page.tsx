"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Layout } from "../components/Layout";

export default function UploadPage() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    filename: string;
    url: string;
  } | null>(null);
  const router = useRouter();

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus("请选择一个文件");
      return;
    }

    console.log("选中文件：", file.name, file.type, file.size, "bytes");
    setStatus(`正在上传：${file.name}...`);
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);

    try {
      const res = await fetch("http://localhost:4000/upload", {
        method: "POST",
        body: fd,
      });

      if (!res.ok) {
        throw new Error(`上传失败: ${res.statusText}`);
      }

      const json = await res.json();
      console.log("后端返回：", json);
      setUploadedFile(json);
      setStatus(`✅ 上传成功！文件：${json.filename}`);
    } catch (err) {
      console.error("上传错误：", err);
      setStatus(`❌ 上传失败：${err instanceof Error ? err.message : "未知错误"}`);
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

        <Card>
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">💡 使用提示</h3>
            <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
              <li>支持的文件格式：PDF, TXT, DOC, DOCX</li>
              <li>上传成功后点击"开始对话学习"</li>
              <li>AI 会根据你的文件内容提供学习帮助</li>
              <li>提供渐进式提示，帮助你独立思考</li>
            </ul>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
