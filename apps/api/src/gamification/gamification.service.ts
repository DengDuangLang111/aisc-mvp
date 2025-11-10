import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface GamificationProgress {
  currentStreak: number;
  longestStreak: number;
  averageFocusScore: number;
  totalPoints: number;
  badges: string[];
  recentSessions: Array<{
    sessionId: string;
    date: string;
    focusScore?: number | null;
    completionProofId?: string | null;
  }>;
}

@Injectable()
export class GamificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserProgress(userId: string): Promise<GamificationProgress> {
    const sessions = await this.prisma.focusSession.findMany({
      where: { userId, status: 'completed' },
      orderBy: { startTime: 'desc' },
      take: 30,
      select: {
        id: true,
        focusScore: true,
        startTime: true,
        completionProofId: true,
      },
    });

    const dayStrings = sessions
      .map((session) =>
        new Date(session.startTime).toISOString().split('T')[0],
      )
      .filter((value, index, self) => self.indexOf(value) === index);

    const currentStreak = this.calculateCurrentStreak(dayStrings);
    const longestStreak = this.calculateLongestStreak(dayStrings);
    const averageFocusScore = sessions.length
      ? Number(
          (
            sessions
              .filter((session) => typeof session.focusScore === 'number')
              .reduce(
                (acc, session) => acc + (session.focusScore ?? 0),
                0,
              ) / sessions.length
          ).toFixed(1),
        )
      : 0;

    const totalPoints = sessions.reduce(
      (acc, session) => acc + Math.round(session.focusScore ?? 0),
      0,
    );

    const badges = this.buildBadges({ currentStreak, longestStreak, totalPoints });

    return {
      currentStreak,
      longestStreak,
      averageFocusScore,
      totalPoints,
      badges,
      recentSessions: sessions.map((session) => ({
        sessionId: session.id,
        date: new Date(session.startTime).toISOString(),
        focusScore: session.focusScore,
        completionProofId: session.completionProofId,
      })),
    };
  }

  private buildBadges(data: {
    currentStreak: number;
    longestStreak: number;
    totalPoints: number;
  }): string[] {
    const badges: string[] = [];

    if (data.currentStreak >= 7) {
      badges.push('7-Day Streak');
    }
    if (data.longestStreak >= 30) {
      badges.push('30-Day Legend');
    }
    if (data.totalPoints >= 1000) {
      badges.push('1k Points');
    }

    return badges;
  }

  private calculateCurrentStreak(sortedDays: string[]): number {
    if (!sortedDays.length) return 0;

    const today = new Date(sortedDays[0]);
    let streak = 0;
    let prevDay = today;

    for (const dayString of sortedDays) {
      const day = new Date(dayString);
      const diffDays = this.daysBetween(day, prevDay);

      if (diffDays <= 1) {
        streak += 1;
        prevDay = day;
      } else {
        break;
      }
    }

    return streak;
  }

  private calculateLongestStreak(sortedDays: string[]): number {
    if (!sortedDays.length) return 0;
    let longest = 1;
    let current = 1;
    let prevDay = new Date(sortedDays[0]);

    for (let i = 1; i < sortedDays.length; i += 1) {
      const currentDay = new Date(sortedDays[i]);
      const diff = this.daysBetween(currentDay, prevDay);

      if (diff <= 1) {
        current += 1;
      } else {
        longest = Math.max(longest, current);
        current = 1;
      }

      prevDay = currentDay;
    }

    return Math.max(longest, current);
  }

  private daysBetween(a: Date, b: Date): number {
    const diff = Math.abs(a.getTime() - b.getTime());
    return Math.round(diff / (1000 * 60 * 60 * 24));
  }
}
