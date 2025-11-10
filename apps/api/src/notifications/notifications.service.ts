import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ReminderBanner {
  id: string;
  title: string;
  message: string;
  actionLabel: string;
  actionUrl: string;
  severity: 'info' | 'warning' | 'critical';
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getReminderBanners(userId: string): Promise<ReminderBanner[]> {
    if (!userId) return [];

    const activeSession = await this.prisma.focusSession.findFirst({
      where: {
        userId,
        status: { in: ['active', 'paused'] },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const recentSessions = await this.prisma.focusSession.findMany({
      where: {
        userId,
        status: 'completed',
      },
      orderBy: { startTime: 'desc' },
      take: 7,
    });

    const banners: ReminderBanner[] = [];

    if (activeSession) {
      banners.push({
        id: `focus-${activeSession.id}`,
        title: '专注模式仍在运行',
        message:
          '你在浏览器中很久没返回专注模式，继续完成本次会话吧。暂停/完成都会同步到后台。',
        actionLabel: '回到专注',
        actionUrl: '/chat',
        severity: 'warning',
      });
    }

    const streakId = this.createStreakReminder(recentSessions);
    if (streakId) {
      banners.push(streakId);
    }

    const pendingProof = this.findPendingProof(recentSessions);
    if (pendingProof) {
      banners.push(pendingProof);
    }

    return banners;
  }

  private createStreakReminder(sessions: { startTime: Date }[]): ReminderBanner | null {
    if (sessions.length < 2) return null;

    const now = new Date();
    const lastSession = new Date(sessions[0].startTime);
    const diffMs = now.getTime() - lastSession.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (diffDays < 1) return null;

    const streakDays = this.computeUniqueDays(sessions);
    if (streakDays < 3) return null;

    return {
      id: `streak-${lastSession.toISOString()}`,
      title: '连胜即将中断',
      message: `你已经连续 ${streakDays} 天保持专注，但距离上次会话已超过 24 小时，记得再出一个 Focus Session 保住 streak。`,
      actionLabel: '继续打卡',
      actionUrl: '/chat',
      severity: 'critical',
    };
  }

  private findPendingProof(
    sessions: { id: string; completionProofId?: string | null }[],
  ): ReminderBanner | null {
    const sessionNeedingProof = sessions.find(
      (session) =>
        session.completionProofId === null || session.completionProofId === undefined,
    );

    if (!sessionNeedingProof) return null;

    return {
      id: `proof-${sessionNeedingProof.id}`,
      title: '完成证明缺失',
      message:
        '最近的一次专注会话还没有上传完成证明，立即上传可以获得积分与教师认证。',
      actionLabel: '附加证明',
      actionUrl: `/focus/report/${sessionNeedingProof.id}`,
      severity: 'info',
    };
  }

  private computeUniqueDays(sessions: { startTime: Date }[]): number {
    const uniqueDays = new Set(
      sessions.map((session) => new Date(session.startTime).toISOString().split('T')[0]),
    );
    return uniqueDays.size;
  }
}
