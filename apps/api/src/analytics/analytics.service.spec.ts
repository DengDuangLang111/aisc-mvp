import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventName, EventCategory } from './analytics.types';
import { createMockPrismaService } from '../../test/helpers/prisma.mock';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('trackEvent', () => {
    it('should create an analytics event', async () => {
      const eventData = {
        userId: 'user-123',
        sessionId: 'session-456',
        eventName: EventName.FILE_UPLOAD_SUCCESS,
        eventCategory: EventCategory.DOCUMENT,
        eventProperties: { fileSize: 1024 },
      };

      (prisma.analyticsEvent.create as jest.Mock).mockResolvedValue({
        id: 'event-123',
        ...eventData,
      });

      await service.trackEvent(eventData);

      expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-456',
          eventName: EventName.FILE_UPLOAD_SUCCESS,
          eventCategory: EventCategory.DOCUMENT,
        }),
      });
    });

    it('should not throw error on failure', async () => {
      (prisma.analyticsEvent.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      // Should not throw
      await expect(
        service.trackEvent({
          sessionId: 'session-123',
          eventName: EventName.FILE_UPLOAD_SUCCESS,
          eventCategory: EventCategory.DOCUMENT,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('logApiUsage', () => {
    it('should log API usage', async () => {
      const usageData = {
        userId: 'user-123',
        endpoint: '/upload',
        method: 'POST',
        statusCode: 200,
        responseTimeMs: 150,
      };

      (prisma.apiUsageLog.create as jest.Mock).mockResolvedValue({
        id: 'log-123',
        ...usageData,
      });

      await service.logApiUsage(usageData);

      expect(prisma.apiUsageLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          endpoint: '/upload',
          method: 'POST',
          statusCode: 200,
        }),
      });
    });
  });

  describe('getActiveUsers', () => {
    it('should return count of active users', async () => {
      const mockResult = [
        { userId: 'user-1' },
        { userId: 'user-2' },
        { userId: 'user-3' },
      ];

      (prisma.analyticsEvent.groupBy as jest.Mock).mockResolvedValue(mockResult);

      const count = await service.getActiveUsers(30);

      expect(count).toBe(3);
      expect(prisma.analyticsEvent.groupBy).toHaveBeenCalledWith({
        by: ['userId'],
        where: expect.objectContaining({
          userId: { not: null },
        }),
      });
    });
  });

  describe('getApiErrorRate', () => {
    it('should calculate error rate correctly', async () => {
      (prisma.apiUsageLog.count as jest.Mock)
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5); // errors

      const errorRate = await service.getApiErrorRate(24);

      expect(errorRate).toBe(5);
    });

    it('should return 0 when no requests', async () => {
      (prisma.apiUsageLog.count as jest.Mock).mockResolvedValue(0);

      const errorRate = await service.getApiErrorRate(24);

      expect(errorRate).toBe(0);
    });
  });

  describe('getAverageResponseTime', () => {
    it('should calculate average response time', async () => {
      (prisma.apiUsageLog.aggregate as jest.Mock).mockResolvedValue({
        _avg: { responseTimeMs: 250.5 },
      });

      const avgTime = await service.getAverageResponseTime(24);

      expect(avgTime).toBe(250.5);
    });

    it('should return 0 when no data', async () => {
      (prisma.apiUsageLog.aggregate as jest.Mock).mockResolvedValue({
        _avg: { responseTimeMs: null },
      });

      const avgTime = await service.getAverageResponseTime(24);

      expect(avgTime).toBe(0);
    });
  });

  describe('getOcrCost', () => {
    it('should calculate OCR cost correctly (under 1000 pages)', async () => {
      (prisma.analyticsEvent.count as jest.Mock).mockResolvedValue(500);

      const result = await service.getOcrCost();

      expect(result.count).toBe(500);
      expect(result.estimatedCost).toBe(0); // Free tier
    });

    it('should calculate OCR cost correctly (over 1000 pages)', async () => {
      (prisma.analyticsEvent.count as jest.Mock).mockResolvedValue(2000);

      const result = await service.getOcrCost();

      expect(result.count).toBe(2000);
      expect(result.estimatedCost).toBe(1.5); // (2000-1000) * $1.50 / 1000
    });
  });

  describe('getDeepseekCost', () => {
    it('should calculate DeepSeek cost correctly', async () => {
      (prisma.message.aggregate as jest.Mock).mockResolvedValue({
        _sum: { tokensUsed: 1000000 }, // 1M tokens
      });

      const result = await service.getDeepseekCost();

      expect(result.tokens).toBe(1000000);
      expect(result.estimatedCost).toBe(0.21); // 1M * $0.21 / 1M
    });

    it('should return 0 when no tokens used', async () => {
      (prisma.message.aggregate as jest.Mock).mockResolvedValue({
        _sum: { tokensUsed: null },
      });

      const result = await service.getDeepseekCost();

      expect(result.tokens).toBe(0);
      expect(result.estimatedCost).toBe(0);
    });
  });
});
