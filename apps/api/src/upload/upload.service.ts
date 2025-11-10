import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Inject,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { GcsService } from '../storage/gcs.service';
import { VisionService } from '../ocr/vision.service';
import {
  AnalyticsService,
  AnalyticsEventData,
} from '../analytics/analytics.service';
import { EventName, EventCategory } from '../analytics/analytics.types';
import { DocumentRepository } from './repositories/document.repository';
import { FileValidatorHelper } from './helpers/file-validator.helper';
const fileTypeImport = require('file-type');

export interface UploadResult {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
  documentId?: string;
  ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

@Injectable()
export class UploadService {
  // 危险文件扩展名黑名单
  private readonly DANGEROUS_EXTENSIONS = [
    '.exe',
    '.dll',
    '.bat',
    '.cmd',
    '.sh',
    '.bash',
    '.scr',
    '.vbs',
    '.js',
    '.jar',
    '.app',
    '.msi',
    '.com',
    '.pif',
    '.ps1',
    '.psm1',
  ];

  constructor(
    private configService: ConfigService,
    private gcsService: GcsService,
    private visionService: VisionService,
    private analyticsService: AnalyticsService,
    private documentRepository: DocumentRepository,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    // 检查是否启用云存储
    const useCloudStorage = this.configService.get<string>(
      'GOOGLE_CLOUD_PROJECT_ID',
    );
    if (useCloudStorage) {
      this.logger.log('Cloud storage enabled (GCS)', {
        context: 'UploadService',
      });
    } else {
      this.logger.log('Using local storage', { context: 'UploadService' });
    }
  }

  /**
   * 验证文件类型
   */
  private isAllowedMimeType(mimetype: string): boolean {
    const allowed =
      this.configService.get<string[]>('upload.allowedMimeTypes') || [];
    return allowed.some((allowedType: string) => {
      if (allowedType.endsWith('/*')) {
        const prefix = allowedType.slice(0, -2);
        return mimetype.startsWith(prefix);
      }
      return mimetype === allowedType;
    });
  }

  /**
   * 验证文件大小
   */
  private isAllowedSize(size: number): boolean {
    const maxSize =
      this.configService.get<number>('upload.maxSize') || 10485760;
    return size <= maxSize;
  }

  /**
   * 提取文件 ID（去除扩展名）
   */
  private extractFileId(filename: string): string {
    return filename.replace(extname(filename), '');
  }

