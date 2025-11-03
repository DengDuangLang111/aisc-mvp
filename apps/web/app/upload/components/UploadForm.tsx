import { useId, useRef } from "react";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

interface UploadFormProps {
  uploading: boolean;
  status: string;
  uploadedFile: {
    id: string;
    filename: string;
    url: string;
  } | null;
  onUpload: (file: File) => Promise<void>;
  onStartChat: () => void;
  onFileChange: () => void;
}

export function UploadForm({
  uploading,
  status,
  uploadedFile,
  onUpload,
  onStartChat,
  onFileChange,
}: UploadFormProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const inputId = useId();

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (file) {
      await onUpload(file);
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium text-gray-700 mb-2"
            htmlFor={inputId}
          >
            选择文件
          </label>
          <input
            ref={fileRef}
            type="file"
            id={inputId}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
            disabled={uploading}
            onChange={onFileChange}
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
            <span>{status}</span>
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

            <Button onClick={onStartChat} variant="primary" className="w-full">
              开始对话学习 →
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
