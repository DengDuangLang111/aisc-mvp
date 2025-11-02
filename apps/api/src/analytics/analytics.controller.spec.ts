import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let service: AnalyticsService;

  const mockAnalyticsService = {
    getActiveUsers: jest.fn(),
    getEventStats: jest.fn(),
    getApiErrorRate: jest.fn(),
    getAverageResponseTime: jest.fn(),
    getOcrCost: jest.fn(),
    getDeepseekCost: jest.fn(),
    getTopFeatures: jest.fn(),
    getUserRetention: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        {
          provide: AnalyticsService,
          useValue: mockAnalyticsService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsController>(AnalyticsController);
    service = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveUsers', () => {
    it('should return active users with default time range', async () => {
      mockAnalyticsService.getActiveUsers.mockResolvedValue(42);

      const result = await controller.getActiveUsers();

      expect(result).toEqual({
        activeUsers: 42,
        timeRange: '30 minutes',
      });
      expect(service.getActiveUsers).toHaveBeenCalledWith(30);
    });

    it('should return active users with custom time range', async () => {
      mockAnalyticsService.getActiveUsers.mockResolvedValue(15);

      const result = await controller.getActiveUsers('60');

      expect(result).toEqual({
        activeUsers: 15,
        timeRange: '60 minutes',
      });
      expect(service.getActiveUsers).toHaveBeenCalledWith(60);
    });
  });

  describe('getEventStats', () => {
    it('should return event stats with default days', async () => {
      const mockStats = [
        { eventName: 'page_view', count: 100 },
        { eventName: 'click', count: 50 },
      ];
      mockAnalyticsService.getEventStats.mockResolvedValue(mockStats);

      const result = await controller.getEventStats();

      expect(result.events).toEqual(mockStats);
      expect(result.timeRange.startDate).toBeDefined();
      expect(result.timeRange.endDate).toBeDefined();
      expect(service.getEventStats).toHaveBeenCalledTimes(1);
    });

    it('should return event stats with custom days', async () => {
      const mockStats = [{ eventName: 'login', count: 20 }];
      mockAnalyticsService.getEventStats.mockResolvedValue(mockStats);

      const result = await controller.getEventStats('14');

      expect(result.events).toEqual(mockStats);
      expect(service.getEventStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('getApiStats', () => {
    it('should return API stats with default hours', async () => {
      mockAnalyticsService.getApiErrorRate.mockResolvedValue(2.5);
      mockAnalyticsService.getAverageResponseTime.mockResolvedValue(150.75);

      const result = await controller.getApiStats();

      expect(result).toEqual({
        timeRange: '24 hours',
        errorRate: '2.50%',
        averageResponseTime: '150.75ms',
      });
      expect(service.getApiErrorRate).toHaveBeenCalledWith(24);
      expect(service.getAverageResponseTime).toHaveBeenCalledWith(24);
    });

    it('should return API stats with custom hours', async () => {
      mockAnalyticsService.getApiErrorRate.mockResolvedValue(1.2);
      mockAnalyticsService.getAverageResponseTime.mockResolvedValue(120);

      const result = await controller.getApiStats('48');

      expect(result).toEqual({
        timeRange: '48 hours',
        errorRate: '1.20%',
        averageResponseTime: '120.00ms',
      });
      expect(service.getApiErrorRate).toHaveBeenCalledWith(48);
      expect(service.getAverageResponseTime).toHaveBeenCalledWith(48);
    });
  });

  describe('getCost', () => {
    it('should return cost estimation for current month', async () => {
      mockAnalyticsService.getOcrCost.mockResolvedValue({
        count: 100,
        estimatedCost: 15.0,
      });
      mockAnalyticsService.getDeepseekCost.mockResolvedValue({
        tokens: 50000,
        estimatedCost: 0.25,
      });

      const result = await controller.getCost();

      expect(result.ocr).toEqual({
        pages: 100,
        cost: '$15.00',
      });
      expect(result.ai).toEqual({
        tokens: 50000,
        cost: '$0.25',
      });
      expect(result.total.cost).toBe('$15.25');
      expect(result.month).toMatch(/^\d{4}-\d{2}$/);
    });
  });

  describe('getTopFeatures', () => {
    it('should return top features with default limit', async () => {
      const mockFeatures = [
        { feature: 'chat', count: 500 },
        { feature: 'upload', count: 300 },
      ];
      mockAnalyticsService.getTopFeatures.mockResolvedValue(mockFeatures);

      const result = await controller.getTopFeatures();

      expect(result).toEqual({
        timeRange: 'Last 7 days',
        features: mockFeatures,
      });
      expect(service.getTopFeatures).toHaveBeenCalledWith(10);
    });

    it('should return top features with custom limit', async () => {
      const mockFeatures = [{ feature: 'search', count: 200 }];
      mockAnalyticsService.getTopFeatures.mockResolvedValue(mockFeatures);

      const result = await controller.getTopFeatures('5');

      expect(result.features).toEqual(mockFeatures);
      expect(service.getTopFeatures).toHaveBeenCalledWith(5);
    });
  });

  describe('getRetention', () => {
    it('should return retention rate with default days', async () => {
      mockAnalyticsService.getUserRetention.mockResolvedValue(65.5);

      const result = await controller.getRetention();

      expect(result).toEqual({
        days: 7,
        retentionRate: '65.50%',
      });
      expect(service.getUserRetention).toHaveBeenCalledWith(7);
    });

    it('should return retention rate with custom days', async () => {
      mockAnalyticsService.getUserRetention.mockResolvedValue(80.25);

      const result = await controller.getRetention('30');

      expect(result).toEqual({
        days: 30,
        retentionRate: '80.25%',
      });
      expect(service.getUserRetention).toHaveBeenCalledWith(30);
    });
  });

  describe('getOverview', () => {
    it('should return comprehensive analytics overview', async () => {
      mockAnalyticsService.getActiveUsers.mockResolvedValue(42);
      mockAnalyticsService.getApiErrorRate.mockResolvedValue(2.5);
      mockAnalyticsService.getAverageResponseTime.mockResolvedValue(150);
      mockAnalyticsService.getOcrCost.mockResolvedValue({
        count: 100,
        estimatedCost: 15.0,
      });
      mockAnalyticsService.getDeepseekCost.mockResolvedValue({
        tokens: 50000,
        estimatedCost: 0.25,
      });
      mockAnalyticsService.getTopFeatures.mockResolvedValue([
        { feature: 'chat', count: 500 },
      ]);
      mockAnalyticsService.getUserRetention.mockResolvedValue(65.5);

      const result = await controller.getOverview();

      expect(result.activeUsers).toEqual({
        count: 42,
        timeRange: '30 minutes',
      });
      expect(result.api).toEqual({
        errorRate: '2.50%',
        averageResponseTime: '150.00ms',
        timeRange: '24 hours',
      });
      expect(result.cost.total).toBe('$15.25');
      expect(result.topFeatures).toHaveLength(1);
      expect(result.retention.rate).toBe('65.50%');
      expect(result.timestamp).toBeDefined();
    });
  });
});