  /**
   * 构建文件 URL
   */
  private buildFileUrl(filename: string): string {
    const baseUrl =
      this.configService.get<string>('baseUrl') || 'http://localhost:4001';
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * 检查是否为危险文件类型
   */
  private isDangerousFile(filename: string): boolean {
    const ext = extname(filename).toLowerCase();
    return this.DANGEROUS_EXTENSIONS.includes(ext);
  }

  /**
   * 清理文件名，防止路径遍历和特殊字符攻击
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, '_') // 保留中文、字母、数字、点、下划线、连字符
      .replace(/\.{2,}/g, '_') // 防止 ../ 路径遍历
      .replace(/^\.+/, '') // 移除开头的点
      .substring(0, 255); // 限制长度
  }

  /**
   * 验证文件真实类型（通过文件魔数）
   */
  private async validateFileType(
    buffer: Buffer,
    declaredMimetype: string,
  ): Promise<void> {
    let detected;
    try {
      detected = await fileTypeImport.fromBuffer(buffer);
    } catch (error: unknown) {
      this.logger.error('Error detecting file type', {
        context: 'UploadService',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        bufferLength: buffer?.length,
      });
      throw new BadRequestException('文件类型检测失败');
    }

    // 某些文件类型（如纯文本）没有魔数，对于这些类型只检查是否在允许列表中
    if (!detected) {
      const textBasedTypes = [
        'text/plain',
        'text/markdown',
        'text/csv',
        'application/json',
        'text/html',
        'text/css',
        'application/javascript',
      ];

      if (textBasedTypes.includes(declaredMimetype)) {
        this.logger.debug(
          'Text-based file accepted without magic number validation',
          {
            context: 'UploadService',
            declaredMimetype,
            bufferSize: buffer.length,
          },
        );
        return; // 文本类型文件允许通过
      }

      this.logger.warn('Unable to detect file type from buffer', {
        context: 'UploadService',
        declaredMimetype,
        bufferSize: buffer.length,
      });
      throw new BadRequestException('无法识别文件类型，请确保上传的是有效文件');
    }

    // 检查真实类型是否在允许列表中
    if (!this.isAllowedMimeType(detected.mime)) {
      this.logger.warn('File type mismatch detected', {
        context: 'UploadService',
        declared: declaredMimetype,
        actual: detected.mime,
      });
      throw new BadRequestException(
        `文件类型不匹配。声明类型: ${declaredMimetype}, 实际类型: ${detected.mime}`,
      );
    }
  }

  /**
   * 处理文件上传
   */
  async saveFile(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<UploadResult> {
    const originalFilename = file.originalname;
    const sessionId = this.generateSessionId();

    this.logger.log('info', 'Processing file upload', {
      context: 'UploadService',
      filename: originalFilename,
      mimetype: file.mimetype,
      size: file.size,
      userId,
    });

    // 记录上传开始事件
    await this.trackEvent({
      userId,
      sessionId,
      eventName: EventName.FILE_UPLOAD_START,
      eventCategory: EventCategory.DOCUMENT,
      eventProperties: {
        filename: originalFilename,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });

    try {
      // 1. 检查危险文件类型
      if (this.isDangerousFile(originalFilename)) {
        this.logger.warn('Dangerous file type detected', {
          context: 'UploadService',
          filename: originalFilename,
        });
        throw new BadRequestException(
          `不允许上传可执行文件类型: ${extname(originalFilename)}`,
        );
      }

      // 2. 清理文件名
      const sanitizedFilename = this.sanitizeFilename(originalFilename);
      if (sanitizedFilename !== originalFilename) {
        this.logger.log('info', 'Filename sanitized', {
          context: 'UploadService',
          original: originalFilename,
          sanitized: sanitizedFilename,
        });
      }

      // 3. 验证文件真实类型（魔数检查）
      await this.validateFileType(file.buffer, file.mimetype);

      // 4. 验证声明的文件类型
      if (!this.isAllowedMimeType(file.mimetype)) {
        this.logger.warn('File type not allowed', {
          context: 'UploadService',
          filename: originalFilename,
          mimetype: file.mimetype,
        });

        throw new BadRequestException(
          `不支持的文件类型: ${file.mimetype}。允许的类型: PDF, 文本, 图片`,
        );
      }

      // 5. 验证文件大小
      if (!this.isAllowedSize(file.size)) {
        const maxSizeMB =
          (this.configService.get<number>('upload.maxSize') || 10485760) /
          1024 /
          1024;

        this.logger.warn('File size exceeds limit', {
          context: 'UploadService',
          filename: originalFilename,
          size: file.size,
          maxSize: maxSizeMB,
        });

        throw new BadRequestException(
          `文件大小超过限制。最大允许: ${maxSizeMB}MB`,
        );
      }

      // 6. 上传文件（云存储或本地）
      const uniqueId = randomUUID();
      let fileUrl: string;
      let gcsPath: string | null = null;
      let localPath: string | null = null;

      const useCloudStorage = this.configService.get<string>(
        'GOOGLE_CLOUD_PROJECT_ID',
      );

      if (useCloudStorage) {
        // 上传到 Google Cloud Storage
        this.logger.log('info', 'Uploading to Google Cloud Storage', {
          context: 'UploadService',
          filename: sanitizedFilename,
        });

        const gcsResult = await this.gcsService.uploadFile(
          file.buffer,
          sanitizedFilename,
          'uploads',
        );

        gcsPath = gcsResult.gcsPath;
        fileUrl = gcsResult.publicUrl;

        this.logger.log('info', 'File uploaded to GCS', {
          context: 'UploadService',
          gcsPath,
          publicUrl: fileUrl,
        });
      } else {
        // 本地存储（开发环境）
        const ext = extname(sanitizedFilename);
        const diskFilename = `${uniqueId}${ext}`;
        const uploadDir = './uploads';
        const uploadPath = join(uploadDir, diskFilename);

        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(uploadPath, file.buffer);

        localPath = uploadPath;
        fileUrl = this.buildFileUrl(diskFilename);

        this.logger.log('info', 'File saved to local disk', {
          context: 'UploadService',
          diskFilename,
          path: uploadPath,
        });
      }

      // 7. 保存文档元信息到数据库
      const document = await this.documentRepository.create({
        userId,
        filename: sanitizedFilename,
        s3Key: gcsPath || undefined, // 使用 s3Key 字段存储 GCS 路径
        size: file.size,
        ocrStatus: 'pending',
        publicUrl: fileUrl,
      });

      this.logger.log('info', 'Document metadata saved to database', {
        context: 'UploadService',
        documentId: document.id,
      });

      // 8. 记录上传成功事件
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.FILE_UPLOAD_SUCCESS,
        eventCategory: EventCategory.DOCUMENT,
        eventProperties: {
          documentId: document.id,
          filename: sanitizedFilename,
          fileSize: file.size,
          mimeType: file.mimetype,
          storageType: useCloudStorage ? 'gcs' : 'local',
        },
      });

      // 9. 异步触发 OCR（不阻塞响应）
      this.triggerOCR(
        document.id,
        gcsPath || localPath,
        file.buffer,
        userId,
        sessionId,
      ).catch((error) => {
        this.logger.error('OCR processing failed', {
          context: 'UploadService',
          documentId: document.id,
          error: error instanceof Error ? error.message : String(error),
        });
      });

      const result: UploadResult = {
        id: uniqueId,
        filename: sanitizedFilename,
        url: fileUrl,
        size: file.size,
        mimetype: file.mimetype,
        documentId: document.id,
        ocrStatus: 'pending',
      };

      this.logger.log('info', 'File upload successful', {
        context: 'UploadService',
        fileId: result.id,
        documentId: document.id,
        filename: result.filename,
        size: result.size,
      });

      return result;
    } catch (error: unknown) {
      // 记录上传失败事件
      await this.trackEvent({
        userId,
        sessionId,
        eventName: EventName.FILE_UPLOAD_FAILED,
        eventCategory: EventCategory.DOCUMENT,
        eventProperties: {
          filename: originalFilename,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      throw error;
    }
  }

  /**
   * 获取文件信息
   * @param fileId 文件ID（不含扩展名）
   * @returns 文件信息
   */
  async getFileInfo(
    fileId: string,
  ): Promise<{ diskFilename: string; uploadDir: string } | null> {
    const uploadDir =
      this.configService.get<string>('upload.destination') || './uploads';

    try {
      const files = await fs.readdir(uploadDir);
      const targetFile = files.find((file: string) => file.startsWith(fileId));

      if (!targetFile) {
        return null;
      }

      return {
        diskFilename: targetFile,
        uploadDir,
      };
    } catch (error: unknown) {
      this.logger.error('Failed to get file info', {
        context: 'UploadService',
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * 读取上传文件的内容
   * @param fileId 文件ID（不含扩展名）
   * @returns 文件内容字符串
   */
  async readFileContent(fileId: string): Promise<string> {
    this.logger.log('info', 'Reading file content', {
      context: 'UploadService',
      fileId,
    });

    const uploadDir =
      this.configService.get<string>('upload.destination') || './uploads';

    try {
      // 查找文件（支持多种扩展名）
      const files = await fs.readdir(uploadDir);
      const targetFile = files.find((file: string) => file.startsWith(fileId));

      if (!targetFile) {
        this.logger.warn('File not found', {
          context: 'UploadService',
          fileId,
        });
        throw new NotFoundException(`文件不存在: ${fileId}`);
      }

      const filePath = join(uploadDir, targetFile);

      // 读取文件内容
      const content = await fs.readFile(filePath, 'utf-8');

      this.logger.log('info', 'File content read successfully', {
        context: 'UploadService',
        fileId,
        filename: targetFile,
        contentLength: content.length,
      });

      return content;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error('Failed to read file content', {
        context: 'UploadService',
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new BadRequestException('无法读取文件内容');
    }
  }

  /**
   * 生成 Session ID（简化版）
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 记录事件的辅助方法
   */
  private async trackEvent(data: Partial<AnalyticsEventData>): Promise<void> {
    try {
      await this.analyticsService.trackEvent({
        sessionId: data.sessionId || this.generateSessionId(),
        eventName: data.eventName as any,
        eventCategory: data.eventCategory as any,
        userId: data.userId,
        eventProperties: data.eventProperties,
      });
    } catch (error: unknown) {
      // 埋点失败不应该影响主流程
      this.logger.error('Failed to track event', {
        context: 'UploadService',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 异步触发 OCR 处理
   */
  private async triggerOCR(
    documentId: string,
    filePath: string | null,
    fileBuffer: Buffer,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    const sid = sessionId || this.generateSessionId();

    // 记录 OCR 开始
    await this.trackEvent({
      userId,
      sessionId: sid,
      eventName: EventName.OCR_START,
      eventCategory: EventCategory.DOCUMENT,
      eventProperties: { documentId },
    });

    try {
      let ocrResult;
      let lastError: Error | null = null;

      // 优先尝试使用原始文件 Buffer，避免 GCS PDF 同步识别失败
      if (fileBuffer && fileBuffer.length > 0) {
        try {
          this.logger.log('info', 'Starting OCR from buffer', {
            context: 'UploadService',
            documentId,
            bufferSize: fileBuffer.length,
          });

          ocrResult = await this.visionService.extractTextFromBuffer(
            fileBuffer,
            documentId,
          );
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.logger.warn(
            'Buffer OCR attempt failed, will retry with storage path if available',
            {
              context: 'UploadService',
              documentId,
              error: lastError.message,
            },
          );
        }
      }

      // 如果 Buffer 识别失败且存在存储路径，则尝试使用 GCS 路径
      if (!ocrResult && filePath && filePath.startsWith('gs://')) {
        try {
          this.logger.log('info', 'Starting OCR from GCS', {
            context: 'UploadService',
            documentId,
            gcsPath: filePath,
          });

          ocrResult = await this.visionService.extractTextFromGcs(
            filePath,
            documentId,
          );
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.logger.error('GCS OCR attempt failed', {
            context: 'UploadService',
            documentId,
            gcsPath: filePath,
            error: lastError.message,
          });
        }
      }

      if (!ocrResult && filePath && !filePath.startsWith('gs://')) {
        try {
          this.logger.log('info', 'Starting OCR from local file path', {
            context: 'UploadService',
            documentId,
            filePath,
          });

          const buffer = await fs.readFile(filePath);
          ocrResult = await this.visionService.extractTextFromBuffer(
            buffer,
            documentId,
          );
        } catch (error: unknown) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.logger.error('Local file OCR attempt failed', {
            context: 'UploadService',
            documentId,
            filePath,
            error: lastError.message,
          });
        }
      }

      if (!ocrResult) {
        if (lastError) {
          throw lastError;
        }
        throw new Error('OCR failed: Unable to extract text from document');
      }

      // 记录 OCR 成功
      await this.trackEvent({
        userId,
        sessionId: sid,
        eventName: EventName.OCR_SUCCESS,
        eventCategory: EventCategory.DOCUMENT,
        eventProperties: {
          documentId,
          pageCount: ocrResult.pageCount,
          confidence: ocrResult.confidence,
          textLength: ocrResult.fullText.length,
        },
      });

      this.logger.log('info', 'OCR completed successfully', {
        context: 'UploadService',
        documentId,
        pageCount: ocrResult.pageCount,
        confidence: ocrResult.confidence,
      });
    } catch (error: unknown) {
      // 记录 OCR 失败
      await this.trackEvent({
        userId,
        sessionId: sid,
        eventName: EventName.OCR_FAILED,
        eventCategory: EventCategory.DOCUMENT,
        eventProperties: {
          documentId,
          error: error instanceof Error ? error.message : String(error),
        },
      });

      this.logger.error('OCR processing failed', {
        context: 'UploadService',
        documentId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  }
}
