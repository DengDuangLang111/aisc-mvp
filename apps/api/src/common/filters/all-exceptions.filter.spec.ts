import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import {
  BusinessException,
  ErrorCode,
} from '../exceptions/business.exception';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockLogger: any;

  beforeEach(async () => {
    mockLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AllExceptionsFilter,
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    filter = module.get<AllExceptionsFilter>(AllExceptionsFilter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const createMockArgumentsHost = (
    url = '/test',
    method = 'GET',
  ): ArgumentsHost => {
    const mockRequest = {
      url,
      method,
    };

    const mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    return {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      }),
      getArgs: jest.fn(),
      getArgByIndex: jest.fn(),
      switchToRpc: jest.fn(),
      switchToWs: jest.fn(),
      getType: jest.fn(),
    } as unknown as ArgumentsHost;
  };

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('catch - HttpException handling', () => {
    it('should handle HttpException with 400 Bad Request', () => {
      const exception = new HttpException(
        'Bad request',
        HttpStatus.BAD_REQUEST,
      );
      const host = createMockArgumentsHost('/upload', 'POST');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Bad request',
        timestamp: expect.any(String),
        path: '/upload',
      });
    });

    it('should handle HttpException with 404 Not Found', () => {
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);
      const host = createMockArgumentsHost('/api/missing', 'GET');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'Not found',
        timestamp: expect.any(String),
        path: '/api/missing',
      });
    });

    it('should handle HttpException with 401 Unauthorized', () => {
      const exception = new HttpException(
        'Unauthorized',
        HttpStatus.UNAUTHORIZED,
      );
      const host = createMockArgumentsHost('/auth/protected', 'GET');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(401);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle HttpException with 403 Forbidden', () => {
      const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);
      const host = createMockArgumentsHost('/admin', 'GET');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(403);
    });

    it('should handle HttpException with custom message object', () => {
      const exception = new HttpException(
        { error: 'Validation failed', fields: ['name', 'email'] },
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      const host = createMockArgumentsHost('/users', 'POST');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(422);
    });
  });

  describe('catch - Non-HttpException handling', () => {
    it('should handle generic Error as 500 Internal Server Error', () => {
      const exception = new Error('Database connection failed');
      const host = createMockArgumentsHost('/data', 'GET');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Database connection failed',
        details: undefined,
        timestamp: expect.any(String),
        path: '/data',
      });
    });

    it('should handle TypeError as 500', () => {
      const exception = new TypeError('Cannot read property of undefined');
      const host = createMockArgumentsHost('/compute', 'POST');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Exception Filter]',
        expect.objectContaining({
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Cannot read property of undefined',
          stack: expect.any(String),
        }),
      );
    });

    it('should handle unknown exception as 500', () => {
      const exception = 'String error'; // 非标准错误
      const host = createMockArgumentsHost('/unknown', 'DELETE');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        }),
      );
    });
  });

  describe('BusinessException handling', () => {
    it('should format BusinessException with custom code and details', () => {
      const exception = new BusinessException(
        ErrorCode.DOCUMENT_NOT_FOUND,
        'Document missing',
        HttpStatus.NOT_FOUND,
        { documentId: 'doc-123' },
      );
      const host = createMockArgumentsHost('/documents/doc-123', 'GET');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(404);
      expect(response.json).toHaveBeenCalledWith({
        statusCode: 404,
        code: ErrorCode.DOCUMENT_NOT_FOUND,
        message: 'Document missing',
        details: { documentId: 'doc-123' },
        timestamp: expect.any(String),
        path: '/documents/doc-123',
      });
    });
  });

  describe('catch - Logging', () => {
    it('should log error with correct context for HttpException', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const host = createMockArgumentsHost('/test-path', 'PUT');

      filter.catch(exception, host);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Exception Filter]',
        expect.objectContaining({
          timestamp: expect.any(String),
          path: '/test-path',
          method: 'PUT',
          status: 400,
          message: 'Test error',
        }),
      );
    });

    it('should log error with stack trace for non-HttpException', () => {
      const exception = new Error('Critical error');
      const host = createMockArgumentsHost('/critical', 'POST');

      filter.catch(exception, host);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Exception Filter]',
        expect.objectContaining({
          status: 500,
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Critical error',
          stack: expect.stringContaining('Critical error'),
        }),
      );
    });

    it('should handle exception without stack trace', () => {
      const exception = { message: 'Plain object error' };
      const host = createMockArgumentsHost('/plain', 'GET');

      filter.catch(exception, host);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '[Exception Filter]',
        expect.objectContaining({
          stack: undefined,
        }),
      );
    });
  });

  describe('catch - Response format', () => {
    it('should return response with all required fields', () => {
      const exception = new HttpException('Test', HttpStatus.BAD_REQUEST);
      const host = createMockArgumentsHost('/api/test', 'POST');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.json).toHaveBeenCalledWith({
        statusCode: 400,
        code: 'BAD_REQUEST',
        message: 'Test',
        details: undefined,
        timestamp: expect.any(String),
        path: '/api/test',
      });
    });

    it('should generate valid ISO timestamp', () => {
      const exception = new HttpException('Test', HttpStatus.OK);
      const host = createMockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      const beforeTime = new Date().toISOString();
      filter.catch(exception, host);
      const afterTime = new Date().toISOString();

      const callArgs = (response.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(
        callArgs.timestamp >= beforeTime && callArgs.timestamp <= afterTime,
      ).toBe(true);
    });

    it('should include correct path from request', () => {
      const exception = new HttpException('Test', HttpStatus.OK);
      const testPath = '/very/specific/path';
      const host = createMockArgumentsHost(testPath, 'PATCH');
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      const callArgs = (response.json as jest.Mock).mock.calls[0][0];
      expect(callArgs.path).toBe(testPath);
    });
  });

  describe('catch - Edge cases', () => {
    it('should handle exception with status 0', () => {
      const exception = new HttpException('Zero status', 0);
      const host = createMockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.status).toHaveBeenCalledWith(0);
    });

    it('should handle very long error messages', () => {
      const longMessage = 'Error '.repeat(1000);
      const exception = new HttpException(longMessage, HttpStatus.BAD_REQUEST);
      const host = createMockArgumentsHost();
      const response = host.switchToHttp().getResponse();

      filter.catch(exception, host);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: longMessage,
        }),
      );
    });

    it('should handle exceptions on different HTTP methods', () => {
      const methods = [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'OPTIONS',
        'HEAD',
      ];

      methods.forEach((method) => {
        const exception = new HttpException('Test', HttpStatus.OK);
        const host = createMockArgumentsHost('/test', method);
        const mockRequest = host.switchToHttp().getRequest();

        filter.catch(exception, host);

        expect(mockLogger.error).toHaveBeenCalledWith(
          '[Exception Filter]',
          expect.objectContaining({
            method,
          }),
        );
      });
    });
  });
});
