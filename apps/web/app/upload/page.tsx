"use client";

import { Layout } from "../components/Layout";
import { UploadForm } from "./components/UploadForm";
import { UploadHistory } from "./components/UploadHistory";
import { UploadTips } from "./components/UploadTips";
import { useUploadLogic } from "./hooks/useUploadLogic";

export default function UploadPage() {
  const {
    status,
    uploading,
    uploadedFile,
    uploadHistory,
    handleUpload,
    handleStartChat,
    handleContinueWithFile,
    handleDeleteRecord,
    handleClearHistory,
    handleFileChange,
  } = useUploadLogic();

  return (
    <Layout maxWidth="md">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">上传学习材料</h1>
          <p className="mt-2 text-gray-600">上传文件后，可以开始对话学习</p>
        </div>

        <UploadForm
          uploading={uploading}
          status={status}
          uploadedFile={uploadedFile}
          onUpload={handleUpload}
          onStartChat={handleStartChat}
          onFileChange={handleFileChange}
        />

        <UploadHistory
          uploadHistory={uploadHistory}
          onContinueWithFile={handleContinueWithFile}
          onDeleteRecord={handleDeleteRecord}
          onClearHistory={handleClearHistory}
        />

        <UploadTips />
      </div>
    </Layout>
  );
}
