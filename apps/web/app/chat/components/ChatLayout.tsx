import { ReactNode, useState } from 'react';
import { DocumentViewer } from './DocumentViewer';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { Message } from './MessageBubble';

interface ChatLayoutProps {
  messages: Message[];
  isLoading: boolean;
  showDocument: boolean;
  fileUrl?: string;
  filename?: string;
  conversationId?: string;
  streamingContent?: string; // 方案7: 流式内容
  isStreaming?: boolean; // 方案7: 流式状态
  isThinking?: boolean; // 🧠 思考状态
  onSend: (content: string, options?: { conversationId?: string; streaming?: boolean }) => Promise<void>;
  onFileSelect?: (file: File) => void;
}

export function ChatLayout({
  messages,
  isLoading,
  showDocument,
  fileUrl,
  filename,
  conversationId,
  streamingContent,
  isStreaming,
  isThinking,
  onSend,
  onFileSelect,
}: ChatLayoutProps) {
  const hasDocument = !!fileUrl;
  const [documentPanelSize, setDocumentPanelSize] = useState(50);

  // Handle panel resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startSize = documentPanelSize;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const container = (e.target as HTMLElement).closest('.flex')?.parentElement;
      if (!container) return;

      const delta = moveEvent.clientX - startX;
      const containerWidth = container.offsetWidth;
      const newSize = Math.max(30, Math.min(70, startSize + (delta / containerWidth) * 100));
      setDocumentPanelSize(newSize);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-white">
      {/* Left Panel - Document Viewer */}
      {showDocument && hasDocument && (
        <>
          <div style={{ width: `${documentPanelSize}%` }} className="border-r border-gray-200 flex-shrink-0 overflow-hidden">
            <DocumentViewer fileUrl={fileUrl} filename={filename} />
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="w-1 bg-gray-200 hover:bg-blue-500 cursor-col-resize transition-colors"
            title="拖动调整面板大小"
          />
        </>
      )}

      {/* Right Panel - Chat */}
      <div style={{ width: showDocument && hasDocument ? `${100 - documentPanelSize}%` : '100%' }} className="flex flex-col overflow-hidden">
        {/* Chat Header */}
        {hasDocument && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 px-4 py-3">
            <div className="flex items-center justify-between max-w-7xl">
              <div className="flex items-center gap-2">
                <span className="text-lg">📄</span>
                <span className="text-sm font-medium text-gray-700">
                  文档：<span className="text-blue-600">{filename || 'Untitled'}</span>
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {messages.length} 条消息
              </span>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          <MessageList 
            messages={messages} 
            isLoading={isLoading}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            isThinking={isThinking}
          />
        </div>

        {/* Input */}
        <MessageInput
          onSend={onSend}
          onFileSelect={onFileSelect}
          conversationId={conversationId}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
