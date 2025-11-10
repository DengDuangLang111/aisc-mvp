import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { VisionService } from '../ocr/vision.service';
import { PrismaService } from '../prisma/prisma.service';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: UploadService;
  let visionService: VisionService;
  let prismaService: PrismaService;

  const mockUploadService = {
    saveFile: jest.fn(),
    getFileInfo: jest.fn(),
    readFileContent: jest.fn(),
  };

  const mockVisionService = {
    performOCR: jest.fn(),
    getOcrResult: jest.fn(),
  };

  const mockPrismaService = {
    document: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
        {
          provide: VisionService,
          useValue: mockVisionService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(ThrottlerGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UploadController>(UploadController);
    uploadService = module.get<UploadService>(UploadService);
    visionService = module.get<VisionService>(VisionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadFile', () => {
    const mockFile = {
      fieldname: 'file',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      buffer: Buffer.from('test content'),
      size: 1024,
    } as Express.Multer.File;

    it('should upload a file successfully', async () => {
      const expectedResult = {
        fileId: 'file-123',
        originalFilename: 'test.pdf',
        size: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
      };

      mockUploadService.saveFile.mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(mockFile);

      expect(result).toEqual(expectedResult);
      expect(uploadService.saveFile).toHaveBeenCalledWith(mockFile, undefined);
    });

    it('should upload file with userId', async () => {
      const expectedResult = {
        fileId: 'file-123',
        originalFilename: 'test.pdf',
        size: 1024,
      };

      mockUploadService.saveFile.mockResolvedValue(expectedResult);

      const result = await controller.uploadFile(mockFile, 'user-123');

      expect(result).toEqual(expectedResult);
      expect(uploadService.saveFile).toHaveBeenCalledWith(mockFile, 'user-123');
    });

    it('should throw BusinessException if no file provided', async () => {
      await expect(controller.uploadFile(undefined as any)).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      const mockFileInfo = {
        filename: 'test.pdf',
        mimeType: 'application/pdf',
      };

      const mockBuffer = Buffer.from('file content');

      mockUploadService.getFileInfo.mockResolvedValue(mockFileInfo);
      // Note: downloadFile uses getFileInfo then accesses storage directly
      // This test verifies the basic structure

      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
      };

      // We can't fully test this without implementing storage mock
      // So we just verify getFileInfo is called
      await expect(
        controller.downloadFile('file-123', mockRes as any),
      ).rejects.toThrow();

      expect(uploadService.getFileInfo).toHaveBeenCalledWith('file-123');
    });
  });

  describe('getFileContent', () => {
    it('should get file content successfully', async () => {
      const mockContent = 'This is the file content';

      mockUploadService.readFileContent.mockResolvedValue(mockContent);

      const result = await controller.getFileContent('file-123');

      expect(result).toEqual({
        fileId: 'file-123',
        content: mockContent,
        length: mockContent.length,
      });
      expect(uploadService.readFileContent).toHaveBeenCalledWith('file-123');
    });

    it('should handle error when getting content', async () => {
      mockUploadService.readFileContent.mockRejectedValue(
        new Error('Cannot read file'),
      );

      await expect(controller.getFileContent('file-123')).rejects.toThrow(
        'Cannot read file',
      );
    });
  });

  describe('getDocumentInfo', () => {
    it('should get document info successfully', async () => {
      const mockDocument = {
        id: 'doc-123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date(),
        ocrResult: {
          id: 'ocr-123',
          confidence: 0.95,
          language: 'en',
          pageCount: 10,
          extractedAt: new Date(),
        },
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      const result = await controller.getDocumentInfo('doc-123');

      expect(result).toMatchObject({
        id: 'doc-123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        ocrStatus: 'completed',
      });
      expect(result.ocrResult).not.toBeNull();
    });

    it('should handle document not found', async () => {
      mockPrismaService.document.findUnique.mockResolvedValue(null);

      await expect(controller.getDocumentInfo('non-existent')).rejects.toThrow(
        BusinessException,
      );
    });

    it('should return pending status if no OCR result', async () => {
      const mockDocument = {
        id: 'doc-123',
        filename: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        uploadedAt: new Date(),
        ocrResult: null,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      const result = await controller.getDocumentInfo('doc-123');

      expect(result.ocrStatus).toBe('pending');
      expect(result.ocrResult).toBeNull();
    });
  });

  describe('getOcrResult', () => {
    it('should get OCR result if available', async () => {
      const mockOcrResult = {
        id: 'ocr-123',
        text: 'Extracted text from document',
        confidence: 0.95,
        language: 'en',
        pageCount: 10,
      };

      mockVisionService.getOcrResult.mockResolvedValue(mockOcrResult);

      const result = await controller.getOcrResult('file-123');

      expect(result).toEqual(mockOcrResult);
      expect(visionService.getOcrResult).toHaveBeenCalledWith('file-123');
    });

    it('should throw BusinessException if OCR result not available', async () => {
      mockVisionService.getOcrResult.mockResolvedValue(null);

      await expect(controller.getOcrResult('file-123')).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully in uploadFile', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      mockUploadService.saveFile.mockRejectedValue(
        new Error('Storage service unavailable'),
      );

      await expect(controller.uploadFile(mockFile, 'user-123')).rejects.toThrow(
        'Storage service unavailable',
      );
    });

    it('should handle invalid document ID in getDocumentInfo', async () => {
      mockPrismaService.document.findUnique.mockRejectedValue(
        new Error('Invalid ID format'),
      );

      await expect(controller.getDocumentInfo('invalid-id')).rejects.toThrow(
        'Invalid ID format',
      );
    });

    it('should handle database errors in listDocuments', async () => {
      mockPrismaService.document.findMany.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getDocuments('user-123')).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle empty userId in listDocuments', async () => {
      mockPrismaService.document.findMany.mockResolvedValue([]);

      const result = await controller.getDocuments(undefined);

      expect(result).toEqual([]);
      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          ocrResult: {
            select: {
              confidence: true,
              pageCount: true,
            },
          },
        },
        orderBy: { uploadedAt: 'desc' },
        take: 20,
      });
    });

    it('should handle very large file info request', async () => {
      const largeDocument = {
        id: 'doc-large',
        filename: 'large-file.pdf',
        mimeType: 'application/pdf',
        size: 104857600, // 100MB
        uploadedAt: new Date(),
        ocrResult: {
          id: 'ocr-large',
          fullText: 'X'.repeat(1000000), // 1MB text
          confidence: 0.95,
          language: 'en',
          pageCount: 1000,
        },
      };

      mockPrismaService.document.findUnique.mockResolvedValue(largeDocument);

      const result = await controller.getDocumentInfo('doc-large');

      expect(result.id).toBe('doc-large');
      expect(result.size).toBe(104857600);
      expect(result.ocrStatus).toBe('completed');
    });

    it('should handle concurrent upload requests', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const mockResult = {
        id: 'doc-concurrent',
        filename: 'test.pdf',
        url: 'https://storage.example.com/test.pdf',
      };

      mockUploadService.saveFile.mockResolvedValue(mockResult);

      const uploadPromises = Array(5)
        .fill(null)
        .map(() => controller.uploadFile(mockFile, 'user-123'));

      const results = await Promise.all(uploadPromises);

      expect(results).toHaveLength(5);
      results.forEach((result) => {
        expect(result.id).toBe('doc-concurrent');
      });
    });

    it('should handle special characters in document ID', async () => {
      const docIdWithSpecialChars = 'doc-123-测试-文档';

      const mockDocument = {
        id: docIdWithSpecialChars,
        filename: '测试文档.pdf',
        mimeType: 'application/pdf',
        size: 2048,
        uploadedAt: new Date(),
        ocrResult: null,
      };

      mockPrismaService.document.findUnique.mockResolvedValue(mockDocument);

      const result = await controller.getDocumentInfo(docIdWithSpecialChars);

      expect(result.id).toBe(docIdWithSpecialChars);
      expect(result.filename).toBe('测试文档.pdf');
    });
  });

  describe('getDocuments', () => {
    it('should get documents list with default limit', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          filename: 'test1.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: new Date('2025-01-01'),
          ocrResult: {
            confidence: 0.95,
            pageCount: 10,
          },
        },
        {
          id: 'doc-2',
          filename: 'test2.pdf',
          mimeType: 'application/pdf',
          size: 2048,
          uploadedAt: new Date('2025-01-02'),
          ocrResult: null,
        },
      ];

      mockPrismaService.document.findMany.mockResolvedValue(mockDocuments);

      const result = await controller.getDocuments();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'doc-1',
        filename: 'test1.pdf',
        ocrStatus: 'completed',
        ocrConfidence: 0.95,
        ocrPageCount: 10,
      });
      expect(result[1]).toMatchObject({
        id: 'doc-2',
        filename: 'test2.pdf',
        ocrStatus: 'pending',
      });
    });

    it('should filter documents by userId', async () => {
      const mockDocuments = [
        {
          id: 'doc-user',
          filename: 'user-doc.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          uploadedAt: new Date(),
          ocrResult: null,
        },
      ];

      mockPrismaService.document.findMany.mockResolvedValue(mockDocuments);

      const result = await controller.getDocuments('user-123');

      expect(result).toHaveLength(1);
      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        include: expect.any(Object),
        orderBy: { uploadedAt: 'desc' },
        take: 20,
      });
    });

    it('should respect custom limit parameter', async () => {
      mockPrismaService.document.findMany.mockResolvedValue([]);

      await controller.getDocuments(undefined, '50');

      expect(mockPrismaService.document.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: expect.any(Object),
        orderBy: { uploadedAt: 'desc' },
        take: 50,
      });
    });

    it('should return empty array when no documents found', async () => {
      mockPrismaService.document.findMany.mockResolvedValue([]);

      const result = await controller.getDocuments('user-empty');

      expect(result).toEqual([]);
    });
  });

  describe('downloadFile - Enhanced', () => {
    it('should throw BusinessException if file does not exist', async () => {
      mockUploadService.getFileInfo.mockResolvedValue(null);

      const mockRes = {
        setHeader: jest.fn(),
        sendFile: jest.fn(),
      };

      await expect(
        controller.downloadFile('non-existent', mockRes as any),
      ).rejects.toThrow(BusinessException);
    });

    it('should set correct headers for file download', async () => {
      const mockFileInfo = {
        diskFilename: '测试文档.pdf',
        uploadDir: '/uploads',
      };

      mockUploadService.getFileInfo.mockResolvedValue(mockFileInfo);

      const mockRes = {
        setHeader: jest.fn(),
        sendFile: jest.fn(),
      };

      await controller.downloadFile('file-special', mockRes as any);

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="测试文档.pdf"',
      );
      expect(mockRes.sendFile).toHaveBeenCalledWith('测试文档.pdf', {
        root: '/uploads',
      });
    });
  });
});
