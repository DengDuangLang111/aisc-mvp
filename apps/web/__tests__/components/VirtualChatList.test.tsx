import { render, screen } from '@testing-library/react';
import { VirtualChatList } from '@/components/VirtualChatList';
import type { Message } from '@/components';

jest.mock('@tanstack/react-virtual', () => {
  return {
    useVirtualizer: ({ count }: { count: number }) => {
      const visibleCount = Math.min(count, 8);
      return {
        getVirtualItems: () =>
          Array.from({ length: visibleCount }, (_, index) => ({
            key: index,
            index,
            size: 100,
            start: index * 100,
          })),
        getTotalSize: () => count * 100,
        scrollToIndex: jest.fn(),
      };
    },
  };
});

describe('VirtualChatList', () => {
  const mockMessages: Message[] = Array.from({ length: 1000 }, (_, i) => ({
    id: `msg-${i}`,
    content: `Message ${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    timestamp: new Date().toISOString(),
  }));

  it('should render virtual list with messages', () => {
    render(
      <VirtualChatList
        messages={mockMessages}
        height={600}
        itemSize={100}
      />
    );

    // 虚拟列表应该存在
    expect(screen.getByRole('list')).toBeInTheDocument();
  });

  it('should handle empty messages', () => {
    render(
      <VirtualChatList
        messages={[]}
        height={600}
        itemSize={100}
      />
    );

    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('should render only visible items for performance', () => {
    const { container } = render(
      <VirtualChatList
        messages={mockMessages}
        height={600}
        itemSize={100}
      />
    );

    // 只渲染可见区域的消息（约 6-7 个 + overscan 5 个）
    const renderedMessages = container.querySelectorAll('.virtual-chat-message');
    expect(renderedMessages.length).toBeLessThan(50);
    expect(renderedMessages.length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    const { container } = render(
      <VirtualChatList
        messages={mockMessages}
        height={600}
        itemSize={100}
        className="custom-class"
      />
    );

    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });

  it('should handle different message roles', () => {
    const mixedMessages: Message[] = [
      {
        id: '1',
        content: 'User message',
        role: 'user',
        timestamp: new Date().toISOString(),
      },
      {
        id: '2',
        content: 'Assistant message',
        role: 'assistant',
        timestamp: new Date().toISOString(),
      },
    ];

    render(
      <VirtualChatList
        messages={mixedMessages}
        height={600}
        itemSize={100}
      />
    );

    expect(screen.getByText('User message')).toBeInTheDocument();
    expect(screen.getByText('Assistant message')).toBeInTheDocument();
  });
});
