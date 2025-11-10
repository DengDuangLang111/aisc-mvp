import { BadRequestException } from '@nestjs/common';
import { FileValidatorHelper } from './file-validator.helper';

jest.mock('file-type', () => ({
  fromBuffer: jest.fn(),
}));

const fileTypeMock = require('file-type');

describe('FileValidatorHelper', () => {
  beforeEach(() => {
    fileTypeMock.fromBuffer.mockReset();
  });

  it('validates allowed MIME types and size', () => {
    expect(FileValidatorHelper.isAllowedMimeType('application/pdf')).toBe(true);
    expect(FileValidatorHelper.isAllowedMimeType('application/zip')).toBe(false);
    expect(FileValidatorHelper.isAllowedSize(5 * 1024 * 1024)).toBe(true);
    expect(FileValidatorHelper.isAllowedSize(20 * 1024 * 1024)).toBe(false);
  });

  it('detects dangerous file extensions', () => {
    expect(FileValidatorHelper.isDangerousFile('virus.exe')).toBe(true);
    expect(FileValidatorHelper.isDangerousFile('notes.pdf')).toBe(false);
  });

  it('sanitizes filenames', () => {
    const sanitized = FileValidatorHelper.sanitizeFilename('../bad\\file?.pdf');
    expect(sanitized).not.toContain('..');
    expect(sanitized).not.toContain('\\');
    expect(sanitized).toMatch(/bad_file_/);
  });

  it('passes validateFileType when detected MIME matches allowed list', async () => {
    fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/pdf' });
    await expect(
      FileValidatorHelper.validateFileType(Buffer.from('data'), 'application/pdf'),
    ).resolves.toBeUndefined();
  });

  it('allows text-based files without magic numbers', async () => {
    fileTypeMock.fromBuffer.mockResolvedValue(undefined);
    await expect(
      FileValidatorHelper.validateFileType(Buffer.from('text'), 'text/plain'),
    ).resolves.toBeUndefined();
  });

  it('throws when file type detection fails', async () => {
    fileTypeMock.fromBuffer.mockRejectedValue(new Error('fail'));
    await expect(
      FileValidatorHelper.validateFileType(Buffer.from('data'), 'application/pdf'),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws when detected MIME is not allowed', async () => {
    fileTypeMock.fromBuffer.mockResolvedValue({ mime: 'application/zip' });
    await expect(
      FileValidatorHelper.validateFileType(Buffer.from('data'), 'application/pdf'),
    ).rejects.toThrow(BadRequestException);
  });
});
