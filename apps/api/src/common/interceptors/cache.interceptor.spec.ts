import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { HttpCacheInterceptor } from './cache.interceptor';

describe('HttpCacheInterceptor', () => {
  let interceptor: HttpCacheInterceptor;
  let cacheManager: any;

  beforeEach(async () => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HttpCacheInterceptor,
        {
          provide: CACHE_MANAGER,
          useValue: cacheManager,
        },
      ],
    }).compile();

    interceptor = module.get<HttpCacheInterceptor>(HttpCacheInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (method: string, url: string, query: any = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          method,
          url,
          query,
        }),
      }),
    } as ExecutionContext;
  };

  const createMockCallHandler = (data: any): CallHandler => {
    return {
      handle: () => of(data),
    } as CallHandler;
  };

  describe('GET requests', () => {
    it('should return cached response if available', async () => {
      const cachedData = { message: 'cached' };
      cacheManager.get.mockResolvedValue(cachedData);

      const context = createMockExecutionContext('GET', '/test');
      const next = createMockCallHandler({ message: 'new' });

      const result = await interceptor.intercept(context, next);
      const data = await result.toPromise();

      expect(data).toEqual(cachedData);
      expect(cacheManager.get).toHaveBeenCalledWith('cache:/test:{}');
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should cache response if not in cache', async () => {
      const responseData = { message: 'new response' };
      cacheManager.get.mockResolvedValue(null);

      const context = createMockExecutionContext('GET', '/test');
      const next = createMockCallHandler(responseData);

      const result = await interceptor.intercept(context, next);
      const data = await result.toPromise();

      // Wait for async tap operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(data).toEqual(responseData);
      expect(cacheManager.get).toHaveBeenCalledWith('cache:/test:{}');
      expect(cacheManager.set).toHaveBeenCalledWith(
        'cache:/test:{}',
        responseData,
        60000,
      );
    });

    it('should generate different cache keys for different URLs', async () => {
      cacheManager.get.mockResolvedValue(null);

      const context1 = createMockExecutionContext('GET', '/test1');
      const context2 = createMockExecutionContext('GET', '/test2');
      const next = createMockCallHandler({ message: 'response' });

      await interceptor.intercept(context1, next);
      await interceptor.intercept(context2, next);

      expect(cacheManager.get).toHaveBeenCalledWith('cache:/test1:{}');
      expect(cacheManager.get).toHaveBeenCalledWith('cache:/test2:{}');
    });

    it('should include query parameters in cache key', async () => {
      cacheManager.get.mockResolvedValue(null);

      const context = createMockExecutionContext('GET', '/test', { page: 1, limit: 10 });
      const next = createMockCallHandler({ message: 'response' });

      await interceptor.intercept(context, next);

      expect(cacheManager.get).toHaveBeenCalledWith(
        'cache:/test:{"page":1,"limit":10}',
      );
    });
  });

  describe('non-GET requests', () => {
    it('should not cache POST requests', async () => {
      const context = createMockExecutionContext('POST', '/test');
      const next = createMockCallHandler({ message: 'created' });

      const result = await interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should not cache PUT requests', async () => {
      const context = createMockExecutionContext('PUT', '/test');
      const next = createMockCallHandler({ message: 'updated' });

      const result = await interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should not cache DELETE requests', async () => {
      const context = createMockExecutionContext('DELETE', '/test');
      const next = createMockCallHandler({ message: 'deleted' });

      const result = await interceptor.intercept(context, next);
      await result.toPromise();

      expect(cacheManager.get).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });

  describe('cache behavior', () => {
    it('should not cache non-object responses', async () => {
      cacheManager.get.mockResolvedValue(null);

      const context = createMockExecutionContext('GET', '/test');
      const next = createMockCallHandler('string response');

      const result = await interceptor.intercept(context, next);
      await result.toPromise();

      // Wait for async tap operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('should cache null object responses', async () => {
      cacheManager.get.mockResolvedValue(null);

      const context = createMockExecutionContext('GET', '/test');
      const next = createMockCallHandler(null);

      const result = await interceptor.intercept(context, next);
      await result.toPromise();

      // Wait for async tap operation
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(cacheManager.set).not.toHaveBeenCalled();
    });
  });
});
