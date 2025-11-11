import { Injectable, HttpStatus, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { extname, join } from 'path';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { GcsService } from '../storage/gcs.service';
import {
  AnalyticsService,
  AnalyticsEventData,
} from '../analytics/analytics.service';
import { EventName, EventCategory } from '../analytics/analytics.types';
import { DocumentRepository } from './repositories/document.repository';
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Document } from '@prisma/client';
import { VisionService } from '../ocr/vision.service';
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

interface StorageResult {
  storageType: 'gcs' | 'local';
  publicUrl: string;
  gcsPath?: string | null;
  localPath?: string | null;
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
  private readonly useOcrQueue: boolean;

  constructor(
    private configService: ConfigService,
    private gcsService: GcsService,
    private analyticsService: AnalyticsService,
    private documentRepository: DocumentRepository,
    private readonly visionService: VisionService,
    @InjectQueue('ocr') private readonly ocrQueue: Queue,
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

    const queueFlag = this.configService.get<boolean>('ocr.useQueue');
    this.useOcrQueue = queueFlag !== false;
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
      throw new BusinessException(
        ErrorCode.FILE_VALIDATION_FAILED,
        'File type detection failed',
        HttpStatus.BAD_REQUEST,
      );
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
      throw new BusinessException(
        ErrorCode.INVALID_FILE_TYPE,
        'Unable to detect file type. Please upload a valid document.',
        HttpStatus.BAD_REQUEST,
      );
    }

