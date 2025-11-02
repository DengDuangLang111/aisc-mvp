import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, UseGuards, BadRequestException, Res, NotFoundException, Query } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBadRequestResponse, ApiNotFoundResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { memoryStorage } from 'multer';
import { UploadService } from './upload.service';
import { VisionService } from '../ocr/vision.service';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('upload')
@Controller('upload')
@UseGuards(ThrottlerGuard)
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly visionService: VisionService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: '上传文件', 
    description: '上传学习资料文件（支持 PDF、Word、文本等格式）。文件大小限制 10MB。使用魔数验证确保文件安全。'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: '要上传的文件',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: '文件上传成功',
    schema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', example: 'abc123xyz' },
        originalFilename: { type: 'string', example: 'study-notes.pdf' },
        size: { type: 'number', example: 1024000 },
        mimeType: { type: 'string', example: 'application/pdf' },
        uploadedAt: { type: 'string', format: 'date-time', example: '2025-11-01T12:00:00.000Z' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: '文件上传失败（文件为空、格式不支持、大小超限等）',
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // 使用内存存储以便进行文件类型验证
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('userId') userId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('请上传文件');
    }
    return this.uploadService.saveFile(file, userId);
  }

  /**
   * GET /upload/:fileId
   * 下载指定的文件
   */
  @Get(':fileId')
  @ApiOperation({ 
    summary: '下载文件', 
    description: '根据文件 ID 下载之前上传的文件'
  })
  @ApiParam({
    name: 'fileId',
    description: '文件唯一标识符',
    example: 'abc123xyz',
  })
  @ApiResponse({
    status: 200,
    description: '文件下载成功',
    content: {
      'application/octet-stream': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: '文件不存在',
  })
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
  @ApiOperation({ 
    summary: '读取文件内容', 
    description: '读取文本类型文件的内容（仅支持文本文件）'
  })
  @ApiParam({
    name: 'fileId',
    description: '文件唯一标识符',
    example: 'abc123xyz',
  })
  @ApiResponse({
    status: 200,
    description: '成功读取文件内容',
    schema: {
      type: 'object',
      properties: {
        fileId: { type: 'string', example: 'abc123xyz' },
        content: { type: 'string', example: '这是文件的文本内容...' },
        length: { type: 'number', example: 1500 },
      },
    },
  })
  @ApiNotFoundResponse({
    description: '文件不存在',
  })
  @ApiBadRequestResponse({
    description: '文件不是文本类型或无法读取',
  })
  async getFileContent(@Param('fileId') fileId: string) {
    const content = await this.uploadService.readFileContent(fileId);
    return {
      fileId,
      content,
      length: content.length,
    };
  }

  /**
   * GET /upload/documents/:documentId
   * 获取文档详情（包含 OCR 状态）
   */
  @Get('documents/:documentId')
  @ApiOperation({
    summary: '获取文档详情',
    description: '获取文档元信息和 OCR 处理状态',
  })
  @ApiParam({
    name: 'documentId',
    description: '文档 ID',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取文档详情',
  })
  @ApiNotFoundResponse({
    description: '文档不存在',
  })
  async getDocumentInfo(@Param('documentId') documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        ocrResult: {
          select: {
            id: true,
            confidence: true,
            language: true,
            pageCount: true,
            extractedAt: true,
          },
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`文档不存在: ${documentId}`);
    }

    return {
      id: document.id,
      filename: document.filename,
      mimeType: document.mimeType,
      size: document.size,
      uploadedAt: document.uploadedAt,
      ocrStatus: document.ocrResult ? 'completed' : 'pending',
      ocrResult: document.ocrResult
        ? {
            confidence: document.ocrResult.confidence,
            language: document.ocrResult.language,
            pageCount: document.ocrResult.pageCount,
            extractedAt: document.ocrResult.extractedAt,
          }
        : null,
    };
  }

  /**
   * GET /upload/documents/:documentId/ocr
   * 获取文档的 OCR 结果
   */
  @Get('documents/:documentId/ocr')
  @ApiOperation({
    summary: '获取 OCR 结果',
    description: '获取文档的完整 OCR 文本内容和结构化数据',
  })
  @ApiParam({
    name: 'documentId',
    description: '文档 ID',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取 OCR 结果',
  })
  @ApiNotFoundResponse({
    description: 'OCR 结果不存在（可能尚未完成）',
  })
  async getOcrResult(@Param('documentId') documentId: string) {
    const ocrResult = await this.visionService.getOcrResult(documentId);

    if (!ocrResult) {
      throw new NotFoundException(
        `OCR 结果不存在或尚未完成: ${documentId}`,
      );
    }

    return ocrResult;
  }

  /**
   * GET /upload/documents
   * 获取文档列表
   */
  @Get('documents')
  @ApiOperation({
    summary: '获取文档列表',
    description: '获取用户上传的文档列表',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    description: '用户 ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回数量',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取文档列表',
  })
  async getDocuments(
    @Query('userId') userId?: string,
    @Query('limit') limit?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 20;

    const documents = await this.prisma.document.findMany({
      where: userId ? { userId } : undefined,
      include: {
        ocrResult: {
          select: {
            confidence: true,
            pageCount: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
      take: limitNum,
    });

    return documents.map((doc: any) => ({
      id: doc.id,
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      uploadedAt: doc.uploadedAt,
      ocrStatus: doc.ocrResult ? 'completed' : 'pending',
      ocrConfidence: doc.ocrResult?.confidence,
      ocrPageCount: doc.ocrResult?.pageCount,
    }));
  }
}
