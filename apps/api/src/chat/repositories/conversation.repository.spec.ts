import { ConversationRepository } from './conversation.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('ConversationRepository', () => {
  let repository: ConversationRepository;
  const conversationDelegate = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  const mockPrisma = {
    conversation: conversationDelegate,
  } as unknown as PrismaService;

  beforeEach(() => {
    Object.values(conversationDelegate).forEach((fn) => fn.mockReset());
    repository = new ConversationRepository(mockPrisma);
  });

  it('creates a conversation', async () => {
    const mockConversation = { id: 'conv-1', title: 'Sample' };
    conversationDelegate.create.mockResolvedValue(mockConversation);

    const result = await repository.create({
      title: 'Sample',
      userId: 'user-1',
      documentId: 'doc-1',
    });

    expect(conversationDelegate.create).toHaveBeenCalledWith({
      data: {
        title: 'Sample',
        userId: 'user-1',
        documentId: 'doc-1',
      },
    });
    expect(result).toEqual(mockConversation);
  });

  it('finds conversation by id with messages', async () => {
    const mockConversation = { id: 'conv-1', messages: [] };
    conversationDelegate.findUnique.mockResolvedValue(mockConversation);

    const result = await repository.findById('conv-1');

    expect(conversationDelegate.findUnique).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    expect(result).toEqual(mockConversation);
  });

  it('returns paginated conversations with counts', async () => {
    const now = new Date();
    const mockResult = [
      {
        id: 'conv-1',
        title: 'Demo',
        userId: 'user-1',
        documentId: 'doc-1',
        createdAt: now,
        updatedAt: now,
        _count: { messages: 3 },
        messages: [{ id: 'msg-1', content: 'Hello', createdAt: now }],
      },
    ];
    conversationDelegate.findMany.mockResolvedValue(mockResult);

    const result = await repository.findMany({
      userId: 'user-1',
      limit: 5,
      offset: 10,
      orderBy: { updatedAt: 'asc' },
    });

    expect(conversationDelegate.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      select: {
        id: true,
        title: true,
        userId: true,
        documentId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, content: true, createdAt: true },
        },
      },
      orderBy: { updatedAt: 'asc' },
      take: 5,
      skip: 10,
    });
    expect(result).toEqual([
      {
        id: 'conv-1',
        title: 'Demo',
        userId: 'user-1',
        documentId: 'doc-1',
        createdAt: now,
        updatedAt: now,
        messageCount: 3,
        lastMessage: mockResult[0].messages[0],
      },
    ]);
  });

  it('counts conversations by user', async () => {
    conversationDelegate.count.mockResolvedValue(4);

    const result = await repository.count({ userId: 'user-1' });

    expect(conversationDelegate.count).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(result).toBe(4);
  });

  it('updates conversation title', async () => {
    const mockConversation = { id: 'conv-1', title: 'Updated' };
    conversationDelegate.update.mockResolvedValue(mockConversation);

    const result = await repository.updateTitle('conv-1', 'Updated');

    expect(conversationDelegate.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { title: 'Updated', updatedAt: expect.any(Date) },
    });
    expect(result).toEqual(mockConversation);
  });

  it('touches a conversation timestamp', async () => {
    const mockConversation = { id: 'conv-1' };
    conversationDelegate.update.mockResolvedValue(mockConversation);

    const result = await repository.touch('conv-1');

    expect(conversationDelegate.update).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
      data: { updatedAt: expect.any(Date) },
    });
    expect(result).toEqual(mockConversation);
  });

  it('deletes a conversation', async () => {
    const mockConversation = { id: 'conv-1' };
    conversationDelegate.delete.mockResolvedValue(mockConversation);

    const result = await repository.delete('conv-1');

    expect(conversationDelegate.delete).toHaveBeenCalledWith({
      where: { id: 'conv-1' },
    });
    expect(result).toEqual(mockConversation);
  });

  it('finds by document id', async () => {
    const mockConversations = [{ id: 'conv-1' }];
    conversationDelegate.findMany.mockResolvedValue(mockConversations);

    const result = await repository.findByDocumentId('doc-1');

    expect(conversationDelegate.findMany).toHaveBeenCalledWith({
      where: { documentId: 'doc-1' },
      orderBy: { createdAt: 'desc' },
    });
    expect(result).toEqual(mockConversations);
  });

  it('deletes expired conversations', async () => {
    conversationDelegate.deleteMany.mockResolvedValue({ count: 2 });
    const beforeDate = new Date();

    const result = await repository.deleteExpired(beforeDate);

    expect(conversationDelegate.deleteMany).toHaveBeenCalledWith({
      where: {
        updatedAt: {
          lt: beforeDate,
        },
      },
    });
    expect(result).toBe(2);
  });
});
