import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Conversation, Message, Prisma } from '@prisma/client';

export interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export interface ConversationListPreview {
  id: string;
  title: string | null;
  userId: string | null;
  documentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  lastMessage: {
    id: string;
    content: string;
    createdAt: Date;
  } | null;
}

@Injectable()
export class ConversationRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建新对话
   */
  async create(data: {
    title: string;
    userId?: string;
    documentId?: string;
  }): Promise<Conversation> {
    return this.prisma.conversation.create({
      data: {
        title: data.title,
        userId: data.userId || null,
        documentId: data.documentId || null,
      },
    });
  }

  /**
   * 根据ID查询对话（包含所有消息）
   */
  async findById(id: string): Promise<ConversationWithMessages | null> {
    return this.prisma.conversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * 查询对话列表
   */
  async findMany(params: {
    userId?: string;
    limit?: number;
    offset?: number;
    orderBy?: Prisma.ConversationOrderByWithRelationInput;
  }): Promise<ConversationListPreview[]> {
    const { userId, limit = 20, offset = 0, orderBy } = params;

    const conversations = await this.prisma.conversation.findMany({
      where: userId ? { userId } : {},
      select: {
        id: true,
        title: true,
        userId: true,
        documentId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { messages: true },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
          },
        },
      },
      orderBy: orderBy || { updatedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    return conversations.map((conv) => ({
      id: conv.id,
      title: conv.title,
      userId: conv.userId,
      documentId: conv.documentId,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      messageCount: conv._count.messages,
      lastMessage: conv.messages[0] || null,
    }));
  }

  /**
   * 统计对话总数
   */
  async count(params: { userId?: string }): Promise<number> {
    return this.prisma.conversation.count({
      where: params.userId ? { userId: params.userId } : {},
    });
  }

  /**
   * 更新对话标题
   */
  async updateTitle(id: string, title: string): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { title, updatedAt: new Date() },
    });
  }

  /**
   * 更新对话的updatedAt时间戳
   */
  async touch(id: string): Promise<Conversation> {
    return this.prisma.conversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  /**
   * 删除对话
   */
  async delete(id: string): Promise<Conversation> {
    return this.prisma.conversation.delete({
      where: { id },
    });
  }

  /**
   * 根据文档ID查询对话
   */
  async findByDocumentId(documentId: string): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 批量删除过期对话
   */
  async deleteExpired(beforeDate: Date): Promise<number> {
    const result = await this.prisma.conversation.deleteMany({
      where: {
        updatedAt: {
          lt: beforeDate,
        },
      },
    });

    return result.count;
  }
}
