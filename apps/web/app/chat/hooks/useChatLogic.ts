import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom'; // 方案8: 使用 flushSync 强制同步刷新
import { useSearchParams } from 'next/navigation';
import { Message } from '../components/MessageBubble';
import { ApiClient, ApiError } from '../../../lib/api-client';
import { ChatStorage } from '../../../lib/storage';
import { logger } from '../../../lib/logger';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function useChatLogic() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(null); // 当前文档 ID
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // 方案7: 分离流式状态 - 用单独的 state 存储流式内容
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // AI 思考中（还没返回第一个字）

  // 从 URL 获取文件信息
  const fileId = searchParams.get('fileId');
  const documentId = searchParams.get('documentId'); // 新增：支持 documentId
  const filenameParam = searchParams.get('filename') || undefined;
  const fileUrlParam = searchParams.get('fileUrl') || undefined;
  const initialMessageParam = searchParams.get('initialMessage');
  const [documentFilename, setDocumentFilename] = useState<string | undefined>(filenameParam);
  const [documentUrl, setDocumentUrl] = useState<string | undefined>(fileUrlParam);
  const initialPromptRef = useRef<{ value: string | null; sent: boolean }>({ value: null, sent: false });

  const urlDocumentId = documentId || fileId;
  // 优先使用当前会话中的 documentId，其次回退到 URL 参数，最后兼容旧的 fileId
  const effectiveDocumentId = currentDocumentId || urlDocumentId;

  // 记录初始消息参数，用于自动触发首条消息
  useEffect(() => {
    initialPromptRef.current = {
      value: initialMessageParam,
      sent: false,
    };
  }, [initialMessageParam]);

  // 同步 URL 参数中的文件元信息
  useEffect(() => {
    if (filenameParam && filenameParam !== documentFilename) {
      setDocumentFilename(filenameParam);
    }
  }, [filenameParam, documentFilename]);

  useEffect(() => {
    if (fileUrlParam && fileUrlParam !== documentUrl) {
      setDocumentUrl(fileUrlParam);
    }
  }, [fileUrlParam, documentUrl]);

  // 初始化 documentId state
  useEffect(() => {
    if (urlDocumentId && !currentDocumentId) {
      setCurrentDocumentId(urlDocumentId);
    }
  }, [urlDocumentId, currentDocumentId]);

  // 加载历史会话
  useEffect(() => {
    if (sessionLoaded) return;

    try {
      let session = null;

      if (effectiveDocumentId) {
        session = ChatStorage.getSessionByFileId(effectiveDocumentId);
      } else {
        const allSessions = ChatStorage.getAllSessions();
        session = allSessions.find(s => !s.fileId) || null;
      }

      if (session && session.messages.length > 0) {
        setMessages(session.messages);
        // 从最后一条消息中恢复 conversationId（如果有）
        const lastMsg = session.messages[session.messages.length - 1];
        if (lastMsg && 'conversationId' in lastMsg) {
          setConversationId((lastMsg as any).conversationId);
        }
        logger.debug('已加载历史消息', { count: session.messages.length });
      }
    } catch (e) {
      logger.error('加载会话失败', e, {});
    } finally {
      setSessionLoaded(true);
    }
  }, [effectiveDocumentId, sessionLoaded]);

  // 保存会话到 localStorage
  useEffect(() => {
    if (!sessionLoaded) return;
    if (messages.length === 0) return;

    try {
      ChatStorage.saveSession(
        {
          fileId: effectiveDocumentId || undefined,
          filename: documentFilename,
          messages,
        },
        undefined,
        conversationId || undefined
      );
    } catch (e) {
      logger.error('保存会话失败', e, {});
    }
  }, [messages, effectiveDocumentId, documentFilename, sessionLoaded, conversationId]);

  // 重试逻辑
  const retryWithBackoff = async <T,>(
    fn: () => Promise<T>,
    attempt = 0
  ): Promise<T> => {
    try {
      return await fn();
    } catch (err) {
      if (attempt < MAX_RETRIES && (err instanceof ApiError && err.statusCode >= 500)) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * Math.pow(2, attempt)));
        return retryWithBackoff(fn, attempt + 1);
      }
      throw err;
    }
  };

  const handleSend = async (content: string, options?: { conversationId?: string; streaming?: boolean }) => {
    // Cancel previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const { streaming = true } = options || {};

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // 构建对话历史（所有之前的消息）
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      if (streaming) {
        // 流式请求
        logger.debug('[Streaming] Starting stream request');
        let fullResponse = '';
        let lastConversationId = conversationId || undefined;
        
        // 方案10: 初始化流式状态
        setStreamingContent(''); // 立即显示空的流式消息框
        setIsStreaming(true);
        setIsThinking(true); // 🧠 开始思考状态

        try {
          const stream = ApiClient.chatStream({
            message: content,
            conversationHistory,
            documentId: currentDocumentId || undefined, // 使用 documentId
            conversationId: conversationId || undefined,
          });
          logger.debug('[Streaming] Stream created, starting to read chunks');

          // 方案10: 使用 requestAnimationFrame 确保每次更新都在新的渲染帧
          // FORCE RELOAD - 强制浏览器加载新代码
          let chunkCount = 0;
          
          for await (const chunk of stream) {
            fullResponse += chunk.token || '';
            chunkCount++;
            logger.debug('[Streaming] Chunk received', { token: chunk.token, responseLength: fullResponse.length });

            // 收到第一个 chunk，取消思考状态
            if (chunkCount === 1) {
              setIsThinking(false);
            }

            // 保存 conversationId（如果有）
            if (chunk.conversationId) {
              lastConversationId = chunk.conversationId;
            }

            // 🔥 简化版：移除节流，每个 chunk 都立即更新
            const currentContent = fullResponse;
            logger.debug('[RAF] Updating UI', { contentLength: currentContent.length });
            
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => {
                setStreamingContent(currentContent);
                logger.debug('[RAF] UI updated');
                resolve();
              });
            });

            // 检查是否完成
            if (chunk.complete) {
              logger.info('[Streaming] Stream complete');
              break;
            }
          }

          // 方案7: 流式完成后，将内容添加到 messages
          setIsStreaming(false);
          setIsThinking(false); // 确保思考状态关闭
          const assistantMessage: Message = {
            role: 'assistant',
            content: fullResponse,
            hintLevel: undefined,
            timestamp: Date.now(),
            conversationId: lastConversationId,
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setStreamingContent(''); // 清空流式内容

          // 流式响应完成后保存 conversationId
          if (!conversationId && lastConversationId) {
            setConversationId(lastConversationId);
          }
        } catch (err) {
          setIsStreaming(false);
          setIsThinking(false); // 错误时也关闭思考状态
          setStreamingContent('');
          throw err;
        }
      } else {
        // 普通请求
        const data = await retryWithBackoff(() =>
          ApiClient.chat({
            message: content,
            conversationHistory,
            documentId: currentDocumentId || undefined, // 使用 documentId
            conversationId: conversationId || undefined,
          })
        );

        // 更新 conversationId（如果是新的）
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: data.reply,
          hintLevel: data.hintLevel,
          timestamp: data.timestamp,
          conversationId: data.conversationId,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (err) {
      let errorMessage = '发送消息失败，请重试';
      
      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          errorMessage = '请求过于频繁，请稍后再试';
        } else if (err.statusCode >= 500) {
          errorMessage = '服务器错误，已自动重试';
        } else {
          errorMessage = `发送失败 (${err.statusCode}): ${err.message}`;
        }
      } else if (err instanceof Error && err.name === 'AbortError') {
        errorMessage = '请求已取消';
      }
      
      setError(errorMessage);
      
      // Remove last user message on error
      setMessages((prev) => prev.slice(0, -1));
      logger.error('Chat error', err, {});
    } finally {
      setIsLoading(false);
    }
  };

  // 自动发送初始消息（仅当无历史消息时）
  useEffect(() => {
    if (!sessionLoaded) return;
    const initial = initialPromptRef.current;
    if (!initial.value || initial.sent) return;
    if (messages.length > 0) return;

    initial.sent = true;
    handleSend(initial.value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, sessionLoaded]);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setIsLoading(true);
    
    try {
      // 1. 验证文件
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setError('文件过大，请选择不超过 50MB 的文件');
        return;
      }

      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'image/jpeg',
        'image/png',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setError('不支持该文件类型，请上传 PDF、文本、图片或 Word 文档');
        return;
      }

      // 2. 上传文件
      logger.info('开始上传文件', { filename: file.name });
      const uploadResponse = await ApiClient.uploadFile(file);
      // 后端返回 { id, filename, url, documentId? }
      // documentId 是数据库中的文档 id，用于查询 OCR 结果；如果不存在则回退到 upload id
      const newDocumentId = (uploadResponse as any).documentId || uploadResponse.id;
      setUploadId(newDocumentId);
      setCurrentDocumentId(newDocumentId);
      setDocumentFilename(uploadResponse.filename);
      setDocumentUrl(uploadResponse.url);

      // 更新浏览器地址栏，便于刷新后保留上下文
      try {
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          url.searchParams.set('documentId', newDocumentId);
          if (uploadResponse.filename) {
            url.searchParams.set('filename', uploadResponse.filename);
          }
          if (uploadResponse.url) {
            url.searchParams.set('fileUrl', uploadResponse.url);
          } else {
            url.searchParams.delete('fileUrl');
          }
          window.history.replaceState(null, '', url.toString());
        }
      } catch (historyError) {
        logger.warn('更新聊天地址栏失败', { error: historyError });
      }

      // 3. 添加"已上传文件"消息
      const systemMessage: Message = {
        role: 'user',
        content: `[系统] 已上传文档: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);

      // 4. 轮询 OCR 完成状态
      let ocrResult: any = null;
      let attempts = 0;
      const maxAttempts = 60; // 最多 5 分钟（每 5 秒查询一次）
      const pollInterval = 5000; // 5 秒

      logger.info('开始轮询 OCR 结果', { documentId: newDocumentId });
      while (attempts < maxAttempts) {
        try {
          const result = await ApiClient.getOcrResult(newDocumentId);
          if (result && result.fullText) {
            ocrResult = result;
            logger.info('OCR 处理完成', { result });
            break;
          }
        } catch (err) {
          // 如果是 404，表示还在处理中，继续轮询
          if (!(err instanceof ApiError && err.statusCode === 404)) {
            throw err;
          }
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }
      }

      if (attempts >= maxAttempts) {
        throw new Error('OCR 处理超时，请稍后重试');
      }

      // 5. 显示 OCR 结果
      if (!ocrResult) {
        throw new Error('未能获取 OCR 结果，请稍后重试');
      }

      const fullText: string = ocrResult.fullText || '';
      const ocrSummary = fullText
        ? `${fullText.slice(0, 200)}${fullText.length > 200 ? '...' : ''}`
        : '无法识别文本';

      const confidenceValue = typeof ocrResult.confidence === 'number'
        ? (ocrResult.confidence > 1 ? ocrResult.confidence : ocrResult.confidence * 100)
        : null;
      const confidenceText = confidenceValue !== null
        ? `${Math.min(100, Math.max(0, confidenceValue)).toFixed(1)}%`
        : '未提供';
      const pageCount = typeof ocrResult.pageCount === 'number' && ocrResult.pageCount > 0
        ? ocrResult.pageCount
        : 1;

      const ocrMessage: Message = {
        role: 'assistant',
        content: `✅ 文档已识别完成\n\n**识别信息**\n- 页数: ${pageCount}\n- 语言: ${ocrResult.language || '未识别'}\n- 置信度: ${confidenceText}\n\n**文本预览**\n${ocrSummary}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, ocrMessage]);

      logger.info('文件上传并 OCR 处理完成');
    } catch (err) {
      let errorMessage = '文件处理失败，请重试';

      if (err instanceof ApiError) {
        errorMessage = `上传失败 (${err.statusCode}): ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      logger.error('文件处理错误', err, {});
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('确定要清空当前对话吗？此操作不可恢复。')) {
      setMessages([]);
      setError(null);
      const targetId = currentDocumentId || effectiveDocumentId;
      if (targetId) {
        const session = ChatStorage.getSessionByFileId(targetId);
        if (session) {
          ChatStorage.deleteSession(session.id);
        }
      }
    }
  };

  const handleToggleDocument = () => {
    setShowDocument(!showDocument);
  };

  const handleSelectConversation = (sessionId: string) => {
    try {
      const session = ChatStorage.getSessionById(sessionId);
      if (session) {
        setMessages(session.messages);
        setConversationId(session.conversationId || null);
        setCurrentDocumentId(session.fileId || null);
        setUploadId(session.fileId || null);
        setDocumentFilename(session.filename || undefined);
        setDocumentUrl(undefined);
        setError(null);
        logger.info('已加载对话', { filename: session.filename || '普通对话' });
      }
    } catch (e) {
      logger.error('加载对话失败', e, {});
      setError('加载对话失败');
    }
  };

  const handleClearAllConversations = () => {
    setMessages([]);
    setConversationId(null);
    setUploadId(null);
    setCurrentDocumentId(null);
    setError(null);
    setShowDocument(true);
    logger.info('已清空当前对话');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    messages,
    isLoading,
    error,
    showDocument,
  fileUrl: documentUrl,
  filename: documentFilename,
    conversationId,
    uploadId,
    streamingContent, // 方案7: 导出流式内容
    isStreaming, // 方案7: 导出流式状态
    isThinking, // 🧠 导出思考状态
    handleSend,
    handleFileSelect,
    handleClearChat,
    handleToggleDocument,
    handleSelectConversation,
    handleClearAllConversations,
  };
}
