/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { ApiClient } from '../../../../lib/api-client'
import { useOcrLogic } from '../useOcrLogic'

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}))

describe('useOcrLogic', () => {
  const uploadFileMock = jest.spyOn(ApiClient, 'uploadFile')
  const getOcrResultMock = jest.spyOn(ApiClient, 'getOcrResult')

  beforeAll(() => {
    Object.defineProperty(global.URL, 'createObjectURL', {
      writable: true,
      value: jest.fn(() => 'blob:mock-url'),
    })

    Object.defineProperty(global.URL, 'revokeObjectURL', {
      writable: true,
      value: jest.fn(),
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    window.alert = jest.fn()
  })

  it('uses documentId returned from upload when fetching OCR results', async () => {
    uploadFileMock.mockResolvedValue({
      id: 'upload-1',
      filename: 'sample.pdf',
      url: 'http://localhost/sample.pdf',
      size: 1024,
      mimetype: 'application/pdf',
      documentId: 'doc-123',
    })

    getOcrResultMock.mockResolvedValue({
      fullText: 'Recognized text',
      confidence: 0.95,
      language: 'en',
      pageCount: 1,
    })

    const file = new File(['fake content'], 'sample.pdf', { type: 'application/pdf' })
    const { result } = renderHook(() => useOcrLogic())

    await act(async () => {
      await result.current.handleUpload(file)
    })

    expect(ApiClient.uploadFile).toHaveBeenCalledWith(file)
    expect(ApiClient.getOcrResult).toHaveBeenCalledWith('doc-123')
    expect(result.current.uploadedImage?.documentId).toBe('doc-123')
    expect(result.current.ocrResult?.fullText).toBe('Recognized text')
  })

  it('falls back to upload id when documentId is not provided', async () => {
    uploadFileMock.mockResolvedValue({
      id: 'upload-only',
      filename: 'fallback.pdf',
      url: 'http://localhost/fallback.pdf',
      size: 2048,
      mimetype: 'application/pdf',
    })

    getOcrResultMock
      .mockResolvedValueOnce({
        fullText: 'Initial text',
        confidence: 0.9,
        language: 'en',
        pageCount: 1,
      })
      .mockResolvedValueOnce({
        fullText: 'Updated text',
        confidence: 0.92,
        language: 'en',
        pageCount: 1,
      })

    const file = new File(['another fake content'], 'fallback.pdf', { type: 'application/pdf' })
    const { result } = renderHook(() => useOcrLogic())

    await act(async () => {
      await result.current.handleUpload(file)
    })

    await act(async () => {
      await result.current.handleRetryOcr()
    })

    expect(ApiClient.getOcrResult).toHaveBeenNthCalledWith(1, 'upload-only')
    expect(ApiClient.getOcrResult).toHaveBeenNthCalledWith(2, 'upload-only')
    expect(result.current.uploadedImage?.documentId).toBe('upload-only')
    expect(result.current.ocrResult?.fullText).toBe('Updated text')
  })
})
