"use client";

import { Layout } from "../components/Layout";
import { ImageUploadForm } from "./components/ImageUploadForm";
import { OcrResultDisplay } from "./components/OcrResultDisplay";
import { OcrHistory } from "./components/OcrHistory";
import { useOcrLogic } from "./hooks/useOcrLogic";

export default function OcrPage() {
  const {
    uploading,
    processing,
    uploadedImage,
    ocrResult,
    ocrHistory,
    handleUpload,
    handleRetryOcr,
    handleCopyText,
    handleStartChat,
    handleClearResult,
    handleDeleteHistory,
    handleClearAllHistory,
  } = useOcrLogic();

  return (
    <Layout maxWidth="4xl">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📸 OCR 图片识别</h1>
          <p className="mt-2 text-gray-600">
            上传图片，自动识别文字内容（支持 JPG、PNG、PDF）
          </p>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Upload Form */}
          <div className="space-y-6">
            <ImageUploadForm
              uploading={uploading}
              processing={processing}
              uploadedImage={uploadedImage}
              onUpload={handleUpload}
              onClear={handleClearResult}
            />

            {/* History in left column on mobile */}
            <div className="lg:hidden">
              <OcrHistory
                history={ocrHistory}
                onDelete={handleDeleteHistory}
                onClearAll={handleClearAllHistory}
              />
            </div>
          </div>

          {/* Right Column: OCR Result */}
          <div>
            <OcrResultDisplay
              result={ocrResult}
              processing={processing}
              onRetry={handleRetryOcr}
              onCopy={handleCopyText}
              onStartChat={handleStartChat}
            />
          </div>
        </div>

        {/* History in right column on desktop */}
        <div className="hidden lg:block">
          <OcrHistory
            history={ocrHistory}
            onDelete={handleDeleteHistory}
            onClearAll={handleClearAllHistory}
          />
        </div>
      </div>
    </Layout>
  );
}
