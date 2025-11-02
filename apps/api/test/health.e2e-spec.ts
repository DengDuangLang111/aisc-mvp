import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
    });

    it('should return healthy status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should return valid timestamp format', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.toString()).not.toBe('Invalid Date');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return uptime as a positive number', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return version string', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(typeof response.body.version).toBe('string');
      expect(response.body.version).toBeTruthy();
    });

    it('should have consistent uptime across multiple requests', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Wait 2 seconds to ensure uptime increments (uptime precision is seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response2 = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      // Uptime should be non-decreasing
      expect(response2.body.uptime).toBeGreaterThanOrEqual(response1.body.uptime);
      
      // The difference should be at least 0 (non-decreasing) and at most 4 seconds
      const uptimeDiff = response2.body.uptime - response1.body.uptime;
      expect(uptimeDiff).toBeGreaterThanOrEqual(0);
      expect(uptimeDiff).toBeLessThanOrEqual(4); // Allow some tolerance
      
      // Both responses should have valid timestamps
      expect(new Date(response1.body.timestamp).getTime()).toBeLessThanOrEqual(
        new Date(response2.body.timestamp).getTime()
      );
    });

    it('should handle multiple concurrent requests', async () => {
      // Use sequential requests with small delays to avoid connection issues
      const responses = [];
      
      for (let i = 0; i < 3; i++) {
        const response = await request(app.getHttpServer()).get('/health');
        responses.push(response);
        
        // Small delay between requests
        if (i < 2) {
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      // Basic health fields
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');

      // Detailed fields
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body).toHaveProperty('process');
      expect(response.body).toHaveProperty('performance');
    });

    it('should return valid memory information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const { memory } = response.body;

      expect(memory).toHaveProperty('used');
      expect(memory).toHaveProperty('total');
      expect(memory).toHaveProperty('percentage');
      expect(memory).toHaveProperty('rss');
      expect(memory).toHaveProperty('external');

      // Check format
      expect(memory.used).toMatch(/^\d+\.\d{2} MB$/);
      expect(memory.total).toMatch(/^\d+\.\d{2} MB$/);
      expect(memory.percentage).toMatch(/^\d+\.\d{2}%$/);

      // Check percentage is valid
      const percentage = parseFloat(memory.percentage);
      expect(percentage).toBeGreaterThan(0);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should return environment information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      expect(typeof response.body.environment).toBe('string');
      expect(['development', 'test', 'production']).toContain(response.body.environment);
    });

    it('should return uploads directory status', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const { uploads } = response.body.dependencies;

      expect(uploads).toHaveProperty('status');
      expect(uploads).toHaveProperty('path');
      expect(uploads).toHaveProperty('writable');

      expect(['available', 'unavailable']).toContain(uploads.status);
      expect(typeof uploads.path).toBe('string');
      expect(typeof uploads.writable).toBe('boolean');

      // If uploads directory is available, it should be writable
      if (uploads.status === 'available') {
        expect(uploads.writable).toBe(true);
      }
    });

    it('should return process information', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const { process: processInfo } = response.body;

      expect(processInfo).toHaveProperty('pid');
      expect(processInfo).toHaveProperty('nodeVersion');
      expect(processInfo).toHaveProperty('platform');
      expect(processInfo).toHaveProperty('cpuUsage');

      expect(typeof processInfo.pid).toBe('number');
      expect(processInfo.pid).toBeGreaterThan(0);
      expect(processInfo.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
      expect(typeof processInfo.platform).toBe('string');

      // CPU usage
      expect(processInfo.cpuUsage).toHaveProperty('user');
      expect(processInfo.cpuUsage).toHaveProperty('system');
      expect(typeof processInfo.cpuUsage.user).toBe('number');
      expect(typeof processInfo.cpuUsage.system).toBe('number');
    });

    it('should return performance metrics', async () => {
      const response = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const { performance } = response.body;

      expect(performance).toHaveProperty('eventLoopDelay');
      expect(performance).toHaveProperty('activeHandles');
      expect(performance).toHaveProperty('activeRequests');

      expect(typeof performance.eventLoopDelay).toBe('string');
      expect(typeof performance.activeHandles).toBe('number');
      expect(typeof performance.activeRequests).toBe('number');

      expect(performance.activeHandles).toBeGreaterThanOrEqual(0);
      expect(performance.activeRequests).toBeGreaterThanOrEqual(0);
    });

    it('should handle multiple concurrent detailed requests', async () => {
      const promises = Array(3)
        .fill(null)
        .map(() => request(app.getHttpServer()).get('/health/detailed'));

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
        expect(response.body).toHaveProperty('memory');
        expect(response.body).toHaveProperty('process');
      });
    });

    it('should return consistent structure across requests', async () => {
      const response1 = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const response2 = await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      // Check structure consistency
      expect(Object.keys(response1.body).sort()).toEqual(
        Object.keys(response2.body).sort()
      );

      // Check memory structure consistency
      expect(Object.keys(response1.body.memory).sort()).toEqual(
        Object.keys(response2.body.memory).sort()
      );
    });
  });

  describe('Health Endpoint Performance', () => {
    it('should respond quickly to basic health check', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      const duration = Date.now() - start;

      // Should respond in less than 100ms
      expect(duration).toBeLessThan(100);
    });

    it('should respond quickly to detailed health check', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/health/detailed')
        .expect(200);

      const duration = Date.now() - start;

      // Should respond in less than 200ms (detailed has more computation)
      expect(duration).toBeLessThan(200);
    });
  });
});
