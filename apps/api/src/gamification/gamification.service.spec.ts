import { Test, TestingModule } from '@nestjs/testing';
import { GamificationService } from './gamification.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GamificationService', () => {
  let service: GamificationService;
  let prismaService: Partial<PrismaService>;

  beforeEach(async () => {
    prismaService = {
      focusSession: {
        findMany: jest.fn(),
      },
    } as unknown as Partial<PrismaService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GamificationService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<GamificationService>(GamificationService);
  });

  it('calculates progress based on recent completed sessions', async () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    (prismaService.focusSession!.findMany as jest.Mock).mockResolvedValue([
      {
        id: 's1',
        focusScore: 80,
        startTime: today.toISOString(),
        completionProofId: 'doc-1',
      },
      {
        id: 's2',
        focusScore: 70,
        startTime: yesterday.toISOString(),
        completionProofId: null,
      },
      {
        id: 's3',
        focusScore: 90,
        startTime: twoDaysAgo.toISOString(),
        completionProofId: 'doc-2',
      },
    ]);

    const progress = await service.getUserProgress('user-1');

    expect(progress.currentStreak).toBe(3);
    expect(progress.longestStreak).toBe(3);
    expect(progress.averageFocusScore).toBeCloseTo(80);
    expect(progress.totalPoints).toBe(240);
    expect(progress.badges).toEqual([]);
    expect(progress.recentSessions).toHaveLength(3);
  });
});
