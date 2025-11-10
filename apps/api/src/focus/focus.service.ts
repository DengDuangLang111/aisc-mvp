import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma, FocusSession } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateFocusSessionDto,
  UpdateFocusSessionDto,
  LogDistractionDto,
  FocusSessionAnalytics,
} from './dto';
import {
  FOCUS_INSIGHT_THRESHOLDS,
  FOCUS_SCORE_CONFIG,
} from './constants/focus-score.constants';
import {
  BusinessException,
  ErrorCode,
} from '../common/exceptions/business.exception';

@Injectable()
export class FocusService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a new focus session for the given user.
   * @param userId Owner of the session
   * @param documentId Optional document associated with the session
   * @param conversationId Optional chat conversation to link
   * @returns The created `FocusSession` entity
   */
  async createSession(
    userId: string,
    documentId?: string,
    conversationId?: string,
  ): Promise<FocusSession> {
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
   * Updates status, counters, and metadata for a focus session.
   * @throws BusinessException when the session is missing or belongs to another user
   */
  async updateSession(
    sessionId: string,
    updateDto: UpdateFocusSessionDto,
    userId: string,
  ): Promise<FocusSession> {
    const session = await this.prisma.focusSession.findUnique({
      where: { id: sessionId },
      include: { distractions: true },
    });

    if (!session) {
      throw new BusinessException(
        ErrorCode.SESSION_NOT_FOUND,
        'Focus session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    // 权限检查：只允许会话所有者修改
    if (session.userId !== userId) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED_ACCESS,
        'You do not have permission to update this session',
        HttpStatus.FORBIDDEN,
      );
    }

    const now = new Date();
    const updates: Prisma.FocusSessionUpdateInput = {
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
   * Persists a distraction event and increments counters on the session.
   * @throws BusinessException when the session is invalid or owned by another user
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
      throw new BusinessException(
        ErrorCode.SESSION_NOT_FOUND,
        'Focus session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (session.userId !== userId) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED_ACCESS,
        'You do not have permission to record distractions for this session',
        HttpStatus.FORBIDDEN,
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
   * Retrieves a focus session with distraction history.
   * @throws BusinessException when not found or unauthorized
   */
  async getSession(sessionId: string, userId: string): Promise<FocusSession> {
    const session = await this.prisma.focusSession.findUnique({
      where: { id: sessionId },
      include: {
        distractions: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!session) {
      throw new BusinessException(
        ErrorCode.SESSION_NOT_FOUND,
        'Focus session not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (session.userId !== userId) {
      throw new BusinessException(
        ErrorCode.UNAUTHORIZED_ACCESS,
        'You do not have permission to view this session',
        HttpStatus.FORBIDDEN,
      );
    }

    return session;
  }

  /**
   * Returns a paginated list of focus sessions for the user.
   */
  async getUserSessions(
    userId: string,
    options?: {
      limit?: number;
      offset?: number;
      status?: string;
    },
  ): Promise<{
    data: FocusSession[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { limit = 20, offset = 0, status } = options || {};

    const where: Prisma.FocusSessionWhereInput = { userId };
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
   * Returns analytics details for the requested session.
   * @param sessionId Focus session identifier
   * @param userId Owning user identifier
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

    const completionProof = session.completionProofId
      ? await this.prisma.document.findUnique({
          where: { id: session.completionProofId },
          select: {
            id: true,
            filename: true,
            mimeType: true,
            publicUrl: true,
            uploadedAt: true,
          },
        })
      : null;

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
      completionProof: completionProof
        ? {
            id: completionProof.id,
            filename: completionProof.filename,
            mimeType: completionProof.mimeType,
            downloadUrl: completionProof.publicUrl,
            uploadedAt: completionProof.uploadedAt,
          }
        : undefined,
    };
  }

  /**
   * 计算专注分数 (0-100)
   * 基于干扰次数、暂停次数、会话时长等因素
   */
  private calculateFocusScore(session: FocusSession): number {
    const duration = session.totalDuration || 0;
    const activeDuration = session.activeDuration || duration;
    
    // 如果会话太短，返回较低分数
    if (duration < FOCUS_SCORE_CONFIG.MIN_DURATION_SECONDS) {
      return 50;
    }

    let score = FOCUS_SCORE_CONFIG.BASE_SCORE;

    const distractionPenalty = Math.min(
      session.distractionCount * FOCUS_SCORE_CONFIG.PENALTIES.DISTRACTION_PER_COUNT,
      FOCUS_SCORE_CONFIG.PENALTIES.DISTRACTION_MAX,
    );
    score -= distractionPenalty;

    const pausePenalty = Math.min(
      session.pauseCount * FOCUS_SCORE_CONFIG.PENALTIES.PAUSE_PER_COUNT,
      FOCUS_SCORE_CONFIG.PENALTIES.PAUSE_MAX,
    );
    score -= pausePenalty;

    const activeRatio = activeDuration / duration;
    if (activeRatio < FOCUS_SCORE_CONFIG.ACTIVE_RATIO_THRESHOLD) {
      score -=
        (FOCUS_SCORE_CONFIG.ACTIVE_RATIO_THRESHOLD - activeRatio) *
        FOCUS_SCORE_CONFIG.ACTIVE_RATIO_MULTIPLIER;
    }

    const tabSwitchPenalty = Math.min(
      Math.floor(
        session.tabSwitchCount / FOCUS_SCORE_CONFIG.PENALTIES.TAB_SWITCH_DIVISOR,
      ) * FOCUS_SCORE_CONFIG.PENALTIES.TAB_SWITCH_PENALTY,
      FOCUS_SCORE_CONFIG.PENALTIES.TAB_SWITCH_MAX,
    );
    score -= tabSwitchPenalty;

    // 确保分数在 0-100 范围内
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Converts a numeric score to a letter grade.
   */
  private getGrade(score: number): string {
    if (score >= FOCUS_SCORE_CONFIG.GRADES.A) return 'A';
    if (score >= FOCUS_SCORE_CONFIG.GRADES.B) return 'B';
    if (score >= FOCUS_SCORE_CONFIG.GRADES.C) return 'C';
    if (score >= FOCUS_SCORE_CONFIG.GRADES.D) return 'D';
    return 'F';
  }

  /**
   * Builds personalized insights based on focus session metrics.
   */
  private generateInsights(session: FocusSession): string[] {
    const insights: string[] = [];
    const score = session.focusScore || 0;

    if (score >= FOCUS_INSIGHT_THRESHOLDS.EXCELLENT_SCORE) {
      insights.push('🎉 太棒了！你保持了极高的专注度！');
    } else if (score >= FOCUS_INSIGHT_THRESHOLDS.GOOD_SCORE) {
      insights.push('👍 不错的专注表现，继续保持！');
    } else {
      insights.push('💪 还有提升空间，试着减少干扰源。');
    }

    if (session.distractionCount > FOCUS_INSIGHT_THRESHOLDS.HIGH_DISTRACTION_COUNT) {
      insights.push('⚠️ 干扰次数较多，建议关闭不必要的通知和标签页。');
    }

    if (session.tabSwitchCount > FOCUS_INSIGHT_THRESHOLDS.HIGH_TAB_SWITCH_COUNT) {
      insights.push('🔄 频繁切换标签会影响专注力，试着一次只打开必要的页面。');
    }

    if (session.pauseCount > FOCUS_INSIGHT_THRESHOLDS.HIGH_PAUSE_COUNT) {
      insights.push('⏸️ 暂停次数较多，建议在开始前做好准备工作。');
    }

    const duration = session.totalDuration || 0;
    if (
      duration > 0 &&
      duration < FOCUS_INSIGHT_THRESHOLDS.SHORT_SESSION_SECONDS
    ) {
      insights.push('⏱️ 会话时长较短，建议至少保持15分钟的专注学习。');
    } else if (duration > FOCUS_INSIGHT_THRESHOLDS.LONG_SESSION_SECONDS) {
      insights.push('🎯 长时间保持专注！记得适当休息避免疲劳。');
    }

    return insights;
  }
}
