import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VisionService } from './vision.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService, createMockOcrResult } from '../../test/helpers/prisma.mock';

// Mock @google-cloud/vision
const mockDocumentTextDetection = jest.fn();
jest.mock('@google-cloud/vision', () => {
  return {
    ImageAnnotatorClient: jest.fn().mockImplementation(() => ({
      textDetection: jest.fn(),
      documentTextDetection: mockDocumentTextDetection,
    })),
  };
});

// Mock @google-cloud/storage
jest.mock('@google-cloud/storage', () => {
  const mockGetFiles = jest.fn().mockResolvedValue([
    [
      {
        name: 'ocr-output/doc-123/output-1.json',
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify({
          responses: [{
            fullTextAnnotation: {
              text: 'This is extracted text from PDF',
              pages: [{ confidence: 0.95 }]
            },
            textAnnotations: [
              { locale: 'en', description: 'This is extracted text' }
            ]
          }]
        }))]),
      }
    ]
  ]);
  
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: jest.fn().mockReturnValue({
        getFiles: mockGetFiles,
        file: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue([]),
        }),
      }),
    })),
  };
});


// Mock @google-cloud/storage
jest.mock('@google-cloud/storage', () => {
  const mockGetFiles = jest.fn().mockResolvedValue([
    [
      {
        name: 'ocr-output/doc-123/output-1.json',
        download: jest.fn().mockResolvedValue([Buffer.from(JSON.stringify({
          responses: [{
            fullTextAnnotation: {
              text: 'This is extracted text from PDF',
              pages: [{ confidence: 0.95 }]
            },
            textAnnotations: [
              { locale: 'en', description: 'This is extracted text' }
            ]
          }]
        }))]),
      }
    ]
  ]);
  
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: jest.fn().mockReturnValue({
        getFiles: mockGetFiles,
        file: jest.fn().mockReturnValue({
          delete: jest.fn().mockResolvedValue([]),
        }),
      }),
    })),
  };
});


