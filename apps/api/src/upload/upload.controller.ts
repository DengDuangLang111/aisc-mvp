import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, UseGuards, BadRequestException, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Response } from 'express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';

@Controller('upload')
@UseGuards(ThrottlerGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // 使用内存存储以便进行文件类型验证
    }),
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.uploadService.saveFile(file);
  }

  /**
   * GET /upload/:fileId
   * 下载指定的文件
   */
  @Get(':fileId')
  async downloadFile(
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    const fileInfo = await this.uploadService.getFileInfo(fileId);
    
    if (!fileInfo) {
      throw new NotFoundException(`文件不存在: ${fileId}`);
    }

    // 设置Content-Disposition头以触发下载
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileInfo.diskFilename}"`,
    );

    return res.sendFile(fileInfo.diskFilename, { root: fileInfo.uploadDir });
  }

  /**
   * GET /upload/:fileId/content
   * 读取文件内容（文本文件）
   */
  @Get(':fileId/content')
  async getFileContent(@Param('fileId') fileId: string) {
    const content = await this.uploadService.readFileContent(fileId);
    return {
      fileId,
      content,
      length: content.length,
    };
  }
}
