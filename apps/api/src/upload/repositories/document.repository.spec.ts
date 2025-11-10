import { DocumentRepository } from './document.repository';
import { PrismaService } from '../../prisma/prisma.service';

describe('DocumentRepository', () => {
  let repository: DocumentRepository;
  const documentDelegate = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  };
  const mockPrisma = {
    document: documentDelegate,
  } as unknown as PrismaService;

  beforeEach(() => {
    Object.values(documentDelegate).forEach((fn) => fn.mockReset());
    repository = new DocumentRepository(mockPrisma);
  });

  describe('create', () => {
    it('creates a document with provided data', async () => {
      const input = {
        filename: 'sample.pdf',
        size: 1024,
        ocrStatus: 'pending' as const,
        userId: 'user-1',
      };
      const mockDocument = { id: 'doc-1', ...input };
      documentDelegate.create.mockResolvedValue(mockDocument);

      const result = await repository.create(input);

      expect(documentDelegate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          filename: input.filename,
          size: input.size,
          userId: input.userId,
          ocrStatus: input.ocrStatus,
        }),
      });
      expect(result).toEqual(mockDocument);
    });
  });

  describe('findById', () => {
    it('returns document with OCR relation', async () => {
      const mockDocument = { id: 'doc-1', filename: 'sample.pdf' };
      documentDelegate.findUnique.mockResolvedValue(mockDocument);

      const result = await repository.findById('doc-1');

      expect(documentDelegate.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        include: { ocrResult: true },
      });
      expect(result).toEqual(mockDocument);
    });
  });

  describe('findMany', () => {
    it('applies optional filters and pagination', async () => {
      const mockDocuments = [{ id: 'doc-1' }];
      documentDelegate.findMany.mockResolvedValue(mockDocuments);

      const result = await repository.findMany({
        userId: 'user-1',
        limit: 10,
        offset: 5,
      });

      expect(documentDelegate.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        include: { ocrResult: true },
        orderBy: { uploadedAt: 'desc' },
        take: 10,
        skip: 5,
      });
      expect(result).toEqual(mockDocuments);
    });
  });

  describe('count', () => {
    it('counts documents with optional user filter', async () => {
      documentDelegate.count.mockResolvedValue(3);

      const result = await repository.count({ userId: 'user-1' });

      expect(documentDelegate.count).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(result).toBe(3);
    });
  });

  describe('updateOcrStatus', () => {
    it('updates OCR status by document id', async () => {
      const mockDocument = { id: 'doc-1', ocrStatus: 'completed' };
      documentDelegate.update.mockResolvedValue(mockDocument);

      const result = await repository.updateOcrStatus('doc-1', 'completed');

      expect(documentDelegate.update).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        data: { ocrStatus: 'completed' },
      });
      expect(result).toEqual(mockDocument);
    });
  });

  describe('delete', () => {
    it('removes document by id', async () => {
      const mockDocument = { id: 'doc-1' };
      documentDelegate.delete.mockResolvedValue(mockDocument);

      const result = await repository.delete('doc-1');

      expect(documentDelegate.delete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
      expect(result).toEqual(mockDocument);
    });
  });

  describe('deleteExpired', () => {
    it('deletes documents older than specified date', async () => {
      documentDelegate.deleteMany.mockResolvedValue({ count: 2 });
      const beforeDate = new Date();

      const result = await repository.deleteExpired(beforeDate);

      expect(documentDelegate.deleteMany).toHaveBeenCalledWith({
        where: {
          uploadedAt: {
            lt: beforeDate,
          },
        },
      });
      expect(result).toBe(2);
    });
  });

  describe('findByOriginalName', () => {
    it('returns documents filtered by original name and user', async () => {
      const mockDocuments = [{ id: 'doc-1', originalName: 'notes.pdf' }];
      documentDelegate.findMany.mockResolvedValue(mockDocuments);

      const result = await repository.findByOriginalName('notes.pdf', 'user-1');

      expect(documentDelegate.findMany).toHaveBeenCalledWith({
        where: {
          originalName: 'notes.pdf',
          userId: 'user-1',
        },
        include: { ocrResult: true },
        orderBy: { uploadedAt: 'desc' },
      });
      expect(result).toEqual(mockDocuments);
    });
  });
});
