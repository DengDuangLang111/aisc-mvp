import { ReactNode } from 'react';
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
  onSend: (content: string) => Promise<void>;
}

export function ChatLayout({
  messages,
  isLoading,
  showDocument,
  fileUrl,
  filename,
  onSend,
}: ChatLayoutProps) {
  const hasDocument = !!fileUrl;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left Panel - Document Viewer */}
      {showDocument && hasDocument && (
        <div className="w-1/2 border-r border-gray-200 flex-shrink-0">
          <DocumentViewer fileUrl={fileUrl} filename={filename} />
        </div>
      )}

      {/* Right Panel - Chat */}
      <div className={`flex flex-col ${showDocument && hasDocument ? 'w-1/2' : 'w-full'}`}>
        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList messages={messages} />
        </div>

        {/* Input */}
        <MessageInput onSend={onSend} disabled={isLoading} />
      </div>
    </div>
  );
}
