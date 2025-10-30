import { Injectable, BadRequestException, NotFoundException, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { extname, join } from 'path';
import { promises as fs } from 'fs';

export interface UploadResult {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadService {
  constructor(
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 验证文件类型
   */
  private isAllowedMimeType(mimetype: string): boolean {
    const allowed = this.configService.get<string[]>('upload.allowedMimeTypes') || [];
    return allowed.some(allowedType => {
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
    const maxSize = this.configService.get<number>('upload.maxSize') || 10485760;
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
    const baseUrl = this.configService.get<string>('baseUrl') || 'http://localhost:4000';
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * 处理文件上传
   */
  async saveFile(file: Express.Multer.File): Promise<UploadResult> {
    this.logger.log('info', 'Processing file upload', {
      context: 'UploadService',
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    // 1. 验证文件类型
    if (!this.isAllowedMimeType(file.mimetype)) {
      this.logger.warn('File type not allowed', {
        context: 'UploadService',
        filename: file.originalname,
        mimetype: file.mimetype,
      });

      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}。允许的类型: PDF, 文本, 图片`
      );
    }

    // 2. 验证文件大小
    if (!this.isAllowedSize(file.size)) {
      const maxSizeMB = (this.configService.get<number>('upload.maxSize') || 10485760) / 1024 / 1024;
      
      this.logger.warn('File size exceeds limit', {
        context: 'UploadService',
        filename: file.originalname,
        size: file.size,
        maxSize: maxSizeMB,
      });

      throw new BadRequestException(
        `文件大小超过限制。最大允许: ${maxSizeMB}MB`
      );
    }

    const result = {
      id: this.extractFileId(file.filename),
      filename: file.originalname,
      url: this.buildFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    };

    this.logger.log('info', 'File upload successful', {
      context: 'UploadService',
      fileId: result.id,
      filename: result.filename,
      size: result.size,
    });

    // 3. 返回文件信息
    return result;
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

    const uploadDir = this.configService.get<string>('upload.destination') || './uploads';
    
    try {
      // 查找文件（支持多种扩展名）
      const files = await fs.readdir(uploadDir);
      const targetFile = files.find(file => file.startsWith(fileId));
      
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
    } catch (error) {
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
}
