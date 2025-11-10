import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Document, OcrResult, Prisma } from '@prisma/client';

export interface DocumentWithOcr extends Document {
  ocrResult: OcrResult | null;
}

@Injectable()
export class DocumentRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建新文档记录
   */
  async create(data: {
    filename: string;
    originalName?: string;
    gcsPath?: string;
    s3Key?: string;
    mimeType?: string;
    size: number;
    userId?: string;
    ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    publicUrl?: string;
  }): Promise<Document> {
    return this.prisma.document.create({
      data: {
        filename: data.filename,
        originalName: data.originalName || null,
        gcsPath: data.gcsPath || null,
        s3Key: data.s3Key || null,
        publicUrl: data.publicUrl || null,
        mimeType: data.mimeType || null,
        size: data.size,
        userId: data.userId || null,
        ocrStatus: data.ocrStatus || 'pending',
      },
    });
  }

  /**
   * 根据ID查询文档（包含OCR结果）
   */
  async findById(id: string): Promise<DocumentWithOcr | null> {
    return this.prisma.document.findUnique({
      where: { id },
      include: { ocrResult: true },
    });
  }

  /**
   * 查询文档列表
   */
  async findMany(params: {
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<DocumentWithOcr[]> {
    const { userId, limit = 50, offset = 0 } = params;

    return this.prisma.document.findMany({
      where: userId ? { userId } : {},
      include: {
        ocrResult: true,
      },
      orderBy: { uploadedAt: 'desc' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * 统计文档总数
   */
  async count(params: { userId?: string }): Promise<number> {
    return this.prisma.document.count({
      where: params.userId ? { userId: params.userId } : {},
    });
  }

  /**
   * 更新OCR处理状态
   */
  async updateOcrStatus(
    documentId: string,
    status: 'pending' | 'processing' | 'completed' | 'failed',
  ): Promise<Document> {
    return this.prisma.document.update({
      where: { id: documentId },
      data: { ocrStatus: status },
    });
  }

  /**
   * 删除文档
   */
  async delete(id: string): Promise<Document> {
    return this.prisma.document.delete({
      where: { id },
    });
  }

  /**
   * 批量删除过期文档
   */
  async deleteExpired(beforeDate: Date): Promise<number> {
    const result = await this.prisma.document.deleteMany({
      where: {
        uploadedAt: {
          lt: beforeDate,
        },
      },
    });

    return result.count;
  }

  /**
   * 根据原始文件名查询
   */
  async findByOriginalName(
    originalName: string,
    userId?: string,
  ): Promise<DocumentWithOcr[]> {
    return this.prisma.document.findMany({
      where: {
        originalName,
        ...(userId ? { userId } : {}),
      },
      include: { ocrResult: true },
      orderBy: { uploadedAt: 'desc' },
    });
  }
}
