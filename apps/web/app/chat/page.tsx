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
    handleSend,
    handleClearChat,
    handleToggleDocument,
  } = useChatLogic();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <ChatHeader
        messageCount={messages.length}
        hasDocument={!!fileUrl}
        showDocument={showDocument}
        onClearChat={handleClearChat}
        onToggleDocument={handleToggleDocument}
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
        onSend={handleSend}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">加载中...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}
