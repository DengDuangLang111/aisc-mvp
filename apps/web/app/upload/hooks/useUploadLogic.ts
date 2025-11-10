'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UploadRecord } from '@/lib/storage'
import { useUploadStore } from '@/stores/upload.store'

export function useUploadLogic() {
  const router = useRouter()
  const { status, uploading, uploadedFile, uploadHistory, loadHistory, uploadFile, deleteRecord, clearHistory, resetSelection } =
    useUploadStore()

  useEffect(() => {
    loadHistory()
  }, [loadHistory])

  function handleUpload(file: File) {
    uploadFile(file)
  }

  function handleStartChat() {
    if (uploadedFile) {
      const docId = uploadedFile.documentId || uploadedFile.id
      const params = new URLSearchParams()
      params.set('documentId', docId)
      params.set('filename', uploadedFile.filename)
      if (uploadedFile.url) {
        params.set('fileUrl', uploadedFile.url)
      }
      router.push(`/chat?${params.toString()}`)
    } else {
      router.push('/chat')
    }
  }

  function handleContinueWithFile(record: UploadRecord) {
    const docId = record.documentId || record.id
    const params = new URLSearchParams()
    params.set('documentId', docId)
    params.set('filename', record.filename)
    if (record.url) {
      params.set('fileUrl', record.url)
    }
    router.push(`/chat?${params.toString()}`)
  }

  function handleDeleteRecord(id: string) {
    if (confirm('确定要删除这条上传记录吗？')) {
      deleteRecord(id)
    }
  }

  function handleClearHistory() {
    if (confirm('确定要清空所有上传历史吗？')) {
      clearHistory()
    }
  }

  function handleFileChange() {
    resetSelection()
  }

  return {
    status,
    uploading,
    uploadedFile,
    uploadHistory,
    handleUpload,
    handleStartChat,
    handleContinueWithFile,
    handleDeleteRecord,
    handleClearHistory,
    handleFileChange,
  }
}
