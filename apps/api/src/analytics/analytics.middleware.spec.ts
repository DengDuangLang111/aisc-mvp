import { Test, TestingModule } from '@nestjs/testing';
import { Request, Response, NextFunction } from 'express';
import { AnalyticsMiddleware } from './analytics.middleware';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsMiddleware', () => {
  let middleware: AnalyticsMiddleware;
  let analyticsService: jest.Mocked<AnalyticsService>;

  const mockRequest = {
    method: 'GET',
    path: '/api/test',
    headers: {
      'user-agent': 'test-agent',
    },
    body: {},
    query: {},
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockResponse = {
    statusCode: 200,
    on: jest.fn((event: string, callback: () => void) => {
      if (event === 'finish') {
        callback();
      }
      return mockResponse;
    }),
  } as unknown as Response;

  const mockNext: NextFunction = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsMiddleware,
        {
          provide: AnalyticsService,
          useValue: {
            trackEvent: jest.fn().mockResolvedValue(undefined),
            logApiUsage: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    middleware = module.get<AnalyticsMiddleware>(AnalyticsMiddleware);
    analyticsService = module.get(AnalyticsService);
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should track API request and call next', () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockResponse.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('should log API usage on response finish', async () => {
    middleware.use(mockRequest, mockResponse, mockNext);

    // Wait for async operations
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(analyticsService.logApiUsage).toHaveBeenCalledWith({
      endpoint: '/api/test',
      method: 'GET',
      statusCode: 200,
      responseTime: expect.any(Number),
    });
  });

  it('should handle errors gracefully', () => {
    analyticsService.logApiUsage.mockRejectedValue(new Error('Analytics error'));

    expect(() => {
      middleware.use(mockRequest, mockResponse, mockNext);
    }).not.toThrow();

    expect(mockNext).toHaveBeenCalled();
  });

  it('should track different HTTP methods', () => {
    const postRequest = { ...mockRequest, method: 'POST' } as Request;

    middleware.use(postRequest, mockResponse, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle requests with different status codes', async () => {
    const errorResponse = {
      ...mockResponse,
      statusCode: 500,
    } as unknown as Response;

    middleware.use(mockRequest, errorResponse, mockNext);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(analyticsService.logApiUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
      })
    );
  });
});
