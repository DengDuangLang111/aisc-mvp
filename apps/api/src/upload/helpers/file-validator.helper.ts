import { BadRequestException } from '@nestjs/common';
import * as fileTypeImport from 'file-type';

/**
 * FileValidatorHelper
 *
 * 文件验证和清理工具类
 * - MIME类型验证
 * - 文件大小验证
 * - 危险文件检测
 * - 文件名清理
 */
export class FileValidatorHelper {
  private static readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  private static readonly DANGEROUS_EXTENSIONS = [
    '.exe',
    '.bat',
    '.cmd',
    '.com',
    '.scr',
    '.vbs',
    '.js',
    '.jar',
  ];

  /**
   * 检查MIME类型是否被允许
   */
  static isAllowedMimeType(mimetype: string): boolean {
    return this.ALLOWED_MIME_TYPES.includes(mimetype);
  }

  /**
   * 检查文件大小是否在限制内
   */
  static isAllowedSize(size: number): boolean {
    return size <= this.MAX_FILE_SIZE;
  }

  /**
   * 检查文件是否为危险文件类型
   */
  static isDangerousFile(filename: string): boolean {
    const lowerFilename = filename.toLowerCase();
    return this.DANGEROUS_EXTENSIONS.some((ext) => lowerFilename.endsWith(ext));
  }

  /**
   * 清理文件名，移除危险字符
   */
  static sanitizeFilename(filename: string): string {
    return filename
      .replace(/\\/g, '_') // 替换反斜杠
      .replace(/\//g, '_') // 替换斜杠
      .replace(/[^a-zA-Z0-9._\u4e00-\u9fa5-]/g, '_') // 保留中文、字母、数字、点、下划线、连字符
      .replace(/\.{2,}/g, '_') // 防止 ../ 路径遍历
      .replace(/^\.+/, '') // 移除开头的点
      .substring(0, 255); // 限制长度
  }

  /**
   * 验证文件真实类型（通过文件魔数）
   */
  static async validateFileType(
    buffer: Buffer,
    declaredMimetype: string,
  ): Promise<void> {
    let detected;
    try {
      detected = await fileTypeImport.fromBuffer(buffer);
    } catch (error: unknown) {
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
        return; // 文本类型文件允许通过
      }

      throw new BadRequestException('无法识别文件类型，请确保上传的是有效文件');
    }

    // 检查真实类型是否在允许列表中
    if (!this.isAllowedMimeType(detected.mime)) {
      throw new BadRequestException(
        `文件类型不匹配。声明类型: ${declaredMimetype}, 实际类型: ${detected.mime}`,
      );
    }
  }

  /**
   * 从文件名提取文件ID
   */
  static extractFileId(filename: string): string {
    const parts = filename.split('-');
    return parts.slice(1, -1).join('-');
  }

  /**
   * 构建文件访问URL
   */
  static buildFileUrl(filename: string, baseUrl: string): string {
    return `${baseUrl}/api/upload/${this.extractFileId(filename)}`;
  }
}
