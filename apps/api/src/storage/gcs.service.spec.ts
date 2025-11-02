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
});
