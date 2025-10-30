import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { UploadService } from './upload.service';

// Mock fs module
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
}));

import * as fs from 'fs';

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        'upload.allowedMimeTypes': [
          'application/pdf',
          'text/plain',
          'text/markdown',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'image/png',
          'image/jpeg',
          'image/gif',
        ],
        'upload.maxSize': 10 * 1024 * 1024, // 10MB
        'upload.uploadDir': './uploads',
        'baseUrl': 'http://localhost:4000',
      };
      return config[key];
    }),
  };

  const createMockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 1024,
    buffer: Buffer.from('test content'),
    stream: null as any,
    destination: './uploads',
    filename: '550e8400-e29b-41d4-a716-446655440000.pdf', // UUID filename
    path: './uploads/550e8400-e29b-41d4-a716-446655440000.pdf',
    ...overrides,
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    (fs.writeFileSync as jest.Mock).mockClear();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile - file type validation', () => {
    it('should accept PDF files', async () => {
      const file = createMockFile({ mimetype: 'application/pdf' });
      const result = await service.saveFile(file);
      
      expect(result).toHaveProperty('id');
      expect(result.mimetype).toBe('application/pdf');
    });

    it('should accept text files', async () => {
      const file = createMockFile({ 
        originalname: 'document.txt',
        mimetype: 'text/plain' 
      });
      const result = await service.saveFile(file);
      
      expect(result.mimetype).toBe('text/plain');
    });

    it('should accept image files', async () => {
      const imageTypes = ['image/png', 'image/jpeg', 'image/gif'];
      
      for (const mimetype of imageTypes) {
        const file = createMockFile({ mimetype });
        const result = await service.saveFile(file);
        expect(result.mimetype).toBe(mimetype);
      }
    });

    it('should accept Word documents', async () => {
      const docFile = createMockFile({ 
        originalname: 'document.docx',
        mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      const result = await service.saveFile(docFile);
      
      expect(result.mimetype).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    });

    it('should reject executable files', async () => {
      const file = createMockFile({ 
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream' 
      });

      await expect(service.saveFile(file)).rejects.toThrow(BadRequestException);
      await expect(service.saveFile(file)).rejects.toThrow('不支持的文件类型');
    });

    it('should reject video files', async () => {
      const file = createMockFile({ 
        originalname: 'video.mp4',
        mimetype: 'video/mp4' 
      });

      await expect(service.saveFile(file)).rejects.toThrow(BadRequestException);
      await expect(service.saveFile(file)).rejects.toThrow('不支持的文件类型');
    });

    it('should reject audio files', async () => {
      const file = createMockFile({ 
        originalname: 'audio.mp3',
        mimetype: 'audio/mpeg' 
      });

      await expect(service.saveFile(file)).rejects.toThrow(BadRequestException);
    });
  });

  describe('saveFile - file size validation', () => {
    it('should accept file within size limit', async () => {
      const file = createMockFile({ size: 5 * 1024 * 1024 }); // 5MB
      const result = await service.saveFile(file);
      
      expect(result.size).toBe(5 * 1024 * 1024);
    });

    it('should accept file exactly at size limit', async () => {
      const file = createMockFile({ size: 10 * 1024 * 1024 }); // 10MB
      const result = await service.saveFile(file);
      
      expect(result.size).toBe(10 * 1024 * 1024);
    });

    it('should reject file exceeding size limit', async () => {
      const file = createMockFile({ size: 11 * 1024 * 1024 }); // 11MB

      await expect(service.saveFile(file)).rejects.toThrow(BadRequestException);
      await expect(service.saveFile(file)).rejects.toThrow('文件大小超过限制');
    });

    it('should reject very large file', async () => {
      const file = createMockFile({ size: 50 * 1024 * 1024 }); // 50MB

      await expect(service.saveFile(file)).rejects.toThrow(BadRequestException);
    });

    it('should accept zero-size file', async () => {
      const file = createMockFile({ size: 0 });
      const result = await service.saveFile(file);
      
      expect(result.size).toBe(0);
    });

    it('should accept 1-byte file', async () => {
      const file = createMockFile({ 
        size: 1,
        buffer: Buffer.from('a')
      });
      const result = await service.saveFile(file);
      
      expect(result.size).toBe(1);
    });
  });

  describe('saveFile - file info generation', () => {
    it('should extract UUID from filename', async () => {
      const file = createMockFile({
        filename: '550e8400-e29b-41d4-a716-446655440000.pdf',
      });
      const result = await service.saveFile(file);

      expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
    });

    it('should preserve original filename', async () => {
      const file = createMockFile({ originalname: 'my-document.pdf' });
      const result = await service.saveFile(file);
      
      expect(result.filename).toBe('my-document.pdf');
    });

    it('should generate complete file URL', async () => {
      const file = createMockFile({
        filename: 'abc-123.pdf',
      });
      const result = await service.saveFile(file);
      
      expect(result.url).toContain('http://localhost:4000/uploads/');
      expect(result.url).toContain('abc-123.pdf');
    });

    it('should return all required fields', async () => {
      const file = createMockFile();
      const result = await service.saveFile(file);
      
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('filename');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('mimetype');
    });

    it('should handle different file extensions', async () => {
      const extensions = [
        { originalName: 'document.txt', filename: 'abc-123.txt', mime: 'text/plain' },
        { originalName: 'image.png', filename: 'def-456.png', mime: 'image/png' },
        { originalName: 'notes.md', filename: 'ghi-789.md', mime: 'text/markdown' },
      ];

      for (const { originalName, filename, mime } of extensions) {
        const file = createMockFile({ 
          originalname: originalName,
          filename: filename,
          mimetype: mime 
        });
        const result = await service.saveFile(file);
        
        expect(result.filename).toBe(originalName);
        expect(result.url).toContain(filename);
      }
    });
  });

  describe('saveFile - error handling', () => {
    it('should throw BadRequestException for invalid mime type', async () => {
      const file = createMockFile({ mimetype: 'application/x-executable' });
      
      await expect(service.saveFile(file)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for oversized file', async () => {
      const file = createMockFile({ size: 100 * 1024 * 1024 });
      
      await expect(service.saveFile(file)).rejects.toThrow(BadRequestException);
    });

    it('should include error details in exception message', async () => {
      const file = createMockFile({ mimetype: 'video/mp4' });
      
      try {
        await service.saveFile(file);
        fail('Should have thrown exception');
      } catch (error) {
        expect(error.message).toContain('不支持的文件类型');
        expect(error.message).toContain('video/mp4');
      }
    });
  });

  describe('saveFile - integration scenarios', () => {
    it('should handle multiple file uploads sequentially', async () => {
      const files = [
        createMockFile({ 
          originalname: 'file1.pdf',
          filename: '111-111.pdf',
        }),
        createMockFile({ 
          originalname: 'file2.txt', 
          filename: '222-222.txt',
          mimetype: 'text/plain' 
        }),
        createMockFile({ 
          originalname: 'file3.png', 
          filename: '333-333.png',
          mimetype: 'image/png' 
        }),
      ];

      const results: Array<{
        id: string;
        filename: string;
        url: string;
        size: number;
        mimetype: string;
      }> = [];
      
      for (const file of files) {
        const result = await service.saveFile(file);
        results.push(result);
      }

      expect(results).toHaveLength(3);
      
      // All IDs should be unique
      const ids = results.map(r => r.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });

    it('should handle files with special characters in name', async () => {
      const file = createMockFile({ 
        originalname: '文档-2025(测试).pdf' 
      });
      
      const result = await service.saveFile(file);
      expect(result.filename).toBe('文档-2025(测试).pdf');
    });

    it('should use ConfigService for settings', async () => {
      const file = createMockFile();
      await service.saveFile(file);
      
      expect(configService.get).toHaveBeenCalledWith('upload.allowedMimeTypes');
      expect(configService.get).toHaveBeenCalledWith('upload.maxSize');
      expect(configService.get).toHaveBeenCalledWith('baseUrl');
    });
  });
});
