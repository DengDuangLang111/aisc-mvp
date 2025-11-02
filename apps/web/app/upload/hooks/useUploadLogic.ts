import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiClient, ApiError } from "../../../lib/api-client";
import { UploadStorage, UploadRecord } from "../../../lib/storage";

export function useUploadLogic() {
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

  async function handleUpload(file: File) {
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

  function handleClearHistory() {
    if (confirm('确定要清空所有上传历史吗？')) {
      UploadStorage.clearUploadHistory();
      setUploadHistory([]);
    }
  }

  function handleFileChange() {
    setStatus("");
    setUploadedFile(null);
  }

  return {
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
  };
}