    // 检查真实类型是否在允许列表中
    if (!this.isAllowedMimeType(detected.mime)) {
      this.logger.warn('File type mismatch detected', {
        context: 'UploadService',
        declared: declaredMimetype,
        actual: detected.mime,
      });
      throw new BusinessException(
        ErrorCode.INVALID_FILE_TYPE,
        `Detected file type ${detected.mime} does not match declared type ${declaredMimetype}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async validateFileForUpload(
    file: Express.Multer.File,
    originalFilename: string,
  ): Promise<void> {
    if (this.isDangerousFile(originalFilename)) {
      this.logger.warn('Dangerous file type detected', {
        context: 'UploadService',
        filename: originalFilename,
      });
      throw new BusinessException(
        ErrorCode.INVALID_FILE_TYPE,
        `Executable file type not allowed: ${extname(originalFilename)}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.validateFileType(file.buffer, file.mimetype);

    if (!this.isAllowedMimeType(file.mimetype)) {
      this.logger.warn('File type not allowed', {
        context: 'UploadService',
        filename: originalFilename,
        mimetype: file.mimetype,
      });

      throw new BusinessException(
        ErrorCode.INVALID_FILE_TYPE,
        `Unsupported MIME type: ${file.mimetype}. Allowed: PDF, text, images.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!this.isAllowedSize(file.size)) {
      const maxSizeMB = this.getUploadMaxSizeInMb();

      this.logger.warn('File size exceeds limit', {
        context: 'UploadService',
        filename: originalFilename,
        size: file.size,
        maxSize: maxSizeMB,
      });

      throw new BusinessException(
        ErrorCode.DOCUMENT_TOO_LARGE,
        `File exceeds limit of ${maxSizeMB}MB`,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  private async uploadToPreferredStorage(
    file: Express.Multer.File,
    filename: string,
    uploadId: string,
  ): Promise<StorageResult> {
    const useCloudStorage = Boolean(
      this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID'),
    );

    return useCloudStorage
      ? this.uploadToGcs(file, filename)
      : this.uploadToLocal(file, filename, uploadId);
  }

  private async uploadToGcs(
    file: Express.Multer.File,
    filename: string,
  ): Promise<StorageResult> {
    this.logger.log('info', 'Uploading to Google Cloud Storage', {
      context: 'UploadService',
      filename,
    });

    const gcsResult = await this.gcsService.uploadFile(
      file.buffer,
      filename,
      'uploads',
    );

    this.logger.log('info', 'File uploaded to GCS', {
      context: 'UploadService',
      gcsPath: gcsResult.gcsPath,
      publicUrl: gcsResult.publicUrl,
    });

    return {
      storageType: 'gcs',
      gcsPath: gcsResult.gcsPath,
      publicUrl: gcsResult.publicUrl,
    };
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    filename: string,
    uploadId: string,
  ): Promise<StorageResult> {
    const ext = extname(filename);
    const diskFilename = `${uploadId}${ext}`;
    const uploadDir = this.getUploadDestination();
    const uploadPath = join(uploadDir, diskFilename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.writeFile(uploadPath, file.buffer);

    this.logger.log('info', 'File saved to local disk', {
      context: 'UploadService',
      diskFilename,
      path: uploadPath,
    });

    return {
      storageType: 'local',
      localPath: uploadPath,
      publicUrl: this.buildFileUrl(diskFilename),
    };
  }

  private async saveDocumentMetadata(
    filename: string,
    storageResult: StorageResult,
    file: Express.Multer.File,
    userId?: string,
  ): Promise<Document> {
    const document = await this.documentRepository.create({
      userId,
      filename,
      gcsPath: storageResult.gcsPath || storageResult.localPath || undefined,
      size: file.size,
      ocrStatus: 'pending',
      publicUrl: storageResult.publicUrl,
    });

    this.logger.log('info', 'Document metadata saved to database', {
      context: 'UploadService',
      documentId: document.id,
    });

    return document;
  }

  private async trackUploadSuccess(
    document: Document,
    file: Express.Multer.File,
    storageType: StorageResult['storageType'],
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventName: EventName.FILE_UPLOAD_SUCCESS,
      eventCategory: EventCategory.DOCUMENT,
      eventProperties: {
        documentId: document.id,
        filename: document.filename,
        fileSize: file.size,
        mimeType: file.mimetype,
        storageType,
      },
    });
  }

  private async trackUploadFailure(
    filename: string,
    error: unknown,
    userId?: string,
    sessionId?: string,
  ): Promise<void> {
    await this.trackEvent({
      userId,
      sessionId,
      eventName: EventName.FILE_UPLOAD_FAILED,
      eventCategory: EventCategory.DOCUMENT,
      eventProperties: {
        filename,
        error: error instanceof Error ? error.message : String(error),
      },
    });
  }

  private buildUploadResult(
    uploadId: string,
    filename: string,
    file: Express.Multer.File,
    documentId: string,
    publicUrl: string,
  ): UploadResult {
    const result: UploadResult = {
      id: uploadId,
      filename,
      url: publicUrl,
      size: file.size,
      mimetype: file.mimetype,
      documentId,
      ocrStatus: 'pending',
    };

    this.logger.log('info', 'File upload successful', {
      context: 'UploadService',
      fileId: result.id,
      documentId: result.documentId,
      filename: result.filename,
      size: result.size,
    });

    return result;
  }

  private getUploadMaxSizeInMb(): number {
    const maxSize =
      this.configService.get<number>('upload.maxSize') || 10485760;
    return Math.round((maxSize / 1024 / 1024) * 100) / 100;
  }

  private getUploadDestination(): string {
    return this.configService.get<string>('upload.destination') || './uploads';
  }

  /**
   * Orchestrates secure file uploads, storage, metadata persistence, OCR, and analytics.
   * @param file Uploaded file payload from Multer
   * @param userId Optional owner identifier
   */
  async saveFile(
    file: Express.Multer.File,
    userId?: string,
  ): Promise<UploadResult> {
    const originalFilename = file.originalname;
    const sessionId = this.generateSessionId();
    const uploadId = randomUUID();

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
      const sanitizedFilename = this.sanitizeFilename(originalFilename);
      this.logSanitizedFilename(originalFilename, sanitizedFilename);

      await this.validateFileForUpload(file, originalFilename);

      const storageResult = await this.uploadToPreferredStorage(
        file,
        sanitizedFilename,
        uploadId,
      );

      const document = await this.saveDocumentMetadata(
        sanitizedFilename,
        storageResult,
        file,
        userId,
      );

      await this.enqueueOcrJob(document.id, storageResult, userId);
      await this.trackUploadSuccess(
        document,
        file,
        storageResult.storageType,
        userId,
        sessionId,
      );

      return this.buildUploadResult(
        uploadId,
        sanitizedFilename,
        file,
        document.id,
        storageResult.publicUrl,
      );
    } catch (error: unknown) {
      await this.trackUploadFailure(
        originalFilename,
        error,
        userId,
        sessionId,
      );
      throw error;
    }
  }

  private logSanitizedFilename(original: string, sanitized: string): void {
    if (original === sanitized) {
      return;
    }

    this.logger.log('info', 'Filename sanitized', {
      context: 'UploadService',
      original,
      sanitized,
    });
  }

  /**
   * Returns stored file metadata by id (for download helpers).
   * @param fileId File identifier without extension
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
   * Reads text file content from disk storage.
   * @param fileId File identifier without extension
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
        throw new BusinessException(
          ErrorCode.DOCUMENT_NOT_FOUND,
          `File not found: ${fileId}`,
          HttpStatus.NOT_FOUND,
        );
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
      if (error instanceof BusinessException) {
        throw error;
      }

      this.logger.error('Failed to read file content', {
        context: 'UploadService',
        fileId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw new BusinessException(
        ErrorCode.EXTERNAL_SERVICE_ERROR,
        'Failed to read file content',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      const sessionId = data.sessionId || this.generateSessionId();
      const eventName = data.eventName ?? 'custom_event';
      const eventCategory = data.eventCategory ?? EventCategory.SYSTEM;

      await this.analyticsService.trackEvent({
        sessionId,
        eventName,
        eventCategory,
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

  private async enqueueOcrJob(
    documentId: string,
    storageResult: StorageResult,
    userId?: string,
  ): Promise<void> {
    if (!this.useOcrQueue) {
      await this.processOcrInline(documentId, storageResult);
      return;
    }

    try {
      await this.ocrQueue.add('extract-text', {
        documentId,
        gcsPath: storageResult.gcsPath,
        localPath: storageResult.localPath,
        userId,
      });
    } catch (error) {
      this.logger.warn('Failed to enqueue OCR job, processing inline', {
        context: 'UploadService',
        documentId,
        error: error instanceof Error ? error.message : String(error),
      });
      await this.processOcrInline(documentId, storageResult);
    }
  }

  private async processOcrInline(
    documentId: string,
    storageResult: StorageResult,
  ): Promise<void> {
    try {
      await this.documentRepository.updateOcrStatus(documentId, 'processing');

      if (storageResult.localPath) {
        const buffer = await fs.readFile(storageResult.localPath);
        await this.visionService.extractTextFromBuffer(buffer, documentId);
      } else if (storageResult.gcsPath) {
        await this.visionService.extractTextFromGcs(
          storageResult.gcsPath,
          documentId,
        );
      } else {
        throw new Error('No OCR source provided');
      }

      await this.documentRepository.updateOcrStatus(documentId, 'completed');
      this.logger.log('Inline OCR completed', {
        context: 'UploadService',
        documentId,
      });
    } catch (error) {
      await this.documentRepository.updateOcrStatus(documentId, 'failed');
      this.logger.error('Inline OCR failed', {
        context: 'UploadService',
        documentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
