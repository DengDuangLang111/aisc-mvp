import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
    
    // Mock Prisma client methods
    service.$connect = jest.fn();
    service.$disconnect = jest.fn();
    service.$queryRaw = jest.fn();
    service.$executeRawUnsafe = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should connect to database successfully', async () => {
      (service.$connect as jest.Mock).mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(service.$connect).toHaveBeenCalled();
    });

    it('should throw error if connection fails', async () => {
      const error = new Error('Connection failed');
      (service.$connect as jest.Mock).mockRejectedValue(error);

      await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
      expect(service.$connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from database successfully', async () => {
      (service.$disconnect as jest.Mock).mockResolvedValue(undefined);

      await service.onModuleDestroy();

      expect(service.$disconnect).toHaveBeenCalled();
    });

    it('should handle disconnection errors gracefully', async () => {
      const error = new Error('Disconnection failed');
      (service.$disconnect as jest.Mock).mockRejectedValue(error);

      // Should not throw, just log the error
      await expect(service.onModuleDestroy()).resolves.not.toThrow();
      expect(service.$disconnect).toHaveBeenCalled();
    });
  });

  describe('cleanDatabase', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should throw error in production environment', async () => {
      process.env.NODE_ENV = 'production';

      await expect(service.cleanDatabase()).rejects.toThrow(
        'Cannot clean database in production',
      );
    });

    it('should clean all tables in non-production environment', async () => {
      process.env.NODE_ENV = 'test';

      const mockTables = [
        { tablename: 'users' },
        { tablename: 'documents' },
        { tablename: '_prisma_migrations' },
      ];

      (service.$queryRaw as jest.Mock).mockResolvedValue(mockTables);
      (service.$executeRawUnsafe as jest.Mock).mockResolvedValue(undefined);

      await service.cleanDatabase();

      expect(service.$queryRaw).toHaveBeenCalled();
      // Should truncate all tables except _prisma_migrations
      expect(service.$executeRawUnsafe).toHaveBeenCalledTimes(2);
      expect(service.$executeRawUnsafe).toHaveBeenCalledWith(
        'TRUNCATE TABLE "public"."users" CASCADE;',
      );
      expect(service.$executeRawUnsafe).toHaveBeenCalledWith(
        'TRUNCATE TABLE "public"."documents" CASCADE;',
      );
    });

    it('should handle table truncation errors gracefully', async () => {
      process.env.NODE_ENV = 'test';

      const mockTables = [{ tablename: 'users' }];

      (service.$queryRaw as jest.Mock).mockResolvedValue(mockTables);
      (service.$executeRawUnsafe as jest.Mock).mockRejectedValue(
        new Error('Truncate failed'),
      );

      // Should not throw, just log warnings
      await expect(service.cleanDatabase()).resolves.not.toThrow();
      expect(service.$executeRawUnsafe).toHaveBeenCalled();
    });
  });
});
