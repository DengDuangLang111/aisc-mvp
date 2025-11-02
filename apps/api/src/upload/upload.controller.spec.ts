import { Test, TestingModule } from '@nestjs/testing';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { VisionService } from '../ocr/vision.service';
import { PrismaService } from '../prisma/prisma.service';
import { ThrottlerGuard } from '@nestjs/throttler';

describe('UploadController', () => {
  let controller: UploadController;
  let service: UploadService;

  const mockUploadService = {
    saveFile: jest.fn(),
  };

  const mockVisionService = {
    analyzeImage: jest.fn().mockResolvedValue({
      fullText: 'Test OCR text',
      confidence: 0.95,
      language: 'en',
    }),
    processOcr: jest.fn(),
    getOcrResult: jest.fn(),
  };

  const mockPrismaService = {
    document: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ocrResult: {
      create: jest.fn(),
      findUnique: jest.fn(),
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
    service = module.get<UploadService>(UploadService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
