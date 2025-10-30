import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import * as fs from 'fs';
import * as path from 'path';

describe('UploadController (e2e)', () => {
  let app: INestApplication<App>;
  let uploadedFileId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    // 应用与生产环境相同的管道
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

  describe('/upload (POST)', () => {
    it('should successfully upload a valid PDF file', async () => {
      // 创建一个真实的 PDF 文件头（魔数）
      const pdfBuffer = Buffer.concat([
        Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2D]), // %PDF- magic number
        Buffer.from('This is a test PDF content'),
      ]);

      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', pdfBuffer, 'test-document.pdf');

      // 调试：打印实际响应
      if (response.status !== 201) {
        console.log('Error response:', response.status, response.body);
      }
      
      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('filename', 'test-document.pdf');
      expect(response.body).toHaveProperty('mimetype', 'application/pdf');
      expect(response.body).toHaveProperty('size');
      expect(response.body).toHaveProperty('url');

      // 保存文件 ID 用于后续测试
      uploadedFileId = response.body.id;
    });

    it('should successfully upload a valid text file', async () => {
      const textContent = 'This is a test text file content.\nLine 2\nLine 3';
      const textBuffer = Buffer.from(textContent);

      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', textBuffer, 'test-document.txt')
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.filename).toBe('test-document.txt');
      expect(response.body.mimetype).toBe('text/plain');
    });

    it('should successfully upload a valid PNG image', async () => {
      // PNG 魔数: 89 50 4E 47 0D 0A 1A 0A
      const pngBuffer = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        Buffer.from('PNG image content placeholder'),
      ]);

      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', pngBuffer, 'test-image.png')
        .expect(201);

      expect(response.body.filename).toBe('test-image.png');
      expect(response.body.mimetype).toBe('image/png');
    });

    it('should reject executable files', async () => {
      const exeBuffer = Buffer.from('Fake executable content');

      await request(app.getHttpServer())
        .post('/upload')
        .attach('file', exeBuffer, 'malware.exe')
        .expect(400);
    });

    it('should reject files with dangerous extensions', async () => {
      const dangerousFiles = [
        { name: 'script.bat', mime: 'application/octet-stream' },
        { name: 'virus.dll', mime: 'application/octet-stream' },
        { name: 'hack.sh', mime: 'application/x-sh' },
        { name: 'evil.vbs', mime: 'application/octet-stream' },
      ];

      for (const file of dangerousFiles) {
        await request(app.getHttpServer())
          .post('/upload')
          .attach('file', Buffer.from('content'), file.name)
          .expect(400);
      }
    });

    it('should sanitize filename with special characters', async () => {
      const textBuffer = Buffer.from('test content');

      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', textBuffer, 'test<script>alert(1)</script>.txt')
        .expect(201);

      // 文件名应该被清理，特殊字符被替换为下划线
      expect(response.body.filename).not.toContain('<');
      expect(response.body.filename).not.toContain('>');
      expect(response.body.filename).toContain('.txt');
      expect(response.body.filename).toMatch(/^[a-zA-Z0-9._\u4e00-\u9fa5-]+$/); // 只包含安全字符
    });

    it('should reject file without file field', async () => {
      await request(app.getHttpServer())
        .post('/upload')
        .expect(400);
    });

    it('should reject file exceeding size limit', async () => {
      // 创建一个超过 10MB 的缓冲区
      const largeBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB

      await request(app.getHttpServer())
        .post('/upload')
        .attach('file', largeBuffer, 'large-file.txt')
        .expect(400);
    });
  });

  describe('/upload/:fileId (GET)', () => {
    beforeAll(async () => {
      // 确保有一个文件可以下载
      if (!uploadedFileId) {
        const textBuffer = Buffer.from('Test content for download');
        const response = await request(app.getHttpServer())
          .post('/upload')
          .attach('file', textBuffer, 'download-test.txt');
        uploadedFileId = response.body.id;
      }
    });

    it('should download an uploaded file', async () => {
      const response = await request(app.getHttpServer())
        .get(`/upload/${uploadedFileId}`)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain|application\/octet-stream/);
      expect(response.headers['content-disposition']).toContain('attachment');
    });

    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .get('/upload/non-existent-file-id')
        .expect(404);
    });

    it('should handle invalid file ID format', async () => {
      await request(app.getHttpServer())
        .get('/upload/../../etc/passwd')
        .expect(404);
    });
  });

  describe('/upload/:fileId/content (GET)', () => {
    let textFileId: string;

    beforeAll(async () => {
      // 上传一个文本文件用于读取内容
      const textContent = 'Line 1: Hello World\nLine 2: Test Content\nLine 3: End of file';
      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from(textContent), 'content-test.txt');
      textFileId = response.body.id;
    });

    it('should read content of text file', async () => {
      const response = await request(app.getHttpServer())
        .get(`/upload/${textFileId}/content`)
        .expect(200);

      expect(response.body).toHaveProperty('content');
      expect(response.body.content).toContain('Hello World');
      expect(response.body.content).toContain('Test Content');
    });

    it('should return 404 for non-existent file', async () => {
      await request(app.getHttpServer())
        .get('/upload/non-existent-id/content')
        .expect(404);
    });

    it('should handle binary files gracefully', async () => {
      // 上传一个 PNG 图片
      const pngBuffer = Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
        Buffer.from('PNG content'),
      ]);

      const uploadResponse = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', pngBuffer, 'binary-test.png');

      const imageId = uploadResponse.body.id;

      // 尝试读取二进制文件的内容应该返回可读的内容或错误
      const response = await request(app.getHttpServer())
        .get(`/upload/${imageId}/content`)
        .expect(200);

      expect(response.body).toHaveProperty('content');
    });
  });

  describe('Integration - Full upload and download flow', () => {
    it('should complete full cycle: upload -> get info -> download -> read content', async () => {
      const originalContent = 'Integration test content\nMultiple lines\nEnd';

      // 1. 上传文件
      const uploadResponse = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', Buffer.from(originalContent), 'integration-test.txt')
        .expect(201);

      const fileId = uploadResponse.body.id;
      expect(fileId).toBeDefined();

      // 2. 下载文件
      const downloadResponse = await request(app.getHttpServer())
        .get(`/upload/${fileId}`)
        .expect(200);

      expect(downloadResponse.headers['content-disposition']).toContain('integration-test.txt');

      // 3. 读取文件内容
      const contentResponse = await request(app.getHttpServer())
        .get(`/upload/${fileId}/content`)
        .expect(200);

      expect(contentResponse.body.content).toBe(originalContent);
    });

    it('should handle multiple file uploads sequentially', async () => {
      const files = [
        { name: 'file1.txt', content: 'Content 1' },
        { name: 'file2.txt', content: 'Content 2' },
        { name: 'file3.txt', content: 'Content 3' },
      ];

      const uploadedIds: string[] = [];

      for (const file of files) {
        const response = await request(app.getHttpServer())
          .post('/upload')
          .attach('file', Buffer.from(file.content), file.name)
          .expect(201);

        uploadedIds.push(response.body.id);
        expect(response.body.filename).toBe(file.name);
      }

      // 验证所有文件都可以访问
      for (const fileId of uploadedIds) {
        await request(app.getHttpServer())
          .get(`/upload/${fileId}`)
          .expect(200);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return proper error for unsupported file type', async () => {
      // 尝试上传一个不在允许列表中的文件类型
      const mp4Buffer = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70]), // MP4 magic
        Buffer.from('video content'),
      ]);

      const response = await request(app.getHttpServer())
        .post('/upload')
        .attach('file', mp4Buffer, 'video.mp4')
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.statusCode).toBe(400);
    });

    it('should handle concurrent upload requests', async () => {
      const uploadPromises = [];

      for (let i = 0; i < 5; i++) {
        const promise = request(app.getHttpServer())
          .post('/upload')
          .attach('file', Buffer.from(`Concurrent test ${i}`), `concurrent-${i}.txt`);
        uploadPromises.push(promise);
      }

      const results = await Promise.all(uploadPromises);

      results.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
      });
    });
  });
});
