import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { UploadService } from './upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { VisionService } from '../ocr/vision.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { createMockPrismaService, createMockDocument, createMockOcrResult } from '../../test/helpers/prisma.mock';

jest.mock('fs/promises');
jest.mock('file-type', () => ({ fromBuffer: jest.fn() }));

import * as fs from 'fs/promises';
const fileTypeMock = require('file-type');

describe('UploadService', () => {
  let service: UploadService;
  let prisma: any;
  let gcsService: any;
  let analyticsService: any;
  let configService: any;

  beforeEach(async () => {
    const mockPrismaService = createMockPrismaService();
    
    // 确保 upload 表的 mock 正确配置
    mockPrismaService.upload = {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: GcsService, useValue: { uploadFile: jest.fn() } },
        { provide: VisionService, useValue: { extractTextFromGcs: jest.fn() } },
        { provide: AnalyticsService, useValue: { trackEvent: jest.fn().mockResolvedValue(undefined) } },
        { provide: ConfigService, useValue: { get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            GOOGLE_CLOUD_PROJECT_ID: 'test-project',
            'upload.allowedMimeTypes': ['application/pdf', 'text/plain', 'image/jpeg'],
            'upload.maxSize': 10 * 1024 * 1024,
            baseUrl: 'http://localhost:4000',
          };
          return config[key];
        }) } },
        { provide: WINSTON_MODULE_PROVIDER, useValue: { 
          log: jest.fn(), 
          error: jest.fn(), 
          warn: jest.fn(), 
          debug: jest.fn(), 
          info: jest.fn() 
        } },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    prisma = module.get<PrismaService>(PrismaService);
    gcsService = module.get<GcsService>(GcsService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    configService = module.get<ConfigService>(ConfigService);

    fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('fake pdf'),
      size: 1024,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    it('should upload file to GCS', async () => {
      gcsService.uploadFile.mockResolvedValue({ gcsPath: 'gs://bucket/test.pdf', publicUrl: 'https://example.com/test.pdf' });
      (prisma.document.create as jest.Mock).mockResolvedValue(createMockDocument({ id: 'doc-123' }));

      const result = await service.saveFile(mockFile, 'user-123');

      expect(gcsService.uploadFile).toHaveBeenCalled();
      expect(result.documentId).toBe('doc-123');
    });

    it('should reject dangerous files', async () => {
      const dangerousFile = { ...mockFile, originalname: 'malware.exe' };
      await expect(service.saveFile(dangerousFile)).rejects.toThrow(BadRequestException);
    });

    it('should handle files without userId', async () => {
      gcsService.uploadFile.mockResolvedValue({ gcsPath: 'gs://bucket/test.pdf', publicUrl: 'https://example.com/test.pdf' });
      (prisma.document.create as jest.Mock).mockResolvedValue(createMockDocument({ id: 'doc-456' }));

      const result = await service.saveFile(mockFile);

      expect(result).toBeDefined();
      expect(result.documentId).toBe('doc-456');
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const mockUpload = {
        id: 'upload-123',
        diskFilename: 'test-123.pdf',
        originalFilename: 'test.pdf',
      };
      (prisma.upload.findUnique as jest.Mock).mockResolvedValue(mockUpload);

      const result = await service.getFileInfo('upload-123');

      expect(result).toBeDefined();
      expect(result?.diskFilename).toBe('test-123.pdf');
    });

    it('should return null for non-existent file', async () => {
      (prisma.upload.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getFileInfo('non-existent');
      
      expect(result).toBeNull();
    });
  });

  describe('readFileContent', () => {
    it('should read text file content', async () => {
      const mockDoc = createMockDocument({ 
        id: 'doc-123', 
        gcsPath: 'gs://bucket/test.txt',
        mimeType: 'text/plain',
        diskFilename: 'test.txt'
      });
      const mockUpload = {
        id: 'upload-123',
        diskFilename: 'test.txt',
        documentId: 'doc-123',
      };
      (prisma.upload.findUnique as jest.Mock).mockResolvedValue(mockUpload);
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDoc);
      (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from('test content'));

      const result = await service.readFileContent('upload-123');

      expect(result).toBe('test content');
    });

    it('should throw NotFoundException for non-existent upload', async () => {
      (prisma.upload.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.readFileContent('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('file validation', () => {
    it('should detect dangerous file extensions', () => {
      const dangerousFiles = ['malware.exe', 'script.bat', 'virus.sh', 'app.app'];
      dangerousFiles.forEach(filename => {
        expect((service as any).isDangerousFile(filename)).toBe(true);
      });
    });

    it('should allow safe file extensions', () => {
      const safeFiles = ['document.pdf', 'image.jpg', 'text.txt', 'data.json'];
      safeFiles.forEach(filename => {
        expect((service as any).isDangerousFile(filename)).toBe(false);
      });
    });

    it('should validate allowed MIME types', () => {
      expect((service as any).isAllowedMimeType('application/pdf')).toBe(true);
      expect((service as any).isAllowedMimeType('text/plain')).toBe(true);
      expect((service as any).isAllowedMimeType('application/x-executable')).toBe(false);
    });
  });

  describe('file size limits', () => {
    it('should reject files exceeding max size', async () => {
      const largeFile = {
        ...mockFile,
        size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
      };

      await expect(service.saveFile(largeFile)).rejects.toThrow(BadRequestException);
    });
  });

  describe('session and tracking', () => {
    it('should generate unique session IDs', () => {
      const sessionId1 = (service as any).generateSessionId();
      const sessionId2 = (service as any).generateSessionId();
      
      expect(sessionId1).toBeDefined();
      expect(sessionId2).toBeDefined();
      expect(sessionId1).not.toBe(sessionId2);
    });

    it('should track analytics events during upload', async () => {
      gcsService.uploadFile.mockResolvedValue({ 
        gcsPath: 'gs://bucket/test.pdf', 
        publicUrl: 'https://example.com/test.pdf' 
      });
      (prisma.document.create as jest.Mock).mockResolvedValue(createMockDocument({ id: 'doc-123' }));

      await service.saveFile(mockFile, 'user-123');

      expect(analyticsService.trackEvent).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle GCS upload failures gracefully', async () => {
      gcsService.uploadFile.mockRejectedValue(new Error('GCS error'));

      await expect(service.saveFile(mockFile, 'user-123')).rejects.toThrow();
      expect(analyticsService.trackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventName: 'file_upload_failed'
        })
      );
    });

    it('should handle database creation errors', async () => {
      gcsService.uploadFile.mockResolvedValue({ 
        gcsPath: 'gs://bucket/test.pdf', 
        publicUrl: 'https://example.com/test.pdf' 
      });
      (prisma.document.create as jest.Mock).mockRejectedValue(new Error('DB error'));

      await expect(service.saveFile(mockFile, 'user-123')).rejects.toThrow();
    });
  });
});
