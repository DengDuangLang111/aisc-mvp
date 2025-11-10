import { MessageRepository } from './message.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  const messageDelegate = {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
  };
  const mockPrisma = {
    message: messageDelegate,
  } as unknown as PrismaService;

  beforeEach(() => {
    Object.values(messageDelegate).forEach((fn) => fn.mockReset());
    repository = new MessageRepository(mockPrisma);
  });

  it('creates a message', async () => {
    const mockMessage = { id: 'msg-1', conversationId: 'conv-1', role: 'user' };
    messageDelegate.create.mockResolvedValue(mockMessage);

    const result = await repository.create({
      conversationId: 'conv-1',
      role: 'user',
      content: 'Hi',
    });

    expect(messageDelegate.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conv-1',
        role: 'user',
        content: 'Hi',
        tokensUsed: null,
      },
    });
    expect(result).toEqual(mockMessage);
  });

  it('creates many messages', async () => {
    messageDelegate.createMany.mockResolvedValue({ count: 2 });

    const result = await repository.createMany([
      { conversationId: 'conv', role: 'user', content: 'A' },
      { conversationId: 'conv', role: 'assistant', content: 'B' },
    ]);

    expect(messageDelegate.createMany).toHaveBeenCalled();
    expect(result).toBe(2);
  });

  it('finds by conversation id', async () => {
    const mockMessages = [{ id: 'msg-1' }];
    messageDelegate.findMany.mockResolvedValue(mockMessages);

    const result = await repository.findByConversationId('conv-1');

    expect(messageDelegate.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result).toEqual(mockMessages);
  });

  it('updates a message', async () => {
    const mockMessage = { id: 'msg-1', content: 'Updated' };
    messageDelegate.update.mockResolvedValue(mockMessage);

    const result = await repository.update('msg-1', { content: 'Updated' });

    expect(messageDelegate.update).toHaveBeenCalledWith({
      where: { id: 'msg-1' },
      data: { content: 'Updated' },
    });
    expect(result).toEqual(mockMessage);
  });

  it('deletes a message', async () => {
    const mockMessage = { id: 'msg-1' };
    messageDelegate.delete.mockResolvedValue(mockMessage);

    const result = await repository.delete('msg-1');

    expect(messageDelegate.delete).toHaveBeenCalledWith({
      where: { id: 'msg-1' },
    });
    expect(result).toEqual(mockMessage);
  });

  it('deletes messages by conversation id', async () => {
    messageDelegate.deleteMany.mockResolvedValue({ count: 3 });

    const result = await repository.deleteByConversationId('conv-1');

    expect(messageDelegate.deleteMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
    });
    expect(result).toBe(3);
  });

  it('counts messages by conversation id', async () => {
    messageDelegate.count.mockResolvedValue(5);

    const result = await repository.countByConversationId('conv-1');

    expect(messageDelegate.count).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
    });
    expect(result).toBe(5);
  });

  it('finds last N messages', async () => {
    const mockMessages = [{ id: 'msg-1' }];
    messageDelegate.findMany.mockResolvedValue(mockMessages);

    const result = await repository.findLastN('conv-1', 2);

    expect(messageDelegate.findMany).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      orderBy: { createdAt: 'desc' },
      take: 2,
    });
    expect(result).toEqual(mockMessages);
  });

  it('calculates total tokens', async () => {
    messageDelegate.aggregate.mockResolvedValue({
      _sum: { tokensUsed: 42 },
    });

    const result = await repository.calculateTotalTokens('conv-1');

    expect(messageDelegate.aggregate).toHaveBeenCalledWith({
      where: { conversationId: 'conv-1' },
      _sum: { tokensUsed: true },
    });
    expect(result).toBe(42);
  });
});
