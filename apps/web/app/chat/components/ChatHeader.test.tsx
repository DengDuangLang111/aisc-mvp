import { render, screen, fireEvent } from '@testing-library/react';
import { ChatHeader } from './ChatHeader';

describe('ChatHeader', () => {
  const mockOnClearChat = jest.fn();
  const mockOnToggleDocument = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the header with title', () => {
    render(
      <ChatHeader
        messageCount={0}
        hasDocument={false}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    expect(screen.getByText('AI 学习助手')).toBeInTheDocument();
    expect(screen.getByText(/智能渐进式提示系统/)).toBeInTheDocument();
  });

  it('should display message count when messages exist', () => {
    render(
      <ChatHeader
        messageCount={5}
        hasDocument={false}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    expect(screen.getByText('(5 条消息)')).toBeInTheDocument();
  });

  it('should not display message count when no messages', () => {
    render(
      <ChatHeader
        messageCount={0}
        hasDocument={false}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    expect(screen.queryByText(/条消息/)).not.toBeInTheDocument();
  });

  it('should show clear chat button when messages exist', () => {
    render(
      <ChatHeader
        messageCount={3}
        hasDocument={false}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    const clearButton = screen.getByTitle('清空对话');
    expect(clearButton).toBeInTheDocument();
  });

  it('should not show clear chat button when no messages', () => {
    render(
      <ChatHeader
        messageCount={0}
        hasDocument={false}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    expect(screen.queryByTitle('清空对话')).not.toBeInTheDocument();
  });

  it('should call onClearChat when clear button clicked', () => {
    render(
      <ChatHeader
        messageCount={3}
        hasDocument={false}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    const clearButton = screen.getByTitle('清空对话');
    fireEvent.click(clearButton);

    expect(mockOnClearChat).toHaveBeenCalledTimes(1);
  });

  it('should show toggle document button when document exists', () => {
    render(
      <ChatHeader
        messageCount={0}
        hasDocument={true}
        showDocument={true}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    expect(screen.getByText('隐藏文档')).toBeInTheDocument();
  });

  it('should not show toggle document button when no document', () => {
    render(
      <ChatHeader
        messageCount={0}
        hasDocument={false}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    expect(screen.queryByText(/文档/)).not.toBeInTheDocument();
  });

  it('should display "显示文档" when document is hidden', () => {
    render(
      <ChatHeader
        messageCount={0}
        hasDocument={true}
        showDocument={false}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    expect(screen.getByText('显示文档')).toBeInTheDocument();
  });

  it('should call onToggleDocument when toggle button clicked', () => {
    render(
      <ChatHeader
        messageCount={0}
        hasDocument={true}
        showDocument={true}
        onClearChat={mockOnClearChat}
        onToggleDocument={mockOnToggleDocument}
      />
    );

    const toggleButton = screen.getByText('隐藏文档');
    fireEvent.click(toggleButton);

    expect(mockOnToggleDocument).toHaveBeenCalledTimes(1);
  });
});
