import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ChatRequestDto } from './dto/chat-request.dto';

describe('ChatController', () => {
  let controller: ChatController;
  let service: ChatService;

  const mockChatService = {
    chat: jest.fn(),
    getConversations: jest.fn(),
    getConversation: jest.fn(),
    deleteConversation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ChatController>(ChatController);
    service = module.get<ChatService>(ChatService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('chat', () => {
    it('should send a chat message and return response', async () => {
      const request: ChatRequestDto = {
        message: 'Hello AI',
        conversationHistory: [],
      };

      const expectedResponse = {
        reply: 'Hello! How can I help you?',
        hintLevel: 1,
        timestamp: Date.now(),
      };

      mockChatService.chat.mockResolvedValue(expectedResponse);

      const result = await controller.chat(request);

      expect(result).toEqual(expectedResponse);
      expect(service.chat).toHaveBeenCalledWith(request);
      expect(service.chat).toHaveBeenCalledTimes(1);
    });

    it('should handle chat with conversation history', async () => {
      const request: ChatRequestDto = {
        message: 'Follow-up question',
        conversationHistory: [
          { role: 'user', content: 'Previous question' },
          { role: 'assistant', content: 'Previous answer' },
        ],
      };

      const expectedResponse = {
        reply: 'Based on our previous discussion...',
        hintLevel: 2,
        timestamp: Date.now(),
      };

      mockChatService.chat.mockResolvedValue(expectedResponse);

      const result = await controller.chat(request);

      expect(result).toEqual(expectedResponse);
      expect(service.chat).toHaveBeenCalledWith(request);
    });

    it('should handle chat with upload context', async () => {
      const request: ChatRequestDto = {
        message: 'Question about document',
        uploadId: 'upload-123',
        conversationHistory: [],
      };

      const expectedResponse = {
        reply: 'According to the document...',
        hintLevel: 1,
        timestamp: Date.now(),
      };

      mockChatService.chat.mockResolvedValue(expectedResponse);

      const result = await controller.chat(request);

      expect(result).toEqual(expectedResponse);
      expect(service.chat).toHaveBeenCalledWith(request);
    });
  });

  describe('getConversations', () => {
    it('should return list of conversations', async () => {
      const mockConversations = [
        {
          id: 'conv-1',
          title: 'First conversation',
          messageCount: 5,
          createdAt: new Date(),
        },
        {
          id: 'conv-2',
          title: 'Second conversation',
          messageCount: 3,
          createdAt: new Date(),
        },
      ];

      mockChatService.getConversations.mockResolvedValue(mockConversations);

      const result = await controller.getConversations();

      expect(result).toEqual(mockConversations);
      expect(service.getConversations).toHaveBeenCalledWith(undefined, 20);
    });

    it('should return conversations with custom limit', async () => {
      const mockConversations = [{ id: 'conv-1', title: 'Test' }];

      mockChatService.getConversations.mockResolvedValue(mockConversations);

      const result = await controller.getConversations(undefined, '10');

      expect(result).toEqual(mockConversations);
      expect(service.getConversations).toHaveBeenCalledWith(undefined, 10);
    });

    it('should return conversations for specific user', async () => {
      const mockConversations = [{ id: 'conv-1', title: 'User conversation' }];

      mockChatService.getConversations.mockResolvedValue(mockConversations);

      const result = await controller.getConversations('user-123', '20');

      expect(result).toEqual(mockConversations);
      expect(service.getConversations).toHaveBeenCalledWith('user-123', 20);
    });
  });

  describe('getConversation', () => {
    it('should return conversation details', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test conversation',
        messages: [],
      };

      mockChatService.getConversation.mockResolvedValue(mockConversation);

      const result = await controller.getConversation('conv-1');

      expect(result).toEqual(mockConversation);
      expect(service.getConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should return conversation with messages', async () => {
      const mockConversation = {
        id: 'conv-1',
        title: 'Test conversation',
        messages: [
          { id: 'msg-1', role: 'user', content: 'Hello' },
          { id: 'msg-2', role: 'assistant', content: 'Hi!' },
        ],
      };

      mockChatService.getConversation.mockResolvedValue(mockConversation);

      const result = await controller.getConversation('conv-1');

      expect(result).toEqual(mockConversation);
      expect(result.messages).toHaveLength(2);
    });
  });

  describe('deleteConversation', () => {
    it('should delete a conversation', async () => {
      mockChatService.deleteConversation.mockResolvedValue(undefined);

      const result = await controller.deleteConversation('conv-1');

      expect(result).toEqual({ message: 'Conversation deleted successfully' });
      expect(service.deleteConversation).toHaveBeenCalledWith('conv-1', undefined);
      expect(service.deleteConversation).toHaveBeenCalledTimes(1);
    });

    it('should delete conversation with userId', async () => {
      mockChatService.deleteConversation.mockResolvedValue(undefined);

      const result = await controller.deleteConversation('conv-1', 'user-123');

      expect(result).toEqual({ message: 'Conversation deleted successfully' });
      expect(service.deleteConversation).toHaveBeenCalledWith('conv-1', 'user-123');
    });
  });
});
