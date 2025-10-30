import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('ChatService', () => {
  let service: ChatService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
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
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('chat', () => {
    it('should return hint level 1 for first message (no history)', async () => {
      const request: ChatRequestDto = {
        message: '什么是递归？',
        conversationHistory: [],
      };

      const response = await service.chat(request);

      expect(response).toBeDefined();
      expect(response.hintLevel).toBe(1);
      expect(response.reply).toContain('🤔');
      expect(response.reply).toContain('试着思考');
      expect(response.timestamp).toBeGreaterThan(0);
    });

    it('should return hint level 1 with one previous message', async () => {
      const request: ChatRequestDto = {
        message: '能再解释一下吗？',
        conversationHistory: [
          { role: 'user', content: '什么是递归？' },
        ],
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(1);
      expect(response.reply).toContain('🤔');
    });

    it('should return hint level 2 with 2-3 previous messages', async () => {
      const request: ChatRequestDto = {
        message: '还是不太明白',
        conversationHistory: [
          { role: 'user', content: '什么是递归？' },
          { role: 'assistant', content: '提示1...' },
          { role: 'user', content: '能再解释一下吗？' },
        ],
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(2);
      expect(response.reply).toContain('💡');
      expect(response.reply).toContain('思路');
    });

    it('should return hint level 3 with 4+ previous messages', async () => {
      const request: ChatRequestDto = {
        message: '能更详细吗？',
        conversationHistory: [
          { role: 'user', content: '问题1' },
          { role: 'assistant', content: '回答1' },
          { role: 'user', content: '问题2' },
          { role: 'assistant', content: '回答2' },
          { role: 'user', content: '问题3' },
          { role: 'assistant', content: '回答3' },
          { role: 'user', content: '问题4' },
        ],
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(3);
      expect(response.reply).toContain('✨');
      expect(response.reply).toContain('详细');
    });

    it('should handle empty conversation history', async () => {
      const request: ChatRequestDto = {
        message: '测试消息',
      };

      const response = await service.chat(request);

      expect(response.hintLevel).toBe(1);
      expect(response.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should count only user messages in history', async () => {
      const request: ChatRequestDto = {
        message: '当前问题',
        conversationHistory: [
          { role: 'user', content: '用户消息1' },
          { role: 'assistant', content: 'AI回答1' },
          { role: 'user', content: '用户消息2' },
          { role: 'assistant', content: 'AI回答2' },
        ],
      };

      const response = await service.chat(request);

      // 2 个用户消息 → hint level 2
      expect(response.hintLevel).toBe(2);
    });

    it('should generate timestamp close to current time', async () => {
      const beforeTime = Date.now();
      
      const request: ChatRequestDto = {
        message: '测试时间戳',
      };

      const response = await service.chat(request);
      const afterTime = Date.now();

      expect(response.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(response.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle very long conversation history', async () => {
      const longHistory = Array.from({ length: 20 }, (_, i) => ({
        role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
        content: `消息 ${i}`,
      }));

      const request: ChatRequestDto = {
        message: '继续提问',
        conversationHistory: longHistory,
      };

      const response = await service.chat(request);

      // 10+ 用户消息 → hint level 3
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
        const history = Array.from(
          { length: testCase.userMessages },
          (_, i) => ({ role: 'user' as const, content: `消息 ${i}` })
        );

        const request: ChatRequestDto = {
          message: '当前消息',
          conversationHistory: history,
        };

        const response = await service.chat(request);
        expect(response.hintLevel).toBe(testCase.expectedLevel);
      }
    });
  });

  describe('response content', () => {
    it('should return different content for different hint levels', async () => {
      const responses = await Promise.all([
        service.chat({ message: '测试', conversationHistory: [] }),
        service.chat({ 
          message: '测试', 
          conversationHistory: [
            { role: 'user', content: 'q1' },
            { role: 'user', content: 'q2' },
          ] 
        }),
        service.chat({ 
          message: '测试', 
          conversationHistory: [
            { role: 'user', content: 'q1' },
            { role: 'user', content: 'q2' },
            { role: 'user', content: 'q3' },
            { role: 'user', content: 'q4' },
          ] 
        }),
      ]);

      // 确保三个等级的回复内容不同
      expect(responses[0].reply).not.toBe(responses[1].reply);
      expect(responses[1].reply).not.toBe(responses[2].reply);
      expect(responses[0].reply).not.toBe(responses[2].reply);
    });
  });
});
