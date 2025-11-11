import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { ConversationRepository } from './repositories/conversation.repository';
import { MessageRepository } from './repositories/message.repository';
import { VisionService } from '../ocr/vision.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { BusinessException, ErrorCode } from '../common/exceptions/business.exception';

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
    create: jest.fn(),
    findById: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateTitle: jest.fn(),
    touch: jest.fn(),
    delete: jest.fn(),
    findByDocumentId: jest.fn(),
    deleteExpired: jest.fn(),
  };

  const mockMessageRepo = {
    create: jest.fn(),
    createMany: jest.fn(),
    findByConversationId: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteByConversationId: jest.fn(),
    countByConversationId: jest.fn(),
    findLastN: jest.fn(),
    calculateTotalTokens: jest.fn(),
  };

  const mockVisionService = {
    getOcrResult: jest.fn(),
    getDocumentContext: jest.fn(),
  };

  const mockAnalyticsService = {
    trackEvent: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ConversationRepository, useValue: mockConversationRepo },
        { provide: MessageRepository, useValue: mockMessageRepo },
        { provide: VisionService, useValue: mockVisionService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should create a new conversation for first message', async () => {
      mockConversationRepo.create.mockResolvedValueOnce({
        id: 'conv-1',
        userId: 'user-1',
        title: 'Test',
        messages: [],
      });
      mockMessageRepo.create.mockResolvedValueOnce({
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        conversationId: 'conv-1',
      });

      const dto: ChatRequestDto = { message: 'Hello', userId: 'user-1' };
      const result = await service.chat(dto);

      expect(result).toBeDefined();
      expect(mockConversationRepo.create).toHaveBeenCalled();
      expect(mockMessageRepo.create).toHaveBeenCalled();
    });

    it('should throw BusinessException when conversation not found', async () => {
      mockConversationRepo.findById.mockResolvedValueOnce(null);

      await expect(
        service.chat({ message: 'Hi', conversationId: 'missing-id' }),
      ).rejects.toMatchObject({ code: ErrorCode.CONVERSATION_NOT_FOUND });
    });
  });

  describe('getConversations', () => {
    it('should map conversations with messageCount and lastMessage', async () => {
      const now = new Date();
      mockConversationRepo.findMany.mockResolvedValueOnce([
        {
          id: 'conv-1',
          title: 'Test 1',
          userId: 'user-1',
          documentId: null,
          messageCount: 5,
          lastMessage: { content: 'Hello', createdAt: now },
          createdAt: now,
          updatedAt: now,
        },
      ]);
      mockConversationRepo.count.mockResolvedValueOnce(1);

      const result: any = await service.getConversations();

      expect(result.data[0].messageCount).toBe(5);
      expect(result.data[0].lastMessage).toBe('Hello');
    });
  });

  describe('getConversation', () => {
    it('should return conversation when found', async () => {
      mockConversationRepo.findById.mockResolvedValueOnce({
        id: 'conv-1',
        userId: 'user-1',
        messages: [],
      });

      const result = await service.getConversation('conv-1');
      expect(result.id).toBe('conv-1');
    });

    it('should throw when conversation not found', async () => {
      mockConversationRepo.findById.mockResolvedValueOnce(null);

      await expect(service.getConversation('missing')).rejects.toMatchObject({
        code: ErrorCode.CONVERSATION_NOT_FOUND,
      });
    });
  });

  describe('deleteConversation', () => {
    it('should delete when exists and user matches', async () => {
      mockConversationRepo.findById.mockResolvedValueOnce({
        id: 'conv-1',
        userId: 'user-1',
      });

      await service.deleteConversation('conv-1', 'user-1');
      expect(mockConversationRepo.delete).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('document context loading', () => {
    it('should call VisionService.getDocumentContext when documentId provided', async () => {
      mockConversationRepo.create.mockResolvedValueOnce({
        id: 'conv-1',
        userId: 'user-1',
        documentId: 'doc-1',
        messages: [],
      });
      mockMessageRepo.create.mockResolvedValueOnce({
        id: 'msg-1',
        role: 'user',
        content: 'Explain this doc',
        conversationId: 'conv-1',
      });
      mockVisionService.getDocumentContext.mockResolvedValueOnce({
        fullText: 'doc text',
      });

      await service.chat({
        message: 'Explain this doc',
        userId: 'user-1',
        documentId: 'doc-1',
      });

      expect(mockVisionService.getDocumentContext).toHaveBeenCalledWith('doc-1');
    });
  });

  describe('error scenarios', () => {
    it('should handle AI API failure gracefully (fallback)', async () => {
      const conv = { id: 'conv-1', userId: 'user-1', messages: [] };
      mockConversationRepo.findById.mockResolvedValueOnce(conv);
      mockMessageRepo.findLastN.mockResolvedValueOnce([]);
      mockMessageRepo.create.mockResolvedValueOnce({
        id: 'msg-1',
        role: 'user',
        content: 'Hi',
        conversationId: 'conv-1',
      });

      (global as any).fetch = jest
        .fn()
        .mockRejectedValue(new Error('API unavailable'));

      const result = await service.chat({
        message: 'Hi',
        conversationId: 'conv-1',
        userId: 'user-1',
      });

      expect(result).toBeDefined();
      expect(result.reply).toBeDefined();
    });
  });
});
