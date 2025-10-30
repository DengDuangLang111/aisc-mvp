import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;

  const mockHealthService = {
    getHealthStatus: jest.fn(),
    getDetailedHealthStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return health status', () => {
      const mockStatus = {
        status: 'healthy' as const,
        timestamp: '2025-10-30T00:00:00.000Z',
        uptime: 100,
        version: '1.0.0',
      };

      mockHealthService.getHealthStatus.mockReturnValue(mockStatus);

      const result = controller.getHealth();

      expect(result).toEqual(mockStatus);
      expect(mockHealthService.getHealthStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('getDetailedHealth', () => {
    it('should return detailed health status', () => {
      const mockDetailedStatus = {
        status: 'healthy' as const,
        timestamp: '2025-10-30T00:00:00.000Z',
        uptime: 100,
        version: '1.0.0',
        memory: {
          used: '50.00 MB',
          total: '100.00 MB',
          percentage: '50.00%',
        },
        environment: 'test',
        dependencies: {
          uploads: {
            status: 'available' as const,
            path: '/path/to/uploads',
            writable: true,
          },
        },
        process: {
          pid: 12345,
          nodeVersion: 'v18.0.0',
          platform: 'darwin',
        },
      };

      mockHealthService.getDetailedHealthStatus.mockReturnValue(mockDetailedStatus);

      const result = controller.getDetailedHealth();

      expect(result).toEqual(mockDetailedStatus);
      expect(mockHealthService.getDetailedHealthStatus).toHaveBeenCalledTimes(1);
    });
  });
});
