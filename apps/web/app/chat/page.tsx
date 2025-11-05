'use client'

import { Suspense } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatError } from './components/ChatError';
import { ChatLayout } from './components/ChatLayout';
import { useChatLogic } from './hooks/useChatLogic';

function ChatPageContent() {
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

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <ChatHeader
        messageCount={messages.length}
        hasDocument={!!fileUrl}
        showDocument={showDocument}
        onClearChat={handleClearChat}
        onToggleDocument={handleToggleDocument}
        onSelectConversation={handleSelectConversation}
        onClearAllConversations={handleClearAllConversations}
      />

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
