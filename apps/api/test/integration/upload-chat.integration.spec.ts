import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { ChatService } from '../../src/chat/chat.service';
import { VisionService } from '../../src/ocr/vision.service';

jest.setTimeout(20000);

describe('Integration: upload + chat (P3-14)', () => {
  let app: INestApplication;
  const mockChatService = {
    chat: jest.fn().mockResolvedValue({
      reply: 'mock-reply',
      hintLevel: 1,
      timestamp: Date.now(),
      conversationId: 'test-conv',
      tokensUsed: 42,
    }),
  };

  const mockVisionService = {
    extractTextFromGcs: jest.fn().mockResolvedValue({
      fullText: 'mock full text',
      confidence: 0.99,
      language: 'en',
      pageCount: 1,
    }),
    extractTextFromBuffer: jest.fn().mockResolvedValue({
      fullText: 'mock full text',
      confidence: 0.99,
      language: 'en',
      pageCount: 1,
    }),
    getDocumentContext: jest.fn().mockResolvedValue({
      summary: 'mock summary',
      faq: [],
      pages: [],
    }),
    getOcrResult: jest.fn().mockResolvedValue({
      fullText: 'mock full text',
      confidence: 0.99,
      language: 'en',
      pageCount: 1,
    }),
  } as Partial<VisionService>;

  beforeAll(async () => {
    process.env.GOOGLE_CLOUD_PROJECT_ID = '';
    process.env.ENABLE_OCR_QUEUE = 'false';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ChatService)
      .useValue(mockChatService)
      .overrideProvider(VisionService)
      .useValue(mockVisionService)
      .compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('uploads a PDF and triggers chat with the new document context', async () => {
    const pdfBuffer = Buffer.concat([
      Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
      Buffer.from('integration-content'),
    ]);

    const uploadResponse = await request(app.getHttpServer())
      .post('/upload')
      .attach('file', pdfBuffer, 'integration.pdf')
      .expect(201);

    const documentId = uploadResponse.body?.documentId;
    expect(documentId).toBeDefined();

    const status = await request(app.getHttpServer())
      .get(`/upload/documents/${documentId}`)
      .expect(200);

    expect(status.body).toHaveProperty('id', documentId);

    await request(app.getHttpServer())
      .post('/chat')
      .send({
        message: 'Summarize the uploaded PDF',
        documentId,
      })
      .expect(201);

    expect(mockChatService.chat).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Summarize the uploaded PDF',
        documentId,
      }),
    );
  });
});
