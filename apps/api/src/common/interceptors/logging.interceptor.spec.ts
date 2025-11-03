import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError, Observable } from 'rxjs';
import { LoggingInterceptor } from './logging.interceptor';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

describe('LoggingInterceptor', () => {
  let interceptor: LoggingInterceptor;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoggingInterceptor,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    interceptor = module.get<LoggingInterceptor>(LoggingInterceptor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockExecutionContext = (
    method = 'GET',
    url = '/test',
    ip = '127.0.0.1',
    userAgent = 'Jest Test Agent',
    statusCode = 200,
  ): ExecutionContext => {
    const mockRequest = {
      method,
      url,
      ip,
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return userAgent;
        return '';
      }),
    };

    const mockResponse = {
      statusCode,
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getClass: jest.fn(),
      getHandler: jest.fn(),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ExecutionContext;
  };

  const createMockCallHandler = (data: any = { result: 'success' }): CallHandler => {
    return {
      handle: jest.fn(() => of(data)),
    };
  };

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept - Request logging', () => {
    it('should log incoming request with correct information', (done) => {
      const context = createMockExecutionContext('GET', '/api/users', '192.168.1.1', 'Chrome/120');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          'Incoming GET /api/users',
          expect.objectContaining({
            context: 'HTTP',
            method: 'GET',
            url: '/api/users',
            ip: '192.168.1.1',
            userAgent: 'Chrome/120',
          }),
        );
        done();
      });
    });

    it('should log request with POST method', (done) => {
      const context = createMockExecutionContext('POST', '/api/upload');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          'Incoming POST /api/upload',
          expect.objectContaining({
            method: 'POST',
            url: '/api/upload',
          }),
        );
        done();
      });
    });

    it('should handle missing user-agent', (done) => {
      const context = createMockExecutionContext('GET', '/test', '127.0.0.1', '');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          expect.any(String),
          expect.objectContaining({
            userAgent: '',
          }),
        );
        done();
      });
    });

    it('should log all HTTP methods correctly', (done) => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
      let completed = 0;

      methods.forEach((method) => {
        const context = createMockExecutionContext(method, '/test');
        const next = createMockCallHandler();

        interceptor.intercept(context, next).subscribe(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            'info',
            `Incoming ${method} /test`,
            expect.any(Object),
          );
          completed++;
          if (completed === methods.length) done();
        });
      });
    });
  });

  describe('intercept - Response logging', () => {
    it('should log successful response with status code and timing', (done) => {
      const context = createMockExecutionContext('GET', '/api/data', '127.0.0.1', 'Test', 200);
      const next = createMockCallHandler({ data: 'test' });

      const startTime = Date.now();

      interceptor.intercept(context, next).subscribe(() => {
        const responseTime = Date.now() - startTime;

        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          expect.stringContaining('GET /api/data 200'),
          expect.objectContaining({
            context: 'HTTP',
            method: 'GET',
            url: '/api/data',
            statusCode: 200,
            responseTime: expect.any(Number),
            ip: '127.0.0.1',
          }),
        );

        const logCalls = mockLogger.log.mock.calls;
        const responseLog = logCalls.find((call: any) => call[1].includes('200'));
        expect(responseLog[2].responseTime).toBeGreaterThanOrEqual(0);
        expect(responseLog[2].responseTime).toBeLessThan(1000);

        done();
      });
    });

    it('should log response with 201 Created status', (done) => {
      const context = createMockExecutionContext('POST', '/api/users', '127.0.0.1', 'Test', 201);
      const next = createMockCallHandler({ id: 1, name: 'New User' });

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          expect.stringContaining('POST /api/users 201'),
          expect.objectContaining({
            statusCode: 201,
          }),
        );
        done();
      });
    });

    it('should measure response time accurately', (done) => {
      const context = createMockExecutionContext('GET', '/slow');
      const next = {
        handle: jest.fn(() => {
          return new Observable((subscriber) => {
            setTimeout(() => {
              subscriber.next({ result: 'delayed' });
              subscriber.complete();
            }, 50); // 50ms delay
          });
        }),
      };

      interceptor.intercept(context, next).subscribe(() => {
        const logCalls = mockLogger.log.mock.calls;
        const responseLog = logCalls.find((call: any) => call[1].includes('200'));
        
        expect(responseLog[2].responseTime).toBeGreaterThanOrEqual(40);
        expect(responseLog[2].responseTime).toBeLessThan(200);
        done();
      });
    });

    it('should log 2 times (request + response) for successful request', (done) => {
      const context = createMockExecutionContext('GET', '/test');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledTimes(2);
        done();
      });
    });
  });

  describe('intercept - Error handling', () => {
    it('should log error with status 500', (done) => {
      const context = createMockExecutionContext('POST', '/api/error');
      const error = new Error('Internal server error');
      (error as any).status = 500;

      const next = {
        handle: jest.fn(() => throwError(() => error)),
      };

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('POST /api/error 500'),
            expect.objectContaining({
              context: 'HTTP',
              method: 'POST',
              url: '/api/error',
              statusCode: 500,
              responseTime: expect.any(Number),
              error: 'Internal server error',
              stack: expect.any(String),
            }),
          );
          done();
        },
      });
    });

    it('should log error with status 400', (done) => {
      const context = createMockExecutionContext('POST', '/api/validate');
      const error = new Error('Validation failed');
      (error as any).status = 400;

      const next = {
        handle: jest.fn(() => throwError(() => error)),
      };

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('POST /api/validate 400'),
            expect.objectContaining({
              statusCode: 400,
              error: 'Validation failed',
            }),
          );
          done();
        },
      });
    });

    it('should default to 500 status for error without status', (done) => {
      const context = createMockExecutionContext('GET', '/api/crash');
      const error = new Error('Unexpected error');

      const next = {
        handle: jest.fn(() => throwError(() => error)),
      };

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.stringContaining('GET /api/crash 500'),
            expect.objectContaining({
              statusCode: 500,
              error: 'Unexpected error',
            }),
          );
          done();
        },
      });
    });

    it('should include error stack trace in log', (done) => {
      const context = createMockExecutionContext('DELETE', '/api/item');
      const error = new Error('Delete failed');
      (error as any).status = 500;

      const next = {
        handle: jest.fn(() => throwError(() => error)),
      };

      interceptor.intercept(context, next).subscribe({
        error: () => {
          const errorLog = mockLogger.error.mock.calls[0];
          expect(errorLog[1]).toHaveProperty('stack');
          expect(errorLog[1].stack).toContain('Delete failed');
          done();
        },
      });
    });

    it('should measure error response time', (done) => {
      const context = createMockExecutionContext('GET', '/api/fail');
      const error = new Error('Failed');
      (error as any).status = 503;

      const next = {
        handle: jest.fn(() => throwError(() => error)),
      };

      const startTime = Date.now();

      interceptor.intercept(context, next).subscribe({
        error: () => {
          const responseTime = Date.now() - startTime;
          expect(mockLogger.error).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
              responseTime: expect.any(Number),
            }),
          );

          const errorLog = mockLogger.error.mock.calls[0];
          expect(errorLog[1].responseTime).toBeGreaterThanOrEqual(0);
          expect(errorLog[1].responseTime).toBeLessThan(1000);
          done();
        },
      });
    });

    it('should log request start even if error occurs', (done) => {
      const context = createMockExecutionContext('PUT', '/api/update');
      const error = new Error('Update failed');

      const next = {
        handle: jest.fn(() => throwError(() => error)),
      };

      interceptor.intercept(context, next).subscribe({
        error: () => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            'info',
            'Incoming PUT /api/update',
            expect.any(Object),
          );
          expect(mockLogger.error).toHaveBeenCalled();
          done();
        },
      });
    });
  });

  describe('intercept - Edge cases', () => {
    it('should handle request with query parameters', (done) => {
      const context = createMockExecutionContext('GET', '/api/search?q=test&limit=10');
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          'Incoming GET /api/search?q=test&limit=10',
          expect.objectContaining({
            url: '/api/search?q=test&limit=10',
          }),
        );
        done();
      });
    });

    it('should handle request with special characters in URL', (done) => {
      const specialUrl = '/api/users/test@example.com';
      const context = createMockExecutionContext('GET', specialUrl);
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          `Incoming GET ${specialUrl}`,
          expect.objectContaining({
            url: specialUrl,
          }),
        );
        done();
      });
    });

    it('should handle IPv6 addresses', (done) => {
      const context = createMockExecutionContext(
        'GET',
        '/test',
        '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      );
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          expect.any(String),
          expect.objectContaining({
            ip: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
          }),
        );
        done();
      });
    });

    it('should handle very long URLs', (done) => {
      const longUrl = '/api/' + 'path/'.repeat(100);
      const context = createMockExecutionContext('GET', longUrl);
      const next = createMockCallHandler();

      interceptor.intercept(context, next).subscribe(() => {
        expect(mockLogger.log).toHaveBeenCalledWith(
          'info',
          expect.stringContaining(longUrl),
          expect.objectContaining({
            url: longUrl,
          }),
        );
        done();
      });
    });

    it('should handle different status codes', (done) => {
      const statuses = [200, 201, 204, 301, 302, 400, 401, 403, 404, 500, 503];
      let completed = 0;

      statuses.forEach((statusCode) => {
        const context = createMockExecutionContext('GET', '/test', '127.0.0.1', 'Test', statusCode);
        const next = createMockCallHandler();

        interceptor.intercept(context, next).subscribe(() => {
          expect(mockLogger.log).toHaveBeenCalledWith(
            'info',
            expect.stringContaining(`${statusCode}`),
            expect.objectContaining({
              statusCode,
            }),
          );
          completed++;
          if (completed === statuses.length) done();
        });
      });
    });
  });
});
