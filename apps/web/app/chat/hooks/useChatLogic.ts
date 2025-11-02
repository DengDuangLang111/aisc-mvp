import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Message } from '../components/MessageBubble';
import { ApiClient, ApiError } from '../../../lib/api-client';
import { ChatStorage } from '../../../lib/storage';

export function useChatLogic() {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDocument, setShowDocument] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  // 从 URL 获取文件信息
  const fileId = searchParams.get('fileId');
  const filename = searchParams.get('filename');
  const fileUrl = fileId && filename
    ? ApiClient.buildFileUrl(fileId, filename.split('.').pop() || 'txt')
    : undefined;

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
      ChatStorage.saveSession({
        fileId: fileId || undefined,
        filename: filename || undefined,
        messages,
      });
    } catch (e) {
      console.error('保存会话失败:', e);
    }
  }, [messages, fileId, filename, sessionLoaded]);

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const data = await ApiClient.chat({
        message: content,
        conversationHistory,
        uploadId: fileId || undefined,
      });

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply,
        hintLevel: data.hintLevel,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`发送失败 (${err.statusCode}): ${err.message}`);
      } else {
        setError('发送消息失败，请重试');
      }
      console.error('Chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    if (confirm('确定要清空当前对话吗？此操作不可恢复。')) {
      setMessages([]);
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

  return {
    messages,
    isLoading,
    error,
    showDocument,
    fileUrl,
    filename,
    handleSend,
    handleClearChat,
    handleToggleDocument,
  };
}
