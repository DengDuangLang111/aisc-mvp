import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ApiClient, ApiError } from "../../../lib/api-client";
import { logger } from '../../../lib/logger';

export interface OcrResult {
  fullText: string;
  confidence: number;
  language: string;
  pageCount: number;
  structuredData?: any;
}

export interface UploadedImage {
  id: string;
  documentId?: string;
  filename: string;
  url: string;
  previewUrl?: string; // Data URL for local preview
}

export interface OcrHistoryItem {
  id: string;
  documentId?: string;
  filename: string;
  uploadedAt: number;
  text: string;
  confidence: number;
  language: string;
}

const STORAGE_KEY = "study_oasis_ocr_history";
const MAX_HISTORY = 20;

export function useOcrLogic() {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(
    null
  );
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrHistory, setOcrHistory] = useState<OcrHistoryItem[]>([]);
  const router = useRouter();

  // Load history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: OcrHistoryItem[] = JSON.parse(stored);
        setOcrHistory(
          parsed.map((item) => ({
            ...item,
            documentId: item.documentId || item.id,
          }))
        );
      }
    } catch (error) {
      logger.error("Failed to load OCR history", error, {});
    }
  }, []);

  // Save to history
  const saveToHistory = useCallback(
    (image: UploadedImage, result: OcrResult) => {
      const documentId = image.documentId || image.id;
      const item: OcrHistoryItem = {
        id: documentId,
        documentId,
        filename: image.filename,
        uploadedAt: Date.now(),
        text: result.fullText,
        confidence: result.confidence,
        language: result.language,
      };

      const newHistory = [item, ...ocrHistory]
        .filter(
          (h, index, self) => {
            const key = h.documentId || h.id;
            return index === self.findIndex((t) => (t.documentId || t.id) === key);
          }
        )
        .slice(0, MAX_HISTORY);

      setOcrHistory(newHistory);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
    },
    [ocrHistory]
  );

  // Handle file upload
  const handleUpload = async (file: File) => {
    setUploading(true);
    setOcrResult(null);

    try {
      // Create preview URL for images
      let previewUrl: string | undefined;
      if (file.type.startsWith("image/")) {
        previewUrl = URL.createObjectURL(file);
      }

      // Upload file
      const uploadResponse = await ApiClient.uploadFile(file);
      logger.info("Upload successful", { uploadResponse });

      const documentId = (uploadResponse as any).documentId || uploadResponse.id;

      const image: UploadedImage = {
        id: uploadResponse.id,
        documentId,
        filename: uploadResponse.filename,
        url: uploadResponse.url,
        previewUrl,
      };
      setUploadedImage(image);

      // Start fetching OCR result
      await fetchOcrResult(documentId, image);
    } catch (error) {
      logger.error("Upload failed", error, {});
      alert(
        `上传失败: ${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setUploading(false);
    }
  };

  // Fetch OCR result with polling
  const fetchOcrResult = async (
    documentId: string,
    image: UploadedImage,
    maxRetries = 20
  ) => {
    setProcessing(true);

    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          const result = await ApiClient.getOcrResult(documentId);
          logger.info(`OCR result (attempt ${i + 1})`, { result });

          if (result && result.fullText) {
            setOcrResult(result);
            saveToHistory(image, result);
            setProcessing(false);
            return;
          }
        } catch (error) {
          // If 404, OCR is still processing
          if (error instanceof ApiError && error.statusCode === 404) {
            logger.debug(`OCR still processing (attempt ${i + 1}/${maxRetries})`);
          } else {
            throw error;
          }
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      throw new Error("OCR 处理超时，请稍后重试");
    } catch (error) {
      logger.error("OCR failed", error, {});
      alert(`OCR 识别失败: ${error instanceof Error ? error.message : "未知错误"}`);
      setProcessing(false);
    }
  };

  // Retry OCR
  const handleRetryOcr = async () => {
    if (!uploadedImage) return;
    const documentId = uploadedImage.documentId || uploadedImage.id;
    await fetchOcrResult(documentId, uploadedImage);
  };

  // Copy text to clipboard
  const handleCopyText = () => {
    if (!ocrResult?.fullText) return;

    navigator.clipboard
      .writeText(ocrResult.fullText)
      .then(() => {
        alert("✅ 文字已复制到剪贴板");
      })
      .catch((error) => {
        logger.error("Copy failed", error, {});
        alert("复制失败，请手动选择文字复制");
      });
  };

  // Start chat with OCR text
  const handleStartChat = () => {
    if (!uploadedImage || !ocrResult) return;

    const documentId = uploadedImage.documentId || uploadedImage.id;

    // Navigate to chat with pre-filled message
    const preview = ocrResult.fullText.slice(0, 500);
    const message = `这是一张图片的文字内容：\n\n${preview}${ocrResult.fullText.length > 500 ? '...' : ''}`;

    const params = new URLSearchParams();
    params.set('documentId', documentId);
    params.set('filename', uploadedImage.filename);
    params.set('fileUrl', uploadedImage.url);
    params.set('initialMessage', message);

    router.push(`/chat?${params.toString()}`);
  };

  // Clear current result
  const handleClearResult = () => {
    if (uploadedImage?.previewUrl) {
      URL.revokeObjectURL(uploadedImage.previewUrl);
    }
    setUploadedImage(null);
    setOcrResult(null);
    setProcessing(false);
  };

  // Delete history item
  const handleDeleteHistory = (id: string) => {
    const newHistory = ocrHistory.filter((item) => (item.documentId || item.id) !== id);
    setOcrHistory(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  };

  // Clear all history
  const handleClearAllHistory = () => {
    if (confirm("确定要清空所有 OCR 历史记录吗？")) {
      setOcrHistory([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return {
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
  };
}
