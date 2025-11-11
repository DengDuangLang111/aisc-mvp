import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../../src/app.module';
import { randomUUID } from 'crypto';

describe('Integration: upload + chat (P3-14)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

  it('uploads a PDF, polls OCR status, then opens chat with new document', async () => {
    const uniqueContent = `integration-${randomUUID()}`;
    const pdfBuffer = Buffer.concat([
      Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]),
      Buffer.from(uniqueContent),
    ]);

    const uploadResponse = await request(app.getHttpServer())
      .post('/upload')
      .attach('file', pdfBuffer, 'integration.pdf')
      .expect(201);

    const documentId = uploadResponse.body?.documentId;
    expect(documentId).toBeDefined();

    let ocrReady = false;
    for (let i = 0; i < 5; i++) {
      const status = await request(app.getHttpServer())
        .get(`/upload/documents/${documentId}`)
        .expect(200);

      if (status.body?.ocrStatus === 'completed') {
        ocrReady = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    expect(ocrReady).toBeTruthy();

    await request(app.getHttpServer())
      .post('/chat')
      .send({
        message: 'Summarize the uploaded PDF',
        documentId,
      })
      .expect(201);
  });
});
