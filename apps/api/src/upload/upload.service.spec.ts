import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UploadService } from './upload.service';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

// Mock fs module
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  promises: {
    readdir: jest.fn(),
    readFile: jest.fn(),
  },
}));

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: jest.fn(),
}));

import * as fs from 'fs';
import { fileTypeFromBuffer } from 'file-type';

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, unknown> = {
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
        'upload.destination': './uploads',
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
    jest.clearAllMocks();
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: WINSTON_MODULE_PROVIDER,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    (fs.writeFileSync as jest.Mock).mockClear();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.mkdirSync as jest.Mock).mockClear();
    
    // Setup file-type mock - by default return PDF type (most common in tests)
    // Individual tests can override this for specific file types
    (fileTypeFromBuffer as jest.Mock).mockResolvedValue({ 
      ext: 'pdf', 
      mime: 'application/pdf' 
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile - file type validation', () => {
    it('should accept PDF files', async () => {
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({ 
        ext: 'pdf', 
        mime: 'application/pdf' 
      });
      
      const file = createMockFile({ mimetype: 'application/pdf' });
      const result = await service.saveFile(file);
      
      expect(result).toHaveProperty('id');
      expect(result.mimetype).toBe('application/pdf');
    });

    it('should accept text files', async () => {
      // Text files don't have magic numbers
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue(undefined);
      
      const file = createMockFile({ 
        originalname: 'document.txt',
        mimetype: 'text/plain' 
      });
      const result = await service.saveFile(file);
      
      expect(result.mimetype).toBe('text/plain');
    });

    it('should accept image files', async () => {
      const mimetypes = ['image/png', 'image/jpeg', 'image/gif'];
      
      for (const mimetype of mimetypes) {
        (fileTypeFromBuffer as jest.Mock).mockResolvedValue({ 
          ext: mimetype.split('/')[1], 
          mime: mimetype 
        });
        
        const file = createMockFile({ mimetype });
        const result = await service.saveFile(file);
        expect(result.mimetype).toBe(mimetype);
      }
    });

    it('should accept Word documents', async () => {
      const mimetype = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      (fileTypeFromBuffer as jest.Mock).mockResolvedValue({ 
        ext: 'docx', 
        mime: mimetype 
      });
      
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
      await expect(service.saveFile(file)).rejects.toThrow('不允许上传可执行文件类型');
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
      // Parentheses are sanitized to underscores for security
      expect(result.filename).toBe('文档-2025_测试_.pdf');
    });

    it('should use ConfigService for settings', async () => {
      const file = createMockFile();
      await service.saveFile(file);
      
      expect(configService.get).toHaveBeenCalledWith('upload.allowedMimeTypes');
      expect(configService.get).toHaveBeenCalledWith('upload.maxSize');
      expect(configService.get).toHaveBeenCalledWith('baseUrl');
    });
  });

  describe('readFileContent', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should read text file content successfully', async () => {
      const fileId = 'test-file-123';
      const fileContent = 'This is test content';
      
      // Mock readdir to return file list
      (fs.promises.readdir as jest.Mock).mockResolvedValue([
        'test-file-123.txt',
        'other-file.pdf',
      ]);
      
      // Mock readFile to return content
      (fs.promises.readFile as jest.Mock).mockResolvedValue(fileContent);
      
      const result = await service.readFileContent(fileId);
      
      expect(result).toBe(fileContent);
      expect(fs.promises.readdir).toHaveBeenCalledWith('./uploads');
      expect(fs.promises.readFile).toHaveBeenCalledWith(
        expect.stringContaining('test-file-123.txt'),
        'utf-8'
      );
      expect(mockLogger.log).toHaveBeenCalledWith(
        'info',
        'File content read successfully',
        expect.objectContaining({
          fileId,
          contentLength: fileContent.length,
        })
      );
    });

    it('should throw NotFoundException for non-existent file', async () => {
      const fileId = 'non-existent-file';
      
      // Mock readdir to return empty list
      (fs.promises.readdir as jest.Mock).mockResolvedValue([
        'other-file.txt',
      ]);
      
      await expect(service.readFileContent(fileId)).rejects.toThrow(NotFoundException);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'File not found',
        expect.objectContaining({ fileId })
      );
    });

    it('should throw BadRequestException on read error', async () => {
      const fileId = 'error-file';
      
      (fs.promises.readdir as jest.Mock).mockResolvedValue([
        'error-file.txt',
      ]);
      
      // Mock readFile to throw error
      (fs.promises.readFile as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );
      
      await expect(service.readFileContent(fileId)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to read file content',
        expect.objectContaining({
          fileId,
          error: 'Permission denied',
        })
      );
    });
  });

  describe('Enhanced Security Features', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Dangerous File Detection', () => {
      it('should reject executable files', async () => {
        const dangerousFiles = [
          'virus.exe',
          'malware.dll',
          'script.bat',
          'command.cmd',
          'shell.sh',
          'app.jar',
        ];

        for (const filename of dangerousFiles) {
          const file = createMockFile({ 
            originalname: filename,
            mimetype: 'application/octet-stream',
          });

          await expect(service.saveFile(file)).rejects.toThrow(
            BadRequestException
          );
          expect(mockLogger.warn).toHaveBeenCalledWith(
            'Dangerous file type detected',
            expect.objectContaining({ filename })
          );
        }
      });

      it('should allow safe file types', async () => {
        const safeFiles = ['document.pdf', 'text.txt', 'image.png'];
        
        // Mock file-type detection
        const { fileTypeFromBuffer } = require('file-type');
        jest.mock('file-type');
        (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
          mime: 'application/pdf',
          ext: 'pdf',
        });

        for (const filename of safeFiles) {
          const file = createMockFile({ originalname: filename });
          const result = await service.saveFile(file);
          
          expect(result).toHaveProperty('id');
          expect(result).toHaveProperty('url');
        }
      });
    });

    describe('Filename Sanitization', () => {
      it('should sanitize dangerous filenames', async () => {
        const dangerousNames = [
          '../../../etc/passwd',
          '..\\..\\windows\\system32',
          'file<script>.txt',
          'file|pipe.txt',
          'file;command.txt',
        ];

        // Mock file-type
        const { fileTypeFromBuffer } = require('file-type');
        (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
          mime: 'text/plain',
          ext: 'txt',
        });

        for (const name of dangerousNames) {
          const file = createMockFile({ 
            originalname: name,
            mimetype: 'text/plain',
          });
          
          const result = await service.saveFile(file);
          
          // 清理后的文件名不应包含危险字符
          expect(result.filename).not.toContain('..');
          expect(result.filename).not.toContain('<');
          expect(result.filename).not.toContain('>');
          expect(result.filename).not.toContain('|');
          expect(mockLogger.log).toHaveBeenCalledWith(
            'info',
            'Filename sanitized',
            expect.any(Object)
          );
        }
      });

      it('should preserve Chinese characters in filename', async () => {
        const { fileTypeFromBuffer } = require('file-type');
        (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
          mime: 'text/plain',
          ext: 'txt',
        });

        const file = createMockFile({ 
          originalname: '测试文档-2025.txt',
          mimetype: 'text/plain',
        });
        
        const result = await service.saveFile(file);
        
        expect(result.filename).toContain('测试文档');
        expect(result.filename).toContain('2025');
      });
    });

    describe('File Type Validation (Magic Number)', () => {
      it('should validate file type using magic numbers', async () => {
        const { fileTypeFromBuffer } = require('file-type');
        
        // Mock: 声明是 PNG，但实际是 EXE
        (fileTypeFromBuffer as jest.Mock).mockResolvedValue({
          mime: 'application/x-msdownload', // EXE 文件
          ext: 'exe',
        });

        const file = createMockFile({ 
          originalname: 'fake-image.png',
          mimetype: 'image/png', // 声称是 PNG
        });

        await expect(service.saveFile(file)).rejects.toThrow(
          BadRequestException
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'File type mismatch detected',
          expect.objectContaining({
            declared: 'image/png',
            actual: 'application/x-msdownload',
          })
        );
      });

      it('should reject files with undetectable type', async () => {
        const { fileTypeFromBuffer } = require('file-type');
        (fileTypeFromBuffer as jest.Mock).mockResolvedValue(undefined);

        const file = createMockFile({ originalname: 'unknown.dat' });

        await expect(service.saveFile(file)).rejects.toThrow(
          BadRequestException
        );
        expect(mockLogger.warn).toHaveBeenCalledWith(
          'Unable to detect file type from buffer',
          expect.any(Object)
        );
      });
    });
  });
});
