import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Message } from '../components/MessageBubble';
import { ApiClient, ApiError } from '../../../lib/api-client';
import { ChatStorage } from '../../../lib/storage';

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
  const abortControllerRef = useRef<AbortController | null>(null);

  // 从 URL 获取文件信息
  const fileId = searchParams.get('fileId');
  const filename = searchParams.get('filename');
  const fileUrl = searchParams.get('fileUrl') || undefined;

  // 加载历史会话
  useEffect(() => {
    if (sessionLoaded) return;

    try {
      let session = null;

      if (fileId) {
        session = ChatStorage.getSessionByFileId(fileId);
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
        console.log(`已加载 ${session.messages.length} 条历史消息`);
      }
    } catch (e) {
      console.error('加载会话失败:', e);
    } finally {
      setSessionLoaded(true);
    }
  }, [fileId, sessionLoaded]);

  // 保存会话到 localStorage
  useEffect(() => {
    if (!sessionLoaded) return;
    if (messages.length === 0) return;

    try {
      ChatStorage.saveSession(
        {
          fileId: fileId || undefined,
          filename: filename || undefined,
          messages,
        },
        undefined,
        conversationId || undefined
      );
    } catch (e) {
      console.error('保存会话失败:', e);
    }
  }, [messages, fileId, filename, sessionLoaded, conversationId]);

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
        let fullResponse = '';
        let lastConversationId = conversationId || undefined;
        
        // 添加一个占位符消息
        const placeholderMessage: Message = {
          role: 'assistant',
          content: '',
          hintLevel: undefined,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, placeholderMessage]);
        const messageIndex = messages.length + 1; // 指向新添加的 AI 消息

        try {
          const stream = ApiClient.chatStream({
            message: content,
            conversationHistory,
            uploadId: uploadId || undefined,
            conversationId: conversationId || undefined,
          });

          for await (const chunk of stream) {
            fullResponse += chunk.token || '';

            // 更新消息内容
            setMessages((prev) => {
              const updated = [...prev];
              if (updated[messageIndex]) {
                updated[messageIndex] = {
                  ...updated[messageIndex],
                  content: fullResponse,
                };
              }
              return updated;
            });
          }

          // 更新消息，标记为完成
          setMessages((prev) => {
            const updated = [...prev];
            if (updated[messageIndex]) {
              updated[messageIndex] = {
                ...updated[messageIndex],
                conversationId: lastConversationId,
              };
            }
            return updated;
          });

          // 流式响应完成后保存 conversationId
          if (!conversationId && lastConversationId) {
            setConversationId(lastConversationId);
          }
        } catch (err) {
          // 移除占位符消息
          setMessages((prev) => prev.slice(0, -1));
          throw err;
        }
      } else {
        // 普通请求
        const data = await retryWithBackoff(() =>
          ApiClient.chat({
            message: content,
            conversationHistory,
            uploadId: uploadId || undefined,
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
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

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
      console.log('开始上传文件:', file.name);
      const uploadResponse = await ApiClient.uploadFile(file);
      const newUploadId = uploadResponse.id;
      setUploadId(newUploadId);

      // 3. 添加"已上传文件"消息
      const systemMessage: Message = {
        role: 'user',
        content: `[系统] 已上传文档: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, systemMessage]);

      // 4. 轮询 OCR 完成状态
      let ocrResult = null;
      let attempts = 0;
      const maxAttempts = 60; // 最多 5 分钟（每 5 秒查询一次）
      const pollInterval = 5000; // 5 秒

      console.log('开始轮询 OCR 结果...');
      while (attempts < maxAttempts) {
        try {
          ocrResult = await ApiClient.getOcrResult(newUploadId);
          if (ocrResult.status === 'completed') {
            console.log('OCR 处理完成:', ocrResult);
            break;
          } else if (ocrResult.status === 'failed') {
            throw new Error(`OCR 处理失败: ${ocrResult.error || '未知错误'}`);
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
      const ocrSummary = ocrResult.text
        ? `${ocrResult.text.slice(0, 200)}${ocrResult.text.length > 200 ? '...' : ''}`
        : '无法识别文本';

      const ocrMessage: Message = {
        role: 'assistant',
        content: `✅ 文档已识别完成\n\n**识别信息**\n- 页数: ${ocrResult.pageCount || 1}\n- 语言: ${ocrResult.language || '未识别'}\n- 置信度: ${((ocrResult.confidence || 0) * 100).toFixed(1)}%\n\n**文本预览**\n${ocrSummary}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, ocrMessage]);

      console.log('文件上传并 OCR 处理完成');
    } catch (err) {
      let errorMessage = '文件处理失败，请重试';

      if (err instanceof ApiError) {
        errorMessage = `上传失败 (${err.statusCode}): ${err.message}`;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      console.error('文件处理错误:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('确定要清空当前对话吗？此操作不可恢复。')) {
      setMessages([]);
      setError(null);
      if (fileId) {
        const session = ChatStorage.getSessionByFileId(fileId);
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
        setError(null);
        console.log(`已加载对话: ${session.filename || '普通对话'}`);
      }
    } catch (e) {
      console.error('加载对话失败:', e);
      setError('加载对话失败');
    }
  };

  const handleClearAllConversations = () => {
    setMessages([]);
    setConversationId(null);
    setUploadId(null);
    setError(null);
    setShowDocument(true);
    console.log('已清空当前对话');
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
    fileUrl,
    filename,
    conversationId,
    uploadId,
    handleSend,
    handleFileSelect,
    handleClearChat,
    handleToggleDocument,
    handleSelectConversation,
    handleClearAllConversations,
  };
}
