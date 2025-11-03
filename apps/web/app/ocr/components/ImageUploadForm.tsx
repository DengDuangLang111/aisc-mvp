import { useRef, useState } from "react";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import type { UploadedImage } from "../hooks/useOcrLogic";

interface ImageUploadFormProps {
  uploading: boolean;
  processing: boolean;
  uploadedImage: UploadedImage | null;
  onUpload: (file: File) => Promise<void>;
  onClear: () => void;
}

export function ImageUploadForm({
  uploading,
  processing,
  uploadedImage,
  onUpload,
  onClear,
}: ImageUploadFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(file);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      alert("只支持 JPG、PNG 和 PDF 格式");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert("文件大小不能超过 10MB");
      return;
    }

    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUploadClick = async () => {
    if (selectedFile) {
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleClearClick = () => {
    onClear();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">上传图片</h2>

        {/* Drag and Drop Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? "border-blue-500 bg-blue-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400"
          } ${uploading || processing ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg,application/pdf"
            onChange={handleInputChange}
            disabled={uploading || processing}
            className="hidden"
          />

          <div className="space-y-3">
            <div className="text-5xl">📸</div>
            <div>
              <p className="text-base font-medium text-gray-700">
                {dragActive ? "松开以上传文件" : "拖拽图片到这里"}
              </p>
              <p className="text-sm text-gray-500 mt-1">或</p>
            </div>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || processing}
              variant="secondary"
            >
              选择文件
            </Button>
            <p className="text-xs text-gray-500">
              支持 JPG、PNG、PDF 格式，最大 10MB
            </p>
          </div>
        </div>

        {/* Selected File Info */}
        {selectedFile && !uploadedImage && (
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-blue-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button onClick={handleUploadClick} loading={uploading} size="sm">
              {uploading ? "上传中..." : "开始上传"}
            </Button>
          </div>
        )}

        {/* Uploaded Image Preview */}
        {uploadedImage && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">已上传图片</p>
              <Button onClick={handleClearClick} variant="secondary" size="sm">
                重新上传
              </Button>
            </div>

            {uploadedImage.previewUrl && (
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={uploadedImage.previewUrl}
                  alt={uploadedImage.filename}
                  className="w-full h-auto max-h-96 object-contain bg-gray-100"
                />
              </div>
            )}

            <div className="text-sm text-gray-600">
              <p className="font-medium truncate">{uploadedImage.filename}</p>
              <p className="text-xs text-gray-500 mt-1">ID: {uploadedImage.id}</p>
            </div>

            {/* Processing Status */}
            {processing && (
              <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="animate-spin h-4 w-4 border-2 border-yellow-600 border-t-transparent rounded-full"></div>
                <span className="text-sm text-yellow-800">🧠 AI 正在识别文字中...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
