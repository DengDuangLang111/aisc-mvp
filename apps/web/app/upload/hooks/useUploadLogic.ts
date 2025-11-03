import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiClient, ApiError } from "../../../lib/api-client";
import { UploadStorage, UploadRecord } from "../../../lib/storage";
import { logger } from '../../../lib/logger';

export function useUploadLogic() {
  const [status, setStatus] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    filename: string;
    url: string;
    // 后端返回的数据库文档 ID（用于查询 OCR /document 接口）
    documentId?: string;
  } | null>(null);
  const [uploadHistory, setUploadHistory] = useState<UploadRecord[]>([]);
  const router = useRouter();

  // 加载上传历史
  useEffect(() => {
    const history = UploadStorage.getUploadHistory();
    setUploadHistory(history);
  }, []);

  async function handleUpload(file: File) {
    logger.debug("选中文件", { name: file.name, type: file.type, size: file.size });
    setStatus(`正在上传：${file.name}...`);
    setUploading(true);

    try {
      const result = await ApiClient.uploadFile(file);
      logger.info("上传成功", { result: result });

      // 保存到 localStorage
      const uploadRecord: UploadRecord = {
        // 保持本地历史使用上传 id（result.id），不影响 documentId 的存储
        id: result.id,
        documentId: (result as any).documentId || result.id,
        filename: result.filename,
        url: result.url,
        uploadedAt: Date.now(),
        fileSize: file.size,
        fileType: file.type,
      };
      UploadStorage.saveUpload(uploadRecord);

      // 更新状态
      // 保留返回的 documentId（如果有）以便后续访问 OCR/文档接口
      setUploadedFile({
        id: result.id,
        filename: result.filename,
        url: result.url,
        documentId: (result as any).documentId,
      });
      setUploadHistory(UploadStorage.getUploadHistory());
      setStatus(`✅ 上传成功！文件：${result.filename}`);
    } catch (err) {
      logger.error("上传错误", err, {});
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
      // 使用 documentId 优先（若后端返回了 documentId），否则回退到上传 id（兼容旧实现）
      const docId = uploadedFile.documentId || uploadedFile.id;
      const params = new URLSearchParams();
      params.set('documentId', docId);
      params.set('filename', uploadedFile.filename);
      if (uploadedFile.url) {
        params.set('fileUrl', uploadedFile.url);
      }
      router.push(`/chat?${params.toString()}`);
    } else {
      router.push('/chat');
    }
  }

  function handleContinueWithFile(record: UploadRecord) {
    // 使用 documentId 参数，后端会自动加载 OCR 结果作为上下文
    const docId = record.documentId || record.id;
    const params = new URLSearchParams();
    params.set('documentId', docId);
    params.set('filename', record.filename);
    if (record.url) {
      params.set('fileUrl', record.url);
    }
    router.push(`/chat?${params.toString()}`);
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
