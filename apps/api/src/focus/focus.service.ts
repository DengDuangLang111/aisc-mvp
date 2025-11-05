import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFocusSessionDto,
  UpdateFocusSessionDto,
  LogDistractionDto,
  FocusSessionAnalytics,
} from './dto';

@Injectable()
export class FocusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建新的专注会话
   */
  async createSession(
    userId: string,
    documentId?: string,
    conversationId?: string,
  ) {
    return this.prisma.focusSession.create({
      data: {
        userId,
        documentId,
        conversationId,
        status: 'active',
        startTime: new Date(),
      },
    });
  }

  /**
   * 更新会话状态 (pause/resume/complete/abandon)
   * @throws ForbiddenException 如果用户不是会话所有者
   */
  async updateSession(
    sessionId: string,
    updateDto: UpdateFocusSessionDto,
    userId: string,
  ) {
    const session = await this.prisma.focusSession.findUnique({
      where: { id: sessionId },
      include: { distractions: true },
    });

    if (!session) {
      throw new NotFoundException('Focus session not found');
    }

    // 权限检查：只允许会话所有者修改
    if (session.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to update this session',
      );
    }

    const now = new Date();
    const updates: any = {
      updatedAt: now,
    };

    // 处理状态更新
    if (updateDto.status) {
      updates.status = updateDto.status;

      if (updateDto.status === 'completed' || updateDto.status === 'abandoned') {
        updates.endTime = now;
        // 计算总时长（秒）
        const duration = Math.floor(
          (now.getTime() - session.startTime.getTime()) / 1000,
        );
        updates.totalDuration = duration;
        
        // 计算专注分数
        updates.focusScore = this.calculateFocusScore(session);
      }
    }

    // 更新其他字段
    if (updateDto.pauseCount !== undefined) {
      updates.pauseCount = updateDto.pauseCount;
    }
    if (updateDto.questionsAsked !== undefined) {
      updates.questionsAsked = updateDto.questionsAsked;
    }
    if (updateDto.completionProofId) {
      updates.completionProofId = updateDto.completionProofId;
    }
    if (updateDto.activeDuration !== undefined) {
      updates.activeDuration = updateDto.activeDuration;
    }

    return this.prisma.focusSession.update({
      where: { id: sessionId },
      data: updates,
      include: { distractions: true },
    });
  }

  /**
   * 记录干扰事件
   * @throws ForbiddenException 如果用户不是会话所有者
   */
  async logDistraction(
    sessionId: string,
    distractionDto: LogDistractionDto,
    userId: string,
  ) {
    // 先检查会话是否存在且用户有权访问
    const session = await this.prisma.focusSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Focus session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to record distractions for this session',
      );
    }

    // 创建干扰记录
    const distraction = await this.prisma.focusDistraction.create({
      data: {
        sessionId,
        distractionType: distractionDto.type,
        duration: distractionDto.duration,
        timestamp: new Date(),
      },
    });

    // 更新会话的干扰计数
    await this.prisma.focusSession.update({
      where: { id: sessionId },
      data: {
        distractionCount: { increment: 1 },
        tabSwitchCount:
          distractionDto.type === 'tab_switch'
            ? { increment: 1 }
            : undefined,
      },
    });

    return distraction;
  }

  /**
   * 获取会话详情
   * @throws ForbiddenException 如果用户不是会话所有者
   */
  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.focusSession.findUnique({
      where: { id: sessionId },
      include: {
        distractions: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Focus session not found');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException(
        'You do not have permission to view this session',
      );
    }

    return session;
  }

  /**
   * 获取用户的会话列表
   */
  async getUserSessions(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    },
  ) {
    const { limit = 20, offset = 0, status } = options || {};

    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.focusSession.findMany({
        where,
        orderBy: { startTime: 'desc' },
        take: limit,
        skip: offset,
        include: {
          distractions: {
            select: {
              id: true,
              distractionType: true,
              timestamp: true,
            },
          },
        },
      }),
      this.prisma.focusSession.count({ where }),
    ]);

    return {
      data: sessions,
      total,
      limit,
      offset,
    };
  }

  /**
   * 获取会话分析数据
   * @throws ForbiddenException 如果用户不是会话所有者
   */
  async getSessionAnalytics(
    sessionId: string,
    userId: string,
  ): Promise<FocusSessionAnalytics> {
    const session = await this.getSession(sessionId, userId);

    // 计算各类统计数据
    const distractionsByType = session.distractions.reduce((acc, d) => {
      acc[d.distractionType] = (acc[d.distractionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalDuration = session.totalDuration || 0;
    const activeDuration = session.activeDuration || totalDuration;
    const distractionTime = totalDuration - activeDuration;

    return {
      sessionId: session.id,
      userId: session.userId,
      startTime: session.startTime,
      endTime: session.endTime,
      totalDuration,
      activeDuration,
      distractionTime,
      focusScore: session.focusScore || 0,
      status: session.status,
      metrics: {
        totalDistractions: session.distractionCount,
        tabSwitches: session.tabSwitchCount,
        pauses: session.pauseCount,
        questionsAsked: session.questionsAsked,
        distractionsByType,
      },
      grade: this.getGrade(session.focusScore || 0),
      insights: this.generateInsights(session),
    };
  }

  /**
   * 计算专注分数 (0-100)
   * 基于干扰次数、暂停次数、会话时长等因素
   */
  private calculateFocusScore(session: any): number {
    const duration = session.totalDuration || 0;
    const activeDuration = session.activeDuration || duration;
    
    // 如果会话太短，返回较低分数
    if (duration < 60) {
      return 50;
    }

    // 基础分数 100
    let score = 100;

    // 根据干扰次数扣分（每次干扰扣2分，最多扣40分）
    const distractionPenalty = Math.min(session.distractionCount * 2, 40);
    score -= distractionPenalty;

    // 根据暂停次数扣分（每次暂停扣5分，最多扣20分）
    const pausePenalty = Math.min(session.pauseCount * 5, 20);
    score -= pausePenalty;

    // 根据活跃时长比例加分/扣分
    const activeRatio = activeDuration / duration;
    if (activeRatio < 0.7) {
      score -= (0.7 - activeRatio) * 50; // 最多扣15分
    }

    // 根据标签切换次数扣分（每5次扣2分，最多扣10分）
    const tabSwitchPenalty = Math.min(Math.floor(session.tabSwitchCount / 5) * 2, 10);
    score -= tabSwitchPenalty;

    // 确保分数在 0-100 范围内
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 获取成绩等级
   */
  private getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * 生成个性化建议
   */
  private generateInsights(session: any): string[] {
    const insights: string[] = [];
    const score = session.focusScore || 0;

    if (score >= 90) {
      insights.push('🎉 太棒了！你保持了极高的专注度！');
    } else if (score >= 70) {
      insights.push('👍 不错的专注表现，继续保持！');
    } else {
      insights.push('💪 还有提升空间，试着减少干扰源。');
    }

    if (session.distractionCount > 10) {
      insights.push('⚠️ 干扰次数较多，建议关闭不必要的通知和标签页。');
    }

    if (session.tabSwitchCount > 15) {
      insights.push('🔄 频繁切换标签会影响专注力，试着一次只打开必要的页面。');
    }

    if (session.pauseCount > 5) {
      insights.push('⏸️ 暂停次数较多，建议在开始前做好准备工作。');
    }

    const duration = session.totalDuration || 0;
    if (duration > 0 && duration < 300) {
      insights.push('⏱️ 会话时长较短，建议至少保持15分钟的专注学习。');
    } else if (duration > 3600) {
      insights.push('🎯 长时间保持专注！记得适当休息避免疲劳。');
    }

    return insights;
  }
}
