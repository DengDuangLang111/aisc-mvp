'use client'

import { Suspense, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatError } from './components/ChatError';
import { ChatLayout } from './components/ChatLayout';
import { FocusMode } from './components/FocusMode';
import { useChatLogic } from './hooks/useChatLogic';

function ChatPageContent() {
  const [focusModeActive, setFocusModeActive] = useState(false);
  
  const {
    messages,
    isLoading,
    error,
    showDocument,
    fileUrl,
    filename,
    conversationId,
    uploadId,
    streamingContent, // 方案7: 获取流式内容
    isStreaming, // 方案7: 获取流式状态
    isThinking, // 🧠 获取思考状态
    handleSend,
    handleFileSelect,
    handleClearChat,
    handleToggleDocument,
    handleSelectConversation,
    handleClearAllConversations,
  } = useChatLogic();

  // 自动启动 Focus Mode（当有消息时）
  // useEffect(() => {
  //   if (messages.length > 0 && !focusModeActive) {
  //     setFocusModeActive(true);
  //   }
  // }, [messages.length]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Focus Mode Bar (fixed at top when active) */}
      <FocusMode 
        isActive={focusModeActive} 
        onToggle={() => setFocusModeActive(false)}
        documentId={uploadId || undefined}
        conversationId={conversationId || undefined}
      />
      
      {/* Header */}
      <div className={focusModeActive ? 'mt-[72px] md:mt-[52px]' : ''}>
        <ChatHeader
          messageCount={messages.length}
          hasDocument={!!fileUrl}
          showDocument={showDocument}
          focusModeActive={focusModeActive}
          onClearChat={handleClearChat}
          onToggleDocument={handleToggleDocument}
          onToggleFocusMode={() => setFocusModeActive(!focusModeActive)}
          onSelectConversation={handleSelectConversation}
          onClearAllConversations={handleClearAllConversations}
        />
      </div>

      {/* Error message */}
      <ChatError error={error} />

      {/* Main Content - Split View */}
      <ChatLayout
        messages={messages}
        isLoading={isLoading}
        showDocument={showDocument}
        fileUrl={fileUrl}
        filename={filename || undefined}
        conversationId={conversationId || undefined}
        streamingContent={streamingContent} // 方案7: 传递流式内容
        isStreaming={isStreaming} // 方案7: 传递流式状态
        isThinking={isThinking} // 🧠 传递思考状态
        onSend={handleSend}
        onFileSelect={handleFileSelect}
        onToggleDocument={handleToggleDocument}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">💬 加载聊天界面...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