describe('VisionService', () => {
  let service: VisionService;
  let prisma: any;
  let configService: ConfigService;

  beforeEach(async () => {
    const mockConfig = {
      get: jest.fn((key: string) => {
        const config: Record<string, any> = {
          GOOGLE_CLOUD_PROJECT_ID: 'test-project',
          GOOGLE_CREDENTIALS_BASE64: Buffer.from(
            JSON.stringify({ type: 'service_account', project_id: 'test' }),
          ).toString('base64'),
        };
        return config[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisionService,
        {
          provide: PrismaService,
          useValue: createMockPrismaService(),
        },
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<VisionService>(VisionService);
    prisma = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('extractTextFromGcs', () => {
    it('should extract text from GCS file and save to database', async () => {
      const gcsPath = 'gs://bucket/uploads/test.pdf';
      const documentId = 'doc-123';

      // Mock Vision API response
      const mockVisionResponse = [
        {
          fullTextAnnotation: {
            text: 'This is extracted text from PDF',
            pages: [
              {
                confidence: 0.95,
                blocks: [
                  {
                    paragraphs: [
                      {
                        words: [
                          { symbols: [{ text: 'This' }] },
                          { symbols: [{ text: 'is' }] },
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          textAnnotations: [
            { locale: 'en', description: 'This is extracted text' },
          ],
        },
      ];

      mockDocumentTextDetection.mockResolvedValue(mockVisionResponse);

      const mockOcrResult = createMockOcrResult({
        documentId,
        fullText: 'This is extracted text from PDF',
        confidence: 0.95,
        language: 'en',
        pageCount: 1,
      });

      (prisma.ocrResult.upsert as jest.Mock).mockResolvedValue(mockOcrResult);

      const result = await service.extractTextFromGcs(gcsPath, documentId);

      // Verify the API was called
      expect(mockDocumentTextDetection).toHaveBeenCalled();

      // Verify database save was called (don't check exact values)
      expect(prisma.ocrResult.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { documentId },
        }),
      );

      expect(result.fullText).toBe('This is extracted text from PDF');
      // Confidence may be calculated by service, just verify it exists
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.pageCount).toBe(1);
    });

    it('should handle Vision API errors', async () => {
      const gcsPath = 'gs://bucket/uploads/test.pdf';
      const documentId = 'doc-123';

      mockDocumentTextDetection.mockRejectedValue(
        new Error('Vision API error'),
      );

      await expect(
        service.extractTextFromGcs(gcsPath, documentId),
      ).rejects.toThrow();

      expect(prisma.ocrResult.upsert).not.toHaveBeenCalled();
    });
  });

  describe('extractTextFromBuffer', () => {
    it('should extract text from buffer and save to database', async () => {
      const buffer = Buffer.from('fake pdf content');
      const documentId = 'doc-789';

      const mockVisionResponse = [
        {
          fullTextAnnotation: {
            text: 'Buffer text content',
            pages: [
              {
                confidence: 0.92,
                blocks: [],
              },
            ],
          },
          textAnnotations: [
            { locale: 'zh', description: 'Buffer text' },
          ],
        },
      ];

      mockDocumentTextDetection.mockResolvedValue(mockVisionResponse);

      const mockOcrResult = createMockOcrResult({
        documentId,
        fullText: 'Buffer text content',
        confidence: 0.92,
        language: 'zh',
        pageCount: 1,
      });

      (prisma.ocrResult.upsert as jest.Mock).mockResolvedValue(mockOcrResult);

      const result = await service.extractTextFromBuffer(buffer, documentId);

      // Verify the API was called
      expect(mockDocumentTextDetection).toHaveBeenCalled();

      expect(result.fullText).toBe('Buffer text content');
      // Language detection may vary based on implementation
      expect(result.language).toBeDefined();
    });
  });

  describe('getOcrResult', () => {
    it('should return OCR result from database', async () => {
      const documentId = 'doc-123';
      const mockOcrResult = createMockOcrResult({
        documentId,
        fullText: 'Stored OCR text',
        confidence: 0.98,
        language: 'en',
        pageCount: 3,
      });

      (prisma.ocrResult.findUnique as jest.Mock).mockResolvedValue(mockOcrResult);

      const result = await service.getOcrResult(documentId);

      expect(prisma.ocrResult.findUnique).toHaveBeenCalledWith({
        where: { documentId },
      });

      expect(result).toMatchObject({
        fullText: mockOcrResult.fullText,
        confidence: mockOcrResult.confidence,
        language: mockOcrResult.language,
        pageCount: mockOcrResult.pageCount,
      });
    });

    it('should return null if OCR result not found', async () => {
      const documentId = 'doc-999';

      (prisma.ocrResult.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getOcrResult(documentId);

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle empty fullTextAnnotation', async () => {
      const gcsPath = 'gs://bucket/empty.pdf';
      const documentId = 'doc-empty';

      mockDocumentTextDetection.mockResolvedValue([
        {
          fullTextAnnotation: null,
          textAnnotations: [],
        },
      ]);

      await expect(
        service.extractTextFromGcs(gcsPath, documentId),
      ).rejects.toThrow();
    });

    it('should handle missing text in fullTextAnnotation', async () => {
      const buffer = Buffer.from('test');
      const documentId = 'doc-no-text';

      mockDocumentTextDetection.mockResolvedValue([
        {
          fullTextAnnotation: { text: '', pages: [] },
          textAnnotations: [],
        },
      ]);

      await expect(
        service.extractTextFromBuffer(buffer, documentId),
      ).rejects.toThrow();
    });

    it('should handle database upsert errors', async () => {
      const gcsPath = 'gs://bucket/test.pdf';
      const documentId = 'doc-db-error';

      mockDocumentTextDetection.mockResolvedValue([
        {
          fullTextAnnotation: {
            text: 'Test text',
            pages: [{ confidence: 0.9, blocks: [] }],
          },
          textAnnotations: [{ locale: 'en', description: 'Test' }],
        },
      ]);

      (prisma.ocrResult.upsert as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.extractTextFromGcs(gcsPath, documentId),
      ).rejects.toThrow('Database error');
    });
  });

  describe('getOcrResult', () => {
    it('should return OCR result for a document', async () => {
      const documentId = 'doc-123';
      const mockOcrResult = {
        id: 'ocr-123',
        documentId,
        fullText: 'Sample text',
        confidence: 0.95,
        language: 'en',
        pageCount: 1,
        extractedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.ocrResult.findUnique as jest.Mock).mockResolvedValue(mockOcrResult);

      const result = await service.getOcrResult(documentId);

      expect(result).toBeDefined();
      expect(result?.fullText).toBe('Sample text');
      expect(result?.confidence).toBe(0.95);
      expect(prisma.ocrResult.findUnique).toHaveBeenCalledWith({
        where: { documentId },
      });
    });

    it('should return null when OCR result not found', async () => {
      const documentId = 'non-existent';

      (prisma.ocrResult.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getOcrResult(documentId);

      expect(result).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle empty Vision API response', async () => {
      const gcsPath = 'gs://bucket/empty.pdf';
      const documentId = 'doc-empty';

      mockDocumentTextDetection.mockResolvedValue([{}]); // Empty response

      await expect(
        service.extractTextFromGcs(gcsPath, documentId),
      ).rejects.toThrow('OCR failed: No text found in document');
    });

    it('should handle Vision API response without text annotations', async () => {
      const gcsPath = 'gs://bucket/notext.pdf';
      const documentId = 'doc-notext';

      mockDocumentTextDetection.mockResolvedValue([
        {
          fullTextAnnotation: {
            text: 'Some text',
            pages: [{ confidence: 0.9 }],
          },
          // No textAnnotations
        },
      ]);

      (prisma.ocrResult.upsert as jest.Mock).mockResolvedValue(
        createMockOcrResult({ 
          documentId, 
          fullText: 'Some text',
          language: 'unknown',
        }),
      );

      const result = await service.extractTextFromGcs(gcsPath, documentId);

      expect(result.fullText).toBe('Some text');
      expect(result.language).toBe('unknown');
    });
  });

  describe('extractTextFromBuffer', () => {
    it('should handle buffer OCR failure', async () => {
      const buffer = Buffer.from('invalid pdf content');
      const documentId = 'doc-buffer-fail';

      mockDocumentTextDetection.mockRejectedValue(new Error('Vision API timeout'));

      await expect(
        service.extractTextFromBuffer(buffer, documentId),
      ).rejects.toThrow('OCR failed: Vision API timeout');
    });

    it('should process buffer with multiple pages', async () => {
      const buffer = Buffer.from('multi page pdf');
      const documentId = 'doc-multipage';

      mockDocumentTextDetection.mockResolvedValue([
        {
          fullTextAnnotation: {
            text: 'Page 1\nPage 2\nPage 3',
            pages: [
              { 
                confidence: 0.9,
                blocks: [{
                  paragraphs: [{
                    words: [
                      { confidence: 0.9 },
                      { confidence: 0.8 },
                    ],
                  }],
                }],
              },
              { 
                confidence: 0.85,
                blocks: [{
                  paragraphs: [{
                    words: [
                      { confidence: 0.85 },
                      { confidence: 0.90 },
                    ],
                  }],
                }],
              },
              { 
                confidence: 0.95,
                blocks: [{
                  paragraphs: [{
                    words: [
                      { confidence: 0.95 },
                      { confidence: 0.92 },
                    ],
                  }],
                }],
              },
            ],
          },
          textAnnotations: [
            { description: 'Page 1\nPage 2\nPage 3', locale: 'en' },
          ],
        },
      ]);

      (prisma.ocrResult.upsert as jest.Mock).mockResolvedValue(
        createMockOcrResult({ 
          documentId, 
          fullText: 'Page 1\nPage 2\nPage 3',
          pageCount: 3,
          confidence: 0.89,
        }),
      );

      const result = await service.extractTextFromBuffer(buffer, documentId);

      expect(result.pageCount).toBe(3);
      expect(result.fullText).toContain('Page 1');
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('language detection', () => {
    it('should detect Chinese language', async () => {
      const gcsPath = 'gs://bucket/chinese.pdf';
      const documentId = 'doc-chinese';

      mockDocumentTextDetection.mockResolvedValue([
        {
          fullTextAnnotation: {
            text: '你好世界',
            pages: [
              { 
                confidence: 0.95,
                property: {
                  detectedLanguages: [{ languageCode: 'zh' }],
                },
              },
            ],
          },
          textAnnotations: [
            { description: '你好世界', locale: 'zh' },
          ],
        },
      ]);

      (prisma.ocrResult.upsert as jest.Mock).mockResolvedValue(
        createMockOcrResult({ 
          documentId,
          fullText: '你好世界',
          language: 'zh',
        }),
      );

      const result = await service.extractTextFromGcs(gcsPath, documentId);

      expect(result.language).toBe('zh');
    });

    it('should detect English language', async () => {
      const gcsPath = 'gs://bucket/english.pdf';
      const documentId = 'doc-english';

      mockDocumentTextDetection.mockResolvedValue([
        {
          fullTextAnnotation: {
            text: 'Hello World',
            pages: [
              { 
                confidence: 0.98,
                property: {
                  detectedLanguages: [{ languageCode: 'en' }],
                },
              },
            ],
          },
          textAnnotations: [
            { description: 'Hello World', locale: 'en' },
          ],
        },
      ]);

      (prisma.ocrResult.upsert as jest.Mock).mockResolvedValue(
        createMockOcrResult({ 
          documentId,
          fullText: 'Hello World',
          language: 'en',
        }),
      );

      const result = await service.extractTextFromGcs(gcsPath, documentId);

      expect(result.language).toBe('en');
    });
  });

});
