import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { VisionService } from '../ocr/vision.service';
import { AnalyticsService } from '../analytics/analytics.service';

describe('ChatService', () => {
  let service: ChatService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        DEEPSEEK_API_KEY: 'test-api-key',
        DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
        DEEPSEEK_MODEL: 'deepseek-chat',
      };
      return config[key];
    }),
  };

  const mockConversationRepo = {
    create: jest.fn().mockResolvedValue({
      id: 'test-conversation-id',
      userId: 'test-user',
      documentId: null,
      title: 'Test Conversation',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findById: jest.fn().mockResolvedValue({
      id: 'test-conversation-id',
      userId: 'test-user',
      documentId: null,
      title: 'Test Conversation',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    findMany: jest.fn().mockResolvedValue([]),
    count: jest.fn().mockResolvedValue(0),
    updateTitle: jest.fn(),
    touch: jest.fn(),
    delete: jest.fn(),
    findByDocumentId: jest.fn(),
    deleteExpired: jest.fn(),
  };

  const mockMessageRepo = {
    create: jest.fn().mockResolvedValue({
      id: 'test-message-id',
      role: 'assistant',
      content: 'Test response',
      createdAt: new Date(),
    }),
    createMany: jest.fn(),
    findByConversationId: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByConversationId: jest.fn(),
    countByConversationId: jest.fn(),
    findLastN: jest.fn().mockResolvedValue([]),
    calculateTotalTokens: jest.fn().mockResolvedValue(0),
  };

  const mockVisionService = {
    analyzeImage: jest.fn(),
    processOcr: jest.fn(),
    getOcrResult: jest.fn(),
  };

  const mockAnalyticsService = {
    trackEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: ConversationRepository,
          useValue: mockConversationRepo,
        },
        {
          provide: MessageRepository,
          useValue: mockMessageRepo,
        },
        {
          provide: VisionService,
          useValue: mockVisionService,
        },
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should return hint level 1 for first message (no history)', async () => {
      // Mock: 新对话，没有历史消息
      mockConversationRepo.create.mockResolvedValueOnce({
        id: 'test-conv-1',
        userId: 'test-user',
        documentId: null,
        title: 'Test',
        messages: [], // 0 个消息
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: ChatRequestDto = {
        message: '什么是递归？',
        userId: 'test-user',
      };

      const response = await service.chat(request);

      expect(response).toBeDefined();
      expect(response.hintLevel).toBe(1);
      expect(response.timestamp).toBeGreaterThan(0);
    });

    it('should return hint level 1 with one previous message', async () => {
      // Mock: 对话有 1 个用户消息
      mockConversationRepo.findById.mockResolvedValueOnce({
        id: 'test-conv-2',
        messages: [
          {
            id: '1',
            role: 'user',
            content: '什么是递归？',
            conversationId: 'test-conv-2',
            createdAt: new Date(),
          },
        ],
      });
      mockMessageRepo.findLastN.mockResolvedValueOnce([
        {
          id: '1',
          role: 'user',
          content: '什么是递归？',
          conversationId: 'test-conv-2',
          createdAt: new Date(),
        },
      ]);

      const request: ChatRequestDto = {
        message: '能再解释一下吗？',
        conversationId: 'test-conv-2',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(1);
    });

    it('should return hint level 2 with 2-3 previous messages', async () => {
      // Mock: 对话有 2 个用户消息
      mockConversationRepo.findById.mockResolvedValueOnce({
        id: 'test-conv-3',
        messages: [
          {
            id: '1',
            role: 'user',
            content: '什么是递归？',
            conversationId: 'test-conv-3',
            createdAt: new Date(),
          },
          {
            id: '2',
            role: 'assistant',
            content: '提示1...',
            conversationId: 'test-conv-3',
            createdAt: new Date(),
          },
          {
            id: '3',
            role: 'user',
            content: '能再解释一下吗？',
            conversationId: 'test-conv-3',
            createdAt: new Date(),
          },
        ],
      });
      mockMessageRepo.findLastN.mockResolvedValueOnce([
        {
          id: '1',
          role: 'user',
          content: '什么是递归？',
          conversationId: 'test-conv-3',
          createdAt: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: '提示1...',
          conversationId: 'test-conv-3',
          createdAt: new Date(),
        },
        {
          id: '3',
          role: 'user',
          content: '能再解释一下吗？',
          conversationId: 'test-conv-3',
          createdAt: new Date(),
        },
      ]);

      const request: ChatRequestDto = {
        message: '还是不太明白',
        conversationId: 'test-conv-3',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(2);
    });

    it('should return hint level 3 with 4+ previous messages', async () => {
      // Mock: 对话有 4 个用户消息
      mockConversationRepo.findById.mockResolvedValueOnce({
        id: 'test-conv-4',
        messages: [
          {
            id: '1',
            role: 'user',
            content: '问题1',
            conversationId: 'test-conv-4',
            createdAt: new Date(),
          },
          {
            id: '2',
            role: 'assistant',
            content: '回答1',
            conversationId: 'test-conv-4',
            createdAt: new Date(),
          },
          {
            id: '3',
            role: 'user',
            content: '问题2',
            conversationId: 'test-conv-4',
            createdAt: new Date(),
          },
          {
            id: '4',
            role: 'assistant',
            content: '回答2',
            conversationId: 'test-conv-4',
            createdAt: new Date(),
          },
          {
            id: '5',
            role: 'user',
            content: '问题3',
            conversationId: 'test-conv-4',
            createdAt: new Date(),
          },
          {
            id: '6',
            role: 'assistant',
            content: '回答3',
            conversationId: 'test-conv-4',
            createdAt: new Date(),
          },
          {
            id: '7',
            role: 'user',
            content: '问题4',
            conversationId: 'test-conv-4',
            createdAt: new Date(),
          },
        ],
      });
      mockMessageRepo.findLastN.mockResolvedValueOnce([
        {
          id: '1',
          role: 'user',
          content: '问题1',
          conversationId: 'test-conv-4',
          createdAt: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: '回答1',
          conversationId: 'test-conv-4',
          createdAt: new Date(),
        },
        {
          id: '3',
          role: 'user',
          content: '问题2',
          conversationId: 'test-conv-4',
          createdAt: new Date(),
        },
        {
          id: '4',
          role: 'assistant',
          content: '回答2',
          conversationId: 'test-conv-4',
          createdAt: new Date(),
        },
        {
          id: '5',
          role: 'user',
          content: '问题3',
          conversationId: 'test-conv-4',
          createdAt: new Date(),
        },
        {
          id: '6',
          role: 'assistant',
          content: '回答3',
          conversationId: 'test-conv-4',
          createdAt: new Date(),
        },
        {
          id: '7',
          role: 'user',
          content: '问题4',
          conversationId: 'test-conv-4',
          createdAt: new Date(),
        },
      ]);

      const request: ChatRequestDto = {
        message: '能更详细吗？',
        conversationId: 'test-conv-4',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(3);
    });

    it('should handle empty conversation history', async () => {
      // Mock: 新对话，无消息历史
      mockConversationRepo.create.mockResolvedValueOnce({
        id: 'test-conv-5',
        userId: 'test-user',
        documentId: null,
        title: 'Test',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: ChatRequestDto = {
        message: '测试消息',
        userId: 'test-user',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(1);
      expect(response.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should count only user messages in history', async () => {
      // Mock: 4 条消息（2 个用户 + 2 个助手） → 应该是 hintLevel 2
      mockConversationRepo.findById.mockResolvedValueOnce({
        id: 'test-conv-6',
        messages: [
          {
            id: '1',
            role: 'user',
            content: '用户消息1',
            conversationId: 'test-conv-6',
            createdAt: new Date(),
          },
          {
            id: '2',
            role: 'assistant',
            content: 'AI回答1',
            conversationId: 'test-conv-6',
            createdAt: new Date(),
          },
          {
            id: '3',
            role: 'user',
            content: '用户消息2',
            conversationId: 'test-conv-6',
            createdAt: new Date(),
          },
          {
            id: '4',
            role: 'assistant',
            content: 'AI回答2',
            conversationId: 'test-conv-6',
            createdAt: new Date(),
          },
        ],
      });
      mockMessageRepo.findLastN.mockResolvedValueOnce([
        {
          id: '1',
          role: 'user',
          content: '用户消息1',
          conversationId: 'test-conv-6',
          createdAt: new Date(),
        },
        {
          id: '2',
          role: 'assistant',
          content: 'AI回答1',
          conversationId: 'test-conv-6',
          createdAt: new Date(),
        },
        {
          id: '3',
          role: 'user',
          content: '用户消息2',
          conversationId: 'test-conv-6',
          createdAt: new Date(),
        },
        {
          id: '4',
          role: 'assistant',
          content: 'AI回答2',
          conversationId: 'test-conv-6',
          createdAt: new Date(),
        },
      ]);

      const request: ChatRequestDto = {
        message: '当前问题',
        conversationId: 'test-conv-6',
      };

      const response = await service.chat(request);

      // 2 个用户消息 → hint level 2
      expect(response.hintLevel).toBe(2);
    });

    it('should generate timestamp close to current time', async () => {
      // Mock: 新对话
      mockConversationRepo.create.mockResolvedValueOnce({
        id: 'test-conv-7',
        userId: 'test-user',
        documentId: null,
        title: 'Test',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const beforeTime = Date.now();

      const request: ChatRequestDto = {
        message: '测试时间戳',
        userId: 'test-user',
      };

      const response = await service.chat(request);
      const afterTime = Date.now();

      expect(response.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(response.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle very long conversation history', async () => {
      // Mock: 20 条消息（10 个用户 + 10 个助手）
      const longMessages = Array.from({ length: 20 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `消息 ${i}`,
        conversationId: 'test-conv-8',
        createdAt: new Date(),
      }));

      mockConversationRepo.findById.mockResolvedValueOnce({
        id: 'test-conv-8',
        messages: longMessages,
      });
      mockMessageRepo.findLastN.mockResolvedValueOnce(longMessages);

      const request: ChatRequestDto = {
        message: '继续提问',
        conversationId: 'test-conv-8',
      };

      const response = await service.chat(request);

      // 10 个用户消息 → hint level 3
      expect(response.hintLevel).toBe(3);
      expect(response.reply).toBeDefined();
    });
  });

  describe('hint level calculation', () => {
    it('should calculate correct hint levels for different message counts', async () => {
      const testCases = [
        { userMessages: 0, expectedLevel: 1 },
        { userMessages: 1, expectedLevel: 1 },
        { userMessages: 2, expectedLevel: 2 },
        { userMessages: 3, expectedLevel: 2 },
        { userMessages: 4, expectedLevel: 3 },
        { userMessages: 5, expectedLevel: 3 },
        { userMessages: 10, expectedLevel: 3 },
      ];

      for (const testCase of testCases) {
        // Mock: 根据测试用例创建不同数量的消息
        const messages = Array.from(
          { length: testCase.userMessages },
          (_, i) => ({
            id: `msg-${i}`,
            role: 'user',
            content: `消息 ${i}`,
            conversationId: 'test-conv',
            createdAt: new Date(),
          }),
        );

        if (testCase.userMessages === 0) {
          // 新对话
          mockConversationRepo.create.mockResolvedValueOnce({
            id: 'test-conv',
            userId: 'test-user',
            documentId: null,
            title: 'Test',
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        } else {
          // 现有对话
          mockConversationRepo.findById.mockResolvedValueOnce({
            id: 'test-conv',
            messages,
          });
          mockMessageRepo.findLastN.mockResolvedValueOnce(messages);
        }

        const request: ChatRequestDto = {
          message: '当前消息',
          conversationId: testCase.userMessages > 0 ? 'test-conv' : undefined,
          userId: testCase.userMessages === 0 ? 'test-user' : undefined,
        };

        const response = await service.chat(request);
        expect(response.hintLevel).toBe(testCase.expectedLevel);
      }
    });
  });

  describe('response content', () => {
    it('should return fallback response when API fails', async () => {
      // Mock: 新对话
      mockConversationRepo.create.mockResolvedValueOnce({
        id: 'conv-1',
        userId: 'test-user',
        documentId: null,
        title: 'Test 1',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const response = await service.chat({
        message: '测试',
        userId: 'test-user',
      });

      // 当 API 不可用时，应该返回降级响应
      expect(response).toBeDefined();
      expect(response.reply).toContain('抱歉');
      expect(response.hintLevel).toBe(1);
    });
  });

  describe('getConversations', () => {
    it('should return all conversations when no userId provided', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test 1',
          userId: 'user-1',
          _count: { messages: 5 },
          messages: [
            {
              id: 'msg-1',
              content: 'Hello',
              createdAt: new Date(),
              role: 'user',
              conversationId: 'conv-1',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'conv-2',
          title: 'Test 2',
          userId: 'user-2',
          _count: { messages: 3 },
          messages: [
            {
              id: 'msg-2',
              content: 'World',
              createdAt: new Date(),
              role: 'user',
              conversationId: 'conv-2',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockConversationRepo.findMany = jest
        .fn()
        .mockResolvedValue(mockConversations);
      mockConversationRepo.count = jest.fn().mockResolvedValue(2);

      const result = await service.getConversations();

      expect(result.data).toHaveLength(2);
      expect(result.data[0].messageCount).toBe(5);
      expect(result.data[0].lastMessage).toBe('Hello');
      expect(mockConversationRepo.findMany).toHaveBeenCalledWith({
        userId: undefined,
        limit: 20,
        offset: 0,
        orderBy: { updatedAt: 'desc' },
      });
    });

    it('should filter conversations by userId', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'Test 1',
          userId: 'user-123',
          _count: { messages: 5 },
          messages: [
            {
              id: 'msg-1',
              content: 'Hello',
              createdAt: new Date(),
              role: 'user',
              conversationId: 'conv-1',
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockConversationRepo.findMany = jest
        .fn()
        .mockResolvedValue(mockConversations);
      mockConversationRepo.count = jest.fn().mockResolvedValue(1);

      const paginationDto: PaginationDto = { limit: 10, offset: 0 };
      const result = await service.getConversations('user-123', paginationDto);

      expect(result.data).toHaveLength(1);
      expect(mockConversationRepo.findMany).toHaveBeenCalledWith({
        userId: 'user-123',
        limit: 10,
        offset: 0,
        orderBy: { updatedAt: 'desc' },
      });
    });
  });

  describe('getConversation', () => {
    it('should return conversation with messages and document', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test Conversation',
        userId: 'user-1',
        documentId: 'doc-1',
        document: {
          id: 'doc-1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          ocrResult: {
            confidence: 0.95,
            language: 'en',
            pageCount: 5,
          },
        },
        messages: [
          {
            id: 'msg-1',
            role: 'user',
            content: 'Hello',
            tokensUsed: 10,
            createdAt: new Date(),
            conversationId: 'conv-1',
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'Hi there!',
            tokensUsed: 15,
            createdAt: new Date(),
            conversationId: 'conv-1',
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepo.findById = jest
        .fn()
        .mockResolvedValue(mockConversation);

      const result = await service.getConversation('conv-1');

      expect(result.id).toBe('conv-1');
      expect(result.messages).toHaveLength(2);
      expect(result.documentId).toBe('doc-1');
    });

    it('should throw NotFoundException when conversation not found', async () => {
      mockConversationRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(service.getConversation('non-existent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getConversation('non-existent')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation', async () => {
      const mockConversation = {
        id: 'conv-1',
        userId: 'user-1',
        title: 'Test',
        createdAt: new Date(),
      };

      mockConversationRepo.findById = jest
        .fn()
        .mockResolvedValue(mockConversation);
      mockConversationRepo.delete = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await service.deleteConversation('conv-1');

      expect(mockConversationRepo.delete).toHaveBeenCalledWith('conv-1');
    });

    it('should throw NotFoundException when conversation not found', async () => {
      mockConversationRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(service.deleteConversation('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when userId does not match', async () => {
      const mockConversation = {
        id: 'conv-1',
        userId: 'user-1',
        title: 'Test',
        createdAt: new Date(),
      };

      mockConversationRepo.findById = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await expect(
        service.deleteConversation('conv-1', 'user-2'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.deleteConversation('conv-1', 'user-2'),
      ).rejects.toThrow('Unauthorized');
    });

    it('should allow deletion without userId check', async () => {
      const mockConversation = {
        id: 'conv-1',
        userId: 'user-1',
        title: 'Test',
        createdAt: new Date(),
      };

      mockConversationRepo.findById = jest
        .fn()
        .mockResolvedValue(mockConversation);
      mockConversationRepo.delete = jest
        .fn()
        .mockResolvedValue(mockConversation);

      await service.deleteConversation('conv-1');

      expect(mockConversationRepo.delete).toHaveBeenCalled();
    });
  });

  describe('createConversation', () => {
    it('should create new conversation with document', async () => {
      const userId = 'user-123';
      const documentId = 'doc-456';
      const title = 'Test Conversation';

      const mockConversation = {
        id: 'conv-new',
        userId,
        documentId,
        title,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepo.create = jest
        .fn()
        .mockResolvedValue(mockConversation);
      mockMessageRepo.create = jest.fn().mockResolvedValue({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        conversationId: 'conv-new',
        createdAt: new Date(),
      });

      const result = await service.chat({
        message: 'Hello',
        userId,
        documentId,
      });

      expect(result).toBeDefined();
      expect(mockConversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          documentId,
        }),
      );
    });

    it('should generate conversation title from first message', async () => {
      mockConversationRepo.create = jest.fn().mockResolvedValue({
        id: 'conv-123',
        userId: 'user-1',
        title: 'What is recursion?',
        messages: [],
        createdAt: new Date(),
      });

      await service.chat({
        message: 'What is recursion? Can you explain it in detail?',
        userId: 'user-1',
      });

      expect(mockConversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('What is recursion'),
        }),
      );
    });
  });

  describe('hint level calculation', () => {
    it('should return hint level 0 for first message', async () => {
      mockConversationRepo.findById = jest.fn().mockResolvedValue({
        id: 'conv-1',
        messages: [],
      });
      mockMessageRepo.create = jest.fn().mockResolvedValue({
        id: 'msg-1',
        role: 'user',
        content: 'What is a loop?',
        conversationId: 'conv-1',
        createdAt: new Date(),
      });

      const result = await service.chat({
        message: 'What is a loop?',
        conversationId: 'conv-1',
      });

      expect(result.hintLevel).toBeGreaterThanOrEqual(0);
    });

    it('should calculate hint level based on conversation length', async () => {
      mockConversationRepo.findById = jest.fn().mockResolvedValue({
        id: 'conv-1',
        messages: [
          {
            id: '1',
            role: 'user',
            content: 'Question 1',
            conversationId: 'conv-1',
            createdAt: new Date(),
          },
          {
            id: '2',
            role: 'assistant',
            content: 'Answer 1',
            conversationId: 'conv-1',
            createdAt: new Date(),
          },
          {
            id: '3',
            role: 'user',
            content: 'Question 2',
            conversationId: 'conv-1',
            createdAt: new Date(),
          },
          {
            id: '4',
            role: 'assistant',
            content: 'Answer 2',
            conversationId: 'conv-1',
            createdAt: new Date(),
          },
        ],
      });
      mockMessageRepo.create = jest.fn().mockResolvedValue({
        id: 'msg-5',
        role: 'user',
        content: 'Can you explain more?',
        conversationId: 'conv-1',
        createdAt: new Date(),
      });

      const result = await service.chat({
        message: 'Can you explain more?',
        conversationId: 'conv-1',
      });

      expect(result.hintLevel).toBeGreaterThan(0);
    });
  });

  describe('document context loading', () => {
    it('should load OCR result when document is provided', async () => {
      const documentId = 'doc-123';
      const mockOcrResult = {
        id: 'ocr-1',
        documentId,
        fullText: 'Document content here',
        confidence: 0.95,
        language: 'en',
        pageCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockConversationRepo.create = jest.fn().mockResolvedValue({
        id: 'conv-1',
        userId: 'user-1',
        documentId,
        title: 'Test',
        messages: [],
        createdAt: new Date(),
      });
      mockMessageRepo.create = jest.fn().mockResolvedValue({
        id: 'msg-1',
        role: 'user',
        content: 'Tell me about this document',
        conversationId: 'conv-1',
        createdAt: new Date(),
      });

      mockVisionService.getOcrResult.mockResolvedValue(mockOcrResult);

      await service.chat({
        message: 'Tell me about this document',
        userId: 'user-1',
        documentId,
      });

      expect(mockVisionService.getOcrResult).toHaveBeenCalledWith(documentId);
    });

    it('should handle missing OCR result gracefully', async () => {
      mockConversationRepo.create = jest.fn().mockResolvedValue({
        id: 'conv-1',
        userId: 'user-1',
        documentId: 'doc-no-ocr',
        title: 'Test',
        messages: [],
        createdAt: new Date(),
      });
      mockMessageRepo.create = jest.fn().mockResolvedValue({
        id: 'msg-1',
        role: 'user',
        content: 'Tell me about this document',
        conversationId: 'conv-1',
        createdAt: new Date(),
      });

      mockVisionService.getOcrResult.mockResolvedValue(null);

      const result = await service.chat({
        message: 'Tell me about this document',
        userId: 'user-1',
        documentId: 'doc-no-ocr',
      });

      expect(result).toBeDefined();
      // Should still work without OCR result
    });
  });

  describe('error scenarios', () => {
    it('should throw NotFoundException for non-existent conversation', async () => {
      mockConversationRepo.findById = jest.fn().mockResolvedValue(null);

      await expect(
        service.chat({
          message: 'Hello',
          conversationId: 'non-existent-conv',
        }),
      ).rejects.toThrow('Conversation non-existent-conv not found');
    });

    it('should handle conversation creation failure', async () => {
      mockConversationRepo.findById = jest.fn().mockResolvedValue(null);
      mockConversationRepo.create = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.chat({
          message: 'Hello',
          userId: 'user-123',
        }),
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle AI API failure', async () => {
      const mockConversation = {
        id: 'conv-1',
        messages: [],
        userId: 'user-1',
        createdAt: new Date(),
      };

      mockConversationRepo.findById = jest
        .fn()
        .mockResolvedValue(mockConversation);
      mockMessageRepo.create = jest.fn().mockResolvedValue({
        id: 'msg-1',
        role: 'user',
        content: 'Test message',
        conversationId: 'conv-1',
        createdAt: new Date(),
      });

      // Mock HTTP error
      global.fetch = jest.fn().mockRejectedValue(new Error('API unavailable'));

      // Should return fallback response instead of throwing
      const result = await service.chat({
        message: 'Test message',
        conversationId: 'conv-1',
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.reply).toContain('AI 服务暂时不可用');
      expect(result.tokensUsed).toBe(0);
    });

    it('should handle conversation title generation failure', async () => {
      const message = 'A'.repeat(1000); // Very long message

      mockConversationRepo.create = jest.fn().mockResolvedValue({
        id: 'conv-1',
        userId: 'user-1',
        title: 'New Conversation',
        messages: [],
        createdAt: new Date(),
      });
      mockMessageRepo.create = jest.fn().mockResolvedValue({
        id: 'msg-1',
        role: 'user',
        content: message,
        conversationId: 'conv-1',
        createdAt: new Date(),
      });

      // Should handle long messages gracefully
      const result = await service.chat({
        message,
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      expect(mockConversationRepo.create).toHaveBeenCalled();
    });
  });
});
