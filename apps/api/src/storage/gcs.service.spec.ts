import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GcsService } from './gcs.service';

describe('GcsService', () => {
  let service: GcsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        GOOGLE_CLOUD_PROJECT_ID: 'test-project',
        GCS_BUCKET_NAME: 'test-bucket',
        GOOGLE_APPLICATION_CREDENTIALS: undefined,
        GOOGLE_CREDENTIALS_BASE64: undefined,
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GcsService>(GcsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for PDF', () => {
      const result = (service as any).getMimeType('.pdf');
      expect(result).toBe('application/pdf');
    });

    it('should return correct MIME type for images', () => {
      expect((service as any).getMimeType('.jpg')).toBe('image/jpeg');
      expect((service as any).getMimeType('.png')).toBe('image/png');
      expect((service as any).getMimeType('.gif')).toBe('image/gif');
    });

    it('should return default MIME type for unknown extension', () => {
      const result = (service as any).getMimeType('.unknown');
      expect(result).toBe('application/octet-stream');
    });

    it('should be case-insensitive', () => {
      expect((service as any).getMimeType('.PDF')).toBe('application/pdf');
      expect((service as any).getMimeType('.PNG')).toBe('image/png');
    });
  });

  describe('configuration', () => {
    it('should use configuration from ConfigService', () => {
      expect(configService.get('GOOGLE_CLOUD_PROJECT_ID')).toBe('test-project');
      expect(configService.get('GCS_BUCKET_NAME')).toBe('test-bucket');
    });
  });

  // Note: Integration tests for actual GCS operations should be in e2e tests
  // as they require real Google Cloud credentials

  describe('uploadFile', () => {
    it('should upload file successfully and return GCS result', async () => {
      const mockBuffer = Buffer.from('test file content');
      const mockFilename = 'test.pdf';
      
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockFile = { 
        save: mockSave,
        getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url'])
      };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      const result = await service.uploadFile(mockBuffer, mockFilename);

      expect(result).toHaveProperty('gcsPath');
      expect(result).toHaveProperty('publicUrl');
      expect(result).toHaveProperty('filename');
      expect(result.bucket).toBe('test-bucket');
      expect(result.gcsPath).toContain('gs://test-bucket/uploads/');
      expect(mockSave).toHaveBeenCalledWith(mockBuffer, expect.objectContaining({
        metadata: expect.objectContaining({
          contentType: 'application/pdf',
        }),
      }));
    });

    it('should use custom folder when provided', async () => {
      const mockBuffer = Buffer.from('test');
      const mockFilename = 'image.png';
      
      const mockSave = jest.fn().mockResolvedValue(undefined);
      const mockFile = { 
        save: mockSave,
        getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url'])
      };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      const result = await service.uploadFile(mockBuffer, mockFilename, 'images');

      expect(result.gcsPath).toContain('gs://test-bucket/images/');
    });

    it('should throw error when upload fails', async () => {
      const mockBuffer = Buffer.from('test');
      const mockSave = jest.fn().mockRejectedValue(new Error('Upload failed'));
      const mockFile = { 
        save: mockSave,
        getSignedUrl: jest.fn().mockResolvedValue(['https://storage.googleapis.com/signed-url'])
      };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      await expect(service.uploadFile(mockBuffer, 'test.pdf')).rejects.toThrow('GCS upload failed');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate signed URL successfully', async () => {
      const mockGcsPath = 'gs://test-bucket/uploads/test.pdf';
      const mockSignedUrl = 'https://storage.googleapis.com/signed-url';
      
      const mockGetSignedUrl = jest.fn().mockResolvedValue([mockSignedUrl]);
      const mockFile = { getSignedUrl: mockGetSignedUrl };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      const result = await service.getSignedUrl(mockGcsPath);

      expect(result).toBe(mockSignedUrl);
      expect(mockGetSignedUrl).toHaveBeenCalledWith({
        version: 'v4',
        action: 'read',
        expires: expect.any(Number),
      });
    });

    it('should handle custom expiration days', async () => {
      const mockGcsPath = 'gs://test-bucket/uploads/test.pdf';
      const mockGetSignedUrl = jest.fn().mockResolvedValue(['url']);
      const mockFile = { getSignedUrl: mockGetSignedUrl };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      await service.getSignedUrl(mockGcsPath, 14);

      expect(mockGetSignedUrl).toHaveBeenCalled();
    });

    it('should throw error when signed URL generation fails', async () => {
      const mockGetSignedUrl = jest.fn().mockRejectedValue(new Error('Auth failed'));
      const mockFile = { getSignedUrl: mockGetSignedUrl };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      await expect(service.getSignedUrl('gs://test-bucket/test.pdf')).rejects.toThrow('Failed to generate signed URL');
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const mockGcsPath = 'gs://test-bucket/uploads/test.pdf';
      
      const mockDelete = jest.fn().mockResolvedValue(undefined);
      const mockFile = { delete: mockDelete };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      await service.deleteFile(mockGcsPath);

      expect(mockDelete).toHaveBeenCalled();
    });

    it('should throw error when delete fails', async () => {
      const mockDelete = jest.fn().mockRejectedValue(new Error('File not found'));
      const mockFile = { delete: mockDelete };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      await expect(service.deleteFile('gs://test-bucket/test.pdf')).rejects.toThrow('Failed to delete file');
    });
  });

  describe('listFiles', () => {
    it('should list files in folder successfully', async () => {
      const mockFiles = [
        { name: 'uploads/file1.pdf' },
        { name: 'uploads/file2.pdf' },
      ];
      
      const mockGetFiles = jest.fn().mockResolvedValue([mockFiles]);
      const mockBucket = { getFiles: mockGetFiles };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      const result = await service.listFiles('uploads');

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('gs://test-bucket/uploads/file1.pdf');
      expect(result[1]).toBe('gs://test-bucket/uploads/file2.pdf');
      expect(mockGetFiles).toHaveBeenCalledWith({ prefix: 'uploads' });
    });

    it('should use default folder when not provided', async () => {
      const mockGetFiles = jest.fn().mockResolvedValue([[]]);
      const mockBucket = { getFiles: mockGetFiles };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      await service.listFiles();

      expect(mockGetFiles).toHaveBeenCalledWith({ prefix: 'uploads' });
    });

    it('should throw error when listing fails', async () => {
      const mockGetFiles = jest.fn().mockRejectedValue(new Error('Access denied'));
      const mockBucket = { getFiles: mockGetFiles };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      await expect(service.listFiles('uploads')).rejects.toThrow('Failed to list files');
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      const mockGcsPath = 'gs://test-bucket/uploads/test.pdf';
      
      const mockExists = jest.fn().mockResolvedValue([true]);
      const mockFile = { exists: mockExists };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      const result = await service.fileExists(mockGcsPath);

      expect(result).toBe(true);
      expect(mockExists).toHaveBeenCalled();
    });

    it('should return false when file does not exist', async () => {
      const mockExists = jest.fn().mockResolvedValue([false]);
      const mockFile = { exists: mockExists };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      const result = await service.fileExists('gs://test-bucket/nonexistent.pdf');

      expect(result).toBe(false);
    });

    it('should return false when check fails', async () => {
      const mockExists = jest.fn().mockRejectedValue(new Error('Network error'));
      const mockFile = { exists: mockExists };
      const mockBucket = { file: jest.fn().mockReturnValue(mockFile) };
      (service as any).storage = { bucket: jest.fn().mockReturnValue(mockBucket) };

      const result = await service.fileExists('gs://test-bucket/test.pdf');

      expect(result).toBe(false);
    });
  });
});
