import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Message } from '@prisma/client';

@Injectable()
export class MessageRepository {
  constructor(private prisma: PrismaService) {}

  /**
   * 创建新消息
   */
  async create(data: {
    conversationId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    tokensUsed?: number;
  }): Promise<Message> {
    return this.prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        tokensUsed: data.tokensUsed || null,
      },
    });
  }

  /**
   * 批量创建消息
   */
  async createMany(
    messages: Array<{
      conversationId: string;
      role: 'user' | 'assistant' | 'system';
      content: string;
      tokensUsed?: number;
    }>,
  ): Promise<number> {
    const result = await this.prisma.message.createMany({
      data: messages.map((msg) => ({
        conversationId: msg.conversationId,
        role: msg.role,
        content: msg.content,
        tokensUsed: msg.tokensUsed || null,
      })),
    });

    return result.count;
  }

  /**
   * 根据对话ID查询所有消息
   */
  async findByConversationId(conversationId: string): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * 根据ID查询消息
   */
  async findById(id: string): Promise<Message | null> {
    return this.prisma.message.findUnique({
      where: { id },
    });
  }

  /**
   * 更新消息内容
   */
  async update(
    id: string,
    data: {
      content?: string;
      tokensUsed?: number;
    },
  ): Promise<Message> {
    return this.prisma.message.update({
      where: { id },
      data,
    });
  }

  /**
   * 删除单条消息
   */
  async delete(id: string): Promise<Message> {
    return this.prisma.message.delete({
      where: { id },
    });
  }

  /**
   * 根据对话ID删除所有消息
   */
  async deleteByConversationId(conversationId: string): Promise<number> {
    const result = await this.prisma.message.deleteMany({
      where: { conversationId },
    });
    return result.count;
  }

  /**
   * 统计对话的消息数量
   */
  async countByConversationId(conversationId: string): Promise<number> {
    return this.prisma.message.count({
      where: { conversationId },
    });
  }

  /**
   * 获取对话的最后N条消息
   */
  async findLastN(conversationId: string, n: number): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: n,
    });
  }

  /**
   * 计算对话的总token数
   */
  async calculateTotalTokens(conversationId: string): Promise<number> {
    const result = await this.prisma.message.aggregate({
      where: { conversationId },
      _sum: {
        tokensUsed: true,
      },
    });

    return result._sum?.tokensUsed || 0;
  }
}
