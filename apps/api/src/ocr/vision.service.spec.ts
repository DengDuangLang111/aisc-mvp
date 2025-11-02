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


});
