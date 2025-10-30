import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { extname } from 'path';

export interface UploadResult {
  id: string;
  filename: string;
  url: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class UploadService {
  constructor(private configService: ConfigService) {}

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
    // 1. 验证文件类型
    if (!this.isAllowedMimeType(file.mimetype)) {
      throw new BadRequestException(
        `不支持的文件类型: ${file.mimetype}。允许的类型: PDF, 文本, 图片`
      );
    }

    // 2. 验证文件大小
    if (!this.isAllowedSize(file.size)) {
      const maxSizeMB = (this.configService.get<number>('upload.maxSize') || 10485760) / 1024 / 1024;
      throw new BadRequestException(
        `文件大小超过限制。最大允许: ${maxSizeMB}MB`
      );
    }

    // 3. 返回文件信息
    return {
      id: this.extractFileId(file.filename),
      filename: file.originalname,
      url: this.buildFileUrl(file.filename),
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
