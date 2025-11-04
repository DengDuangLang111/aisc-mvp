import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { ChatModule } from '../src/chat/chat.module';
import { ChatService } from '../src/chat/chat.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';

describe('ChatController (e2e)', () => {
  let app: INestApplication;
  let chatService: ChatService;

  const mockChatService = {
    chat: jest.fn(),
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        ThrottlerModule.forRoot([
          {
            ttl: 60000,
            limit: 20,
          },
        ]),
        ChatModule,
      ],
    })
      .overrideProvider(ChatService)
      .useValue(mockChatService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    chatService = moduleFixture.get<ChatService>(ChatService);
  });

  afterEach(async () => {
    jest.clearAllMocks();
    await app.close();
  });

  describe('POST /chat', () => {
    it('should return chat response for valid request', async () => {
      const mockResponse = {
        reply: 'Hello! How can I help you today?',
        model: 'glm-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 8,
          total_tokens: 18,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
        })
        .expect(201);

      expect(response.body).toEqual(mockResponse);
      expect(mockChatService.chat).toHaveBeenCalledWith({
        message: 'Hello',
      });
    });

    it('should handle chat with conversation history', async () => {
      const mockResponse = {
        reply: 'Sure, I remember our previous conversation.',
        model: 'glm-4',
        usage: {
          prompt_tokens: 25,
          completion_tokens: 9,
          total_tokens: 34,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      const response = await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'What did we talk about?',
          conversationHistory: [
            { role: 'user', content: 'My name is John' },
            { role: 'assistant', content: 'Nice to meet you, John!' },
          ],
        })
        .expect(201);

      expect(response.body).toEqual(mockResponse);
      expect(mockChatService.chat).toHaveBeenCalledWith({
        message: 'What did we talk about?',
        conversationHistory: [
          { role: 'user', content: 'My name is John' },
          { role: 'assistant', content: 'Nice to meet you, John!' },
        ],
      });
    });

    it('should handle chat with fileId', async () => {
      const mockResponse = {
        reply: 'Response with file context',
        model: 'glm-4',
        usage: {
          prompt_tokens: 15,
          completion_tokens: 5,
          total_tokens: 20,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Analyze this file',
          fileId: 'test-file-id-123',
        })
        .expect(201);

      expect(mockChatService.chat).toHaveBeenCalledWith({
        message: 'Analyze this file',
        fileId: 'test-file-id-123',
      });
    });

    it('should handle long messages', async () => {
      const longMessage = 'This is a very long message. '.repeat(100);
      const mockResponse = {
        reply: 'Response to long message',
        model: 'glm-4',
        usage: {
          prompt_tokens: 500,
          completion_tokens: 4,
          total_tokens: 504,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: longMessage,
        })
        .expect(201);

      expect(mockChatService.chat).toHaveBeenCalledWith({
        message: longMessage,
      });
    });
  });

  describe('POST /chat - Validation', () => {
    it('should reject request without message', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat')
        .send({})
        .expect(400);

      expect(
        Array.isArray(response.body.message) &&
          response.body.message.some((m: string) => m.includes('message')),
      ).toBeTruthy();
      expect(mockChatService.chat).not.toHaveBeenCalled();
    });

    it('should reject message exceeding max length', async () => {
      const longMessage = 'x'.repeat(4001);
      const response = await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: longMessage,
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(mockChatService.chat).not.toHaveBeenCalled();
    });

    it('should reject invalid conversationHistory format', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
          conversationHistory: 'invalid-history',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(mockChatService.chat).not.toHaveBeenCalled();
    });

    it('should reject conversationHistory with invalid role', async () => {
      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
          conversationHistory: [{ role: 'invalid-role', content: 'Test' }],
        })
        .expect(400);

      expect(mockChatService.chat).not.toHaveBeenCalled();
    });

    it('should accept conversationHistory with empty content', async () => {
      const mockResponse = {
        reply: 'Response',
        model: 'glm-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 1,
          total_tokens: 11,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
          conversationHistory: [{ role: 'user', content: '' }],
        })
        .expect(201);

      expect(mockChatService.chat).toHaveBeenCalled();
    });

    it('should reject conversationHistory with content exceeding max length', async () => {
      const longContent = 'x'.repeat(4001);
      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
          conversationHistory: [{ role: 'user', content: longContent }],
        })
        .expect(400);

      expect(mockChatService.chat).not.toHaveBeenCalled();
    });

    it('should reject non-whitelisted properties', async () => {
      const response = await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
          unauthorizedField: 'should be rejected',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
      expect(mockChatService.chat).not.toHaveBeenCalled();
    });

    it('should accept valid fileId', async () => {
      const mockResponse = {
        reply: 'Response',
        model: 'glm-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 1,
          total_tokens: 11,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Analyze file',
          fileId: 'abc-123',
        })
        .expect(201);

      expect(mockChatService.chat).toHaveBeenCalledWith({
        message: 'Analyze file',
        fileId: 'abc-123',
      });
    });
  });

  describe('POST /chat - Error Handling', () => {
    it('should handle service errors', async () => {
      mockChatService.chat.mockRejectedValue(
        new Error('AI service unavailable'),
      );

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
        })
        .expect(500);
    });

    it('should handle timeout errors', async () => {
      mockChatService.chat.mockRejectedValue(new Error('Request timeout'));

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
        })
        .expect(500);
    });

    it('should handle rate limiting errors', async () => {
      mockChatService.chat.mockRejectedValue(new Error('Rate limit exceeded'));

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Hello',
        })
        .expect(500);
    });
  });

  describe('POST /chat - Content Types', () => {
    it('should accept application/json content type', async () => {
      const mockResponse = {
        reply: 'Response',
        model: 'glm-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 1,
          total_tokens: 11,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .post('/chat')
        .set('Content-Type', 'application/json')
        .send({
          message: 'Hello',
        })
        .expect(201);
    });

    it('should reject invalid JSON', async () => {
      await request(app.getHttpServer())
        .post('/chat')
        .set('Content-Type', 'application/json')
        .send('invalid-json')
        .expect(400);
    });
  });

  describe('POST /chat - Special Characters', () => {
    it('should handle messages with special characters', async () => {
      const mockResponse = {
        reply: 'Response',
        model: 'glm-4',
        usage: {
          prompt_tokens: 15,
          completion_tokens: 1,
          total_tokens: 16,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      const specialMessage = 'Hello! 你好 🎉 @#$%^&*()';

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: specialMessage,
        })
        .expect(201);

      expect(mockChatService.chat).toHaveBeenCalledWith({
        message: specialMessage,
      });
    });

    it('should handle messages with emojis', async () => {
      const mockResponse = {
        reply: '😊',
        model: 'glm-4',
        usage: {
          prompt_tokens: 12,
          completion_tokens: 1,
          total_tokens: 13,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Send me an emoji 😊🎉🚀',
        })
        .expect(201);
    });

    it('should handle messages with line breaks', async () => {
      const mockResponse = {
        reply: 'Response',
        model: 'glm-4',
        usage: {
          prompt_tokens: 20,
          completion_tokens: 1,
          total_tokens: 21,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      const multilineMessage = 'Line 1\nLine 2\nLine 3';

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: multilineMessage,
        })
        .expect(201);

      expect(mockChatService.chat).toHaveBeenCalledWith({
        message: multilineMessage,
      });
    });
  });

  describe('POST /chat - Performance', () => {
    it('should handle multiple sequential requests', async () => {
      const mockResponse = {
        reply: 'Response',
        model: 'glm-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 1,
          total_tokens: 11,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer())
          .post('/chat')
          .send({
            message: `Sequential request ${i}`,
          })
          .expect(201);

        expect(response.body).toEqual(mockResponse);
      }

      expect(mockChatService.chat).toHaveBeenCalledTimes(3);
    });

    it('should respond within reasonable time', async () => {
      const mockResponse = {
        reply: 'Quick response',
        model: 'glm-4',
        usage: {
          prompt_tokens: 10,
          completion_tokens: 2,
          total_tokens: 12,
        },
      };

      mockChatService.chat.mockResolvedValue(mockResponse);

      const startTime = Date.now();

      await request(app.getHttpServer())
        .post('/chat')
        .send({
          message: 'Quick message',
        })
        .expect(201);

      const responseTime = Date.now() - startTime;

      // Should respond within 5 seconds (with mock service)
      expect(responseTime).toBeLessThan(5000);
    });
  });
});
