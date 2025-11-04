import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { UploadService } from './upload.service';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentRepository } from './repositories/document.repository';
import { GcsService } from '../storage/gcs.service';
import { VisionService } from '../ocr/vision.service';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  createMockPrismaService,
  createMockDocument,
  createMockOcrResult,
} from '../../test/helpers/prisma.mock';
import { promises as fs } from 'fs';

// Mock fs functions
jest.spyOn(fs, 'readdir').mockImplementation(jest.fn());
jest.spyOn(fs, 'readFile').mockImplementation(jest.fn());
jest.spyOn(fs, 'writeFile').mockImplementation(jest.fn());
jest.spyOn(fs, 'unlink').mockImplementation(jest.fn());

jest.mock('file-type', () => ({ fromBuffer: jest.fn() }));

const fileTypeMock = require('file-type');

describe('UploadService', () => {
  let service: UploadService;
  // let prisma: any; // 不再需要
  let documentRepository: any;
  let gcsService: any;
  let analyticsService: any;
  let configService: any;

  beforeEach(async () => {
    // const mockPrismaService = createMockPrismaService(); // 不再需要，使用 DocumentRepository

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: DocumentRepository,
          useValue: {
            create: jest.fn().mockResolvedValue(createMockDocument()),
            findById: jest.fn(),
            findMany: jest.fn(),
            updateOcrStatus: jest.fn(),
          },
        },
        { provide: GcsService, useValue: { uploadFile: jest.fn() } },
        { provide: VisionService, useValue: { extractTextFromGcs: jest.fn() } },
        {
          provide: AnalyticsService,
          useValue: { trackEvent: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                GOOGLE_CLOUD_PROJECT_ID: 'test-project',
                'upload.allowedMimeTypes': [
                  'application/pdf',
                  'text/plain',
                  'image/jpeg',
                ],
                'upload.maxSize': 10 * 1024 * 1024,
                'upload.destination': './test-uploads',
                baseUrl: 'http://localhost:4000',
              };
              return config[key];
            }),
          },
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            info: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    documentRepository = module.get<DocumentRepository>(DocumentRepository);
    // prisma = module.get<PrismaService>(PrismaService); // 不再需要
    gcsService = module.get<GcsService>(GcsService);
    analyticsService = module.get<AnalyticsService>(AnalyticsService);
    configService = module.get<ConfigService>(ConfigService);

    fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
  });

  // Shared mock file for all tests
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

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile', () => {
    it('should upload file to GCS', async () => {
      gcsService.uploadFile.mockResolvedValue({
        gcsPath: 'gs://bucket/test.pdf',
        publicUrl: 'https://example.com/test.pdf',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-123' }),
      );

      const result = await service.saveFile(mockFile, 'user-123');

      expect(gcsService.uploadFile).toHaveBeenCalled();
      expect(result.documentId).toBe('doc-123');
    });

    it('should reject dangerous files', async () => {
      const dangerousFile = { ...mockFile, originalname: 'malware.exe' };
      await expect(service.saveFile(dangerousFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle files without userId', async () => {
      gcsService.uploadFile.mockResolvedValue({
        gcsPath: 'gs://bucket/test.pdf',
        publicUrl: 'https://example.com/test.pdf',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-456' }),
      );

      const result = await service.saveFile(mockFile);

      expect(result).toBeDefined();
      expect(result.documentId).toBe('doc-456');
    });
  });

  describe('File validation', () => {
    it('should reject file with invalid MIME type detected by magic number', async () => {
      const invalidFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'application/pdf', // Claims to be PDF
      };

      // But actual file content is executable
      fileTypeMock.fromBuffer.mockResolvedValue({
        mime: 'application/x-msdownload',
      });

      await expect(service.saveFile(invalidFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.saveFile(invalidFile)).rejects.toThrow(
        '文件类型不匹配',
      );
    });

    it('should reject file that is too large', async () => {
      const largeFile: Express.Multer.File = {
        ...mockFile,
        size: 20 * 1024 * 1024, // 20MB, exceeds 10MB limit
      };

      await expect(service.saveFile(largeFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.saveFile(largeFile)).rejects.toThrow(
        '文件大小超过限制',
      );
    });

    it('should reject file with mismatched declared and actual MIME type', async () => {
      const spoofedFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'image.jpg',
        mimetype: 'image/jpeg', // Claims to be JPEG
      };

      // But actual file content is PNG
      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'image/png' });

      await expect(service.saveFile(spoofedFile)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.saveFile(spoofedFile)).rejects.toThrow(
        '文件类型不匹配',
      );
    });

    it('should accept valid PDF file', async () => {
      const validFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'application/pdf',
        size: 5 * 1024 * 1024, // 5MB
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/test.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/test.pdf',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-valid' }),
      );

      const result = await service.saveFile(validFile);

      expect(result.documentId).toBe('doc-valid');
      expect(result.mimetype).toBe('application/pdf');
      expect(gcsService.uploadFile).toHaveBeenCalled();
    });

    it('should accept valid image file', async () => {
      const imageFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'image.jpg',
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024, // 2MB
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'image/jpeg' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/image.jpg',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/image.jpg',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-img' }),
      );

      const result = await service.saveFile(imageFile);

      expect(result.documentId).toBe('doc-img');
      expect(result.mimetype).toBe('image/jpeg');
      expect(gcsService.uploadFile).toHaveBeenCalled();
    });

    it('should reject text files without proper MIME type', async () => {
      const textFile: Express.Multer.File = {
        ...mockFile,
        originalname: 'test.txt',
        mimetype: 'text/plain',
        buffer: Buffer.from('plain text content'),
      };

      // file-type returns undefined for text files (no magic number)
      fileTypeMock.fromBuffer.mockResolvedValue(undefined);

      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/test.txt',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/test.txt',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-text' }),
      );

      const result = await service.saveFile(textFile);

      expect(result.documentId).toBe('doc-text');
      expect(result.mimetype).toBe('text/plain');
    });

    it('should handle GCS upload failure gracefully', async () => {
      const validFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockRejectedValue(
        new Error('GCS connection failed'),
      );

      await expect(service.saveFile(validFile)).rejects.toThrow();
    });

    it('should handle database creation failure', async () => {
      const validFile: Express.Multer.File = {
        ...mockFile,
        mimetype: 'application/pdf',
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/test.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/test.pdf',
      });
      (documentRepository.create as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(service.saveFile(validFile)).rejects.toThrow();
    });

    it('should sanitize dangerous filenames', async () => {
      const dangerousNameFile: Express.Multer.File = {
        ...mockFile,
        originalname: '../../../etc/passwd',
        mimetype: 'text/plain',
      };

      fileTypeMock.fromBuffer.mockResolvedValue(undefined); // text file
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/test.txt',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/test.txt',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-sanitized' }),
      );

      const result = await service.saveFile(dangerousNameFile);

      // Filename should be sanitized
      expect(result.documentId).toBe('doc-sanitized');
      expect(result.filename).not.toContain('..');
    });
  });

  describe('getFileInfo', () => {
    it('should return file information', async () => {
      const mockFiles = ['upload-123-test.pdf', 'other-file.txt'];
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles as any);

      const result = await service.getFileInfo('upload-123');

      // Debug: check if mock was called
      expect(fs.readdir).toHaveBeenCalled();
      expect(fs.readdir).toHaveBeenCalledWith('./test-uploads');

      expect(result).not.toBeNull();
      expect(result?.diskFilename).toBe('upload-123-test.pdf');
      expect(result?.uploadDir).toBe('./test-uploads');
    });

    it('should return null for non-existent file', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        'other-file.txt',
        'another-file.pdf',
      ] as any);

      const result = await service.getFileInfo('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('readFileContent', () => {
    it('should read text file content', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        'doc-123.txt',
        'other-file.pdf',
      ] as any);
      (fs.readFile as jest.Mock).mockResolvedValue('test content' as any);

      const result = await service.readFileContent('doc-123');

      expect(result).toBe('test content');
      expect(fs.readdir).toHaveBeenCalledWith('./test-uploads');
      expect(fs.readFile).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent file', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue([
        'other-file.txt',
        'another-file.pdf',
      ] as any);

      await expect(service.readFileContent('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should handle file read errors gracefully', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['doc-error.txt'] as any);
      (fs.readFile as jest.Mock).mockRejectedValue(
        new Error('Permission denied'),
      );

      await expect(service.readFileContent('doc-error')).rejects.toThrow();
    });

    it('should handle empty file content', async () => {
      (fs.readdir as jest.Mock).mockResolvedValue(['doc-empty.txt'] as any);
      (fs.readFile as jest.Mock).mockResolvedValue('' as any);

      const result = await service.readFileContent('doc-empty');

      expect(result).toBe('');
    });
  });

  describe('Edge Cases & Boundary Conditions', () => {
    it('should handle empty file (0 bytes)', async () => {
      const emptyFile: Express.Multer.File = {
        ...mockFile,
        buffer: Buffer.alloc(0),
        size: 0,
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/empty.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/empty.pdf',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-empty' }),
      );

      const result = await service.saveFile(emptyFile);

      expect(result.documentId).toBe('doc-empty');
      expect(result.size).toBe(0);
    });

    it('should handle file at exact max size limit', async () => {
      const maxSizeFile: Express.Multer.File = {
        ...mockFile,
        size: 10 * 1024 * 1024, // Exactly 10MB
        buffer: Buffer.alloc(10 * 1024 * 1024),
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/maxsize.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/maxsize.pdf',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-max' }),
      );

      const result = await service.saveFile(maxSizeFile);

      expect(result.documentId).toBe('doc-max');
      expect(result.size).toBe(10 * 1024 * 1024);
    });

    it('should handle very long filenames', async () => {
      const longFilename = 'a'.repeat(300) + '.pdf';
      const longNameFile: Express.Multer.File = {
        ...mockFile,
        originalname: longFilename,
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/long.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/long.pdf',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-long' }),
      );

      const result = await service.saveFile(longNameFile);

      expect(result.documentId).toBe('doc-long');
      expect(result.filename.length).toBeLessThanOrEqual(255);
    });

    it('should handle files with unicode characters in filename', async () => {
      const unicodeFile: Express.Multer.File = {
        ...mockFile,
        originalname: '测试文档📄.pdf',
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/unicode.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/unicode.pdf',
      });
      (documentRepository.create as jest.Mock).mockResolvedValue(
        createMockDocument({ id: 'doc-unicode' }),
      );

      const result = await service.saveFile(unicodeFile);

      expect(result.documentId).toBe('doc-unicode');
      expect(result.filename).toContain('测试文档');
    });

    it('should handle concurrent file uploads', async () => {
      const files: Express.Multer.File[] = Array(5)
        .fill(null)
        .map((_, i) => ({
          ...mockFile,
          originalname: `concurrent-${i}.pdf`,
        }));

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/test.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/test.pdf',
      });
      (documentRepository.create as jest.Mock).mockImplementation((data: any) =>
        Promise.resolve(createMockDocument({ id: `doc-${data.filename}` })),
      );

      const results = await Promise.all(files.map((f) => service.saveFile(f)));

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.documentId).toBeDefined();
      });
    });

    it('should handle GCS timeout gracefully', async () => {
      const timeoutFile: Express.Multer.File = {
        ...mockFile,
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockRejectedValue(
        new Error('Request timeout'),
      );

      await expect(service.saveFile(timeoutFile)).rejects.toThrow(
        'Request timeout',
      );
    });

    it('should validate multiple files with same name', async () => {
      const file1: Express.Multer.File = {
        ...mockFile,
        originalname: 'duplicate.pdf',
      };
      const file2: Express.Multer.File = {
        ...mockFile,
        originalname: 'duplicate.pdf',
      };

      fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
      (gcsService.uploadFile as jest.Mock).mockResolvedValue({
        gcsPath: 'uploads/test.pdf',
        publicUrl:
          'https://storage.googleapis.com/test-bucket/uploads/test.pdf',
      });

      let callCount = 0;
      (documentRepository.create as jest.Mock).mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          createMockDocument({ id: `doc-unique-${callCount}` }),
        );
      });

      const result1 = await service.saveFile(file1);
      const result2 = await service.saveFile(file2);

      expect(result1.documentId).not.toBe(result2.documentId);
      expect(result1.documentId).toBe('doc-unique-1');
      expect(result2.documentId).toBe('doc-unique-2');
    });
  });

  describe('getFileInfo - Additional Tests', () => {
    it('should return null when directory read fails', async () => {
      (fs.readdir as jest.Mock).mockRejectedValue(
        new Error('Directory not accessible'),
      );

      const result = await service.getFileInfo('any-id');

      expect(result).toBeNull();
    });

    it('should handle special characters in fileId', async () => {
      const specialId = 'file-with-测试-id';
      (fs.readdir as jest.Mock).mockResolvedValue([
        `${specialId}.pdf`,
        'other.txt',
      ] as any);

      const result = await service.getFileInfo(specialId);

      expect(result).not.toBeNull();
      expect(result?.diskFilename).toBe(`${specialId}.pdf`);
    });

    it('should handle multiple matching files', async () => {
      const fileId = 'multi';
      (fs.readdir as jest.Mock).mockResolvedValue([
        `${fileId}-1.pdf`,
        `${fileId}-2.pdf`,
        'other.txt',
      ] as any);

      const result = await service.getFileInfo(fileId);

      expect(result).not.toBeNull();
      expect(result?.diskFilename).toContain(fileId);
    });
  });
});
