import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');

describe('HealthService', () => {
  let service: HealthService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('getHealthStatus', () => {
    it('should return basic health status', () => {
      const result = service.getHealthStatus();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
      expect(typeof result.uptime).toBe('number');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should have valid timestamp format', () => {
      const result = service.getHealthStatus();
      const timestamp = new Date(result.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should increment uptime on subsequent calls', async () => {
      const result1 = service.getHealthStatus();

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result2 = service.getHealthStatus();

      expect(result2.uptime).toBeGreaterThanOrEqual(result1.uptime);
    });
  });

  describe('getDetailedHealthStatus', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'upload.directory') return './uploads';
        if (key === 'NODE_ENV') return 'test';
        return undefined;
      });

      // Mock fs methods
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockReturnValue(undefined);
    });

    it('should return detailed health status', () => {
      const result = service.getDetailedHealthStatus();

      expect(result).toHaveProperty('status', 'healthy');
      expect(result).toHaveProperty('timestamp');
      expect(result).toHaveProperty('uptime');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('memory');
      expect(result).toHaveProperty('environment');
      expect(result).toHaveProperty('dependencies');
      expect(result).toHaveProperty('process');
    });

    it('should include memory information', () => {
      const result = service.getDetailedHealthStatus();

      expect(result.memory).toHaveProperty('used');
      expect(result.memory).toHaveProperty('total');
      expect(result.memory).toHaveProperty('percentage');
      expect(result.memory).toHaveProperty('rss');
      expect(result.memory).toHaveProperty('external');
      expect(result.memory.used).toMatch(/\d+\.\d+ MB/);
      expect(result.memory.total).toMatch(/\d+\.\d+ MB/);
      expect(result.memory.percentage).toMatch(/\d+\.\d+%/);
      expect(result.memory.rss).toMatch(/\d+\.\d+ MB/);
      expect(result.memory.external).toMatch(/\d+\.\d+ MB/);
    });

    it('should include environment information', () => {
      const result = service.getDetailedHealthStatus();

      expect(result.environment).toBe('test');
    });

    it('should include process information', () => {
      const result = service.getDetailedHealthStatus();

      expect(result.process).toHaveProperty('pid');
      expect(result.process).toHaveProperty('nodeVersion');
      expect(result.process).toHaveProperty('platform');
      expect(result.process).toHaveProperty('cpuUsage');
      expect(typeof result.process.pid).toBe('number');
      expect(result.process.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(result.process.cpuUsage).toHaveProperty('user');
      expect(result.process.cpuUsage).toHaveProperty('system');
    });

    it('should include performance metrics', () => {
      const result = service.getDetailedHealthStatus();

      expect(result).toHaveProperty('performance');
      expect(result.performance).toHaveProperty('eventLoopDelay');
      expect(result.performance).toHaveProperty('activeHandles');
      expect(result.performance).toHaveProperty('activeRequests');
      expect(typeof result.performance.activeHandles).toBe('number');
      expect(typeof result.performance.activeRequests).toBe('number');
    });

    it('should check uploads directory availability', () => {
      const result = service.getDetailedHealthStatus();

      expect(result.dependencies.uploads).toHaveProperty('status');
      expect(result.dependencies.uploads).toHaveProperty('path');
      expect(result.dependencies.uploads).toHaveProperty('writable');
      expect(result.dependencies.uploads.status).toBe('available');
      expect(result.dependencies.uploads.writable).toBe(true);
    });

    it('should handle non-existent uploads directory', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = service.getDetailedHealthStatus();

      expect(result.dependencies.uploads.status).toBe('unavailable');
      expect(result.dependencies.uploads.writable).toBe(false);
    });

    it('should handle non-writable uploads directory', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.accessSync as jest.Mock).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = service.getDetailedHealthStatus();

      expect(result.dependencies.uploads.status).toBe('available');
      expect(result.dependencies.uploads.writable).toBe(false);
    });

    it('should use default upload directory if not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'test';
        return undefined; // No upload.directory configured
      });

      const result = service.getDetailedHealthStatus();

      expect(result.dependencies.uploads.path).toContain('uploads');
    });
  });
});
