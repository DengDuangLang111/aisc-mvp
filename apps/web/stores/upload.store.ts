'use client'

import { create } from 'zustand'
import { ApiClient, ApiError } from '@/lib/api-client'
import { UploadStorage, UploadRecord } from '@/lib/storage'
import { logger } from '@/lib/logger'

interface UploadedFileInfo {
  id: string
  filename: string
  url: string
  documentId?: string
}

interface UploadStoreState {
  status: string
  uploading: boolean
  uploadedFile: UploadedFileInfo | null
  uploadHistory: UploadRecord[]
  historyLoaded: boolean
}

interface UploadStoreActions {
  loadHistory: () => void
  uploadFile: (file: File) => Promise<void>
  deleteRecord: (id: string) => void
  clearHistory: () => void
  resetSelection: () => void
}

export type UploadStore = UploadStoreState & UploadStoreActions

export const useUploadStore = create<UploadStore>((set, get) => ({
  status: '',
  uploading: false,
  uploadedFile: null,
  uploadHistory: [],
  historyLoaded: false,

  loadHistory: () => {
    if (get().historyLoaded) return
    set({
      uploadHistory: UploadStorage.getUploadHistory(),
      historyLoaded: true,
    })
  },

  uploadFile: async (file: File) => {
    logger.debug('选中文件', { name: file.name, type: file.type, size: file.size })
    set({ status: `正在上传：${file.name}...`, uploading: true })

    try {
      const result = await ApiClient.uploadFile(file)
      logger.info('上传成功', { result })

      const uploadRecord: UploadRecord = {
        id: result.id,
        documentId: (result as any).documentId || result.id,
        filename: result.filename,
        url: result.url,
        uploadedAt: Date.now(),
        fileSize: file.size,
        fileType: file.type,
      }
      UploadStorage.saveUpload(uploadRecord)

      set({
        uploadedFile: {
          id: result.id,
          filename: result.filename,
          url: result.url,
          documentId: (result as any).documentId,
        },
        uploadHistory: UploadStorage.getUploadHistory(),
        status: `✅ 上传成功！文件：${result.filename}`,
      })
    } catch (err) {
      logger.error('上传错误', err, {})
      if (err instanceof ApiError) {
        set({ status: `❌ 上传失败 (${err.statusCode}): ${err.message}` })
      } else {
        const message = err instanceof Error ? err.message : '未知错误'
        set({ status: `❌ 上传失败：${message}` })
      }
    } finally {
      set({ uploading: false })
    }
  },

  deleteRecord: (id: string) => {
    UploadStorage.deleteUpload(id)
    set({ uploadHistory: UploadStorage.getUploadHistory() })
  },

  clearHistory: () => {
    UploadStorage.clearUploadHistory()
    set({ uploadHistory: [] })
  },

  resetSelection: () => set({ status: '', uploadedFile: null }),
}))
