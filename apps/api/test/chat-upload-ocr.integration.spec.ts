import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ChatService } from '../src/chat/chat.service';
import { UploadService } from '../src/upload/upload.service';
import { VisionService } from '../src/ocr/vision.service';

// Lightweight integration-style test to verify module wiring and core flow.
// External systems (Prisma, GCS, Vision API, Analytics) are mocked by their own unit tests.

describe('Chat + Upload + OCR integration (lightweight)', () => {
  let app: INestApplication;
  let chatService: ChatService;
  let uploadService: UploadService;
  let visionService: VisionService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(VisionService)
      .useValue({
        extractTextFromGcs: jest.fn().mockResolvedValue({
          fullText: 'dummy text',
          confidence: 0.9,
          language: 'en',
          pageCount: 1,
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    chatService = app.get(ChatService);
    uploadService = app.get(UploadService);
    visionService = app.get(VisionService);
  });

  afterAll(async () => {
    await app.close();
  });

  it('AppModule should wire core services', () => {
    expect(chatService).toBeDefined();
    expect(uploadService).toBeDefined();
    expect(visionService).toBeDefined();
  });
});
