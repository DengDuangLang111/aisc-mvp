'use client'

import { useState, useRef } from 'react'
import { apiFetch } from '@/lib/api/auth-client'
import { useAuth } from '@/lib/auth/AuthProvider'

interface CompleteWorkModalProps {
  isOpen: boolean
  sessionId: string
  onClose: () => void
  onSubmit: (payload: {
    completionProofId: string
    mood?: string | null
    notes?: string
    fileUrl?: string
    originalFilename: string
  }) => Promise<void>
}

export function CompleteWorkModal({
  isOpen,
  sessionId,
  onClose,
  onSubmit,
}: CompleteWorkModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuth()

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [mood, setMood] = useState<'excellent' | 'good' | 'okay' | 'difficult' | null>(null)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [error, setError] = useState<string | null>(null)

  const moodOptions = [
    { value: 'excellent', emoji: '😄', label: 'Excellent' },
    { value: 'good', emoji: '😊', label: 'Good' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'difficult', emoji: '😤', label: 'Difficult' }
  ] as const

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf']
      if (!validTypes.includes(file.type)) {
        alert('Please select a JPEG, PNG, or PDF file')
        return
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB')
        return
      }
      
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedFile) {
      alert('Please select a file')
      return
    }

    try {
      setSubmitting(true)

      const formData = new FormData()
      formData.append('file', selectedFile)
      if (mood) formData.append('mood', mood)
      if (notes) formData.append('notes', notes)

      const query = user?.id ? `?userId=${encodeURIComponent(user.id)}` : ''
      const uploadResponse = await apiFetch<{
        documentId?: string
        id?: string
        filename: string
        url?: string
      }>(`/upload${query}`, {
        method: 'POST',
        body: formData,
      })

      const completionProofId =
        uploadResponse.documentId || uploadResponse.id

      if (!completionProofId) {
        throw new Error('Upload response missing documentId')
      }

      await onSubmit({
        completionProofId,
        mood,
        notes,
        fileUrl: uploadResponse.url,
        originalFilename: uploadResponse.filename,
      })

      setSuccessMessage('✅ Session completed successfully!')
      setTimeout(() => {
        handleClose()
      }, 1500)
    } catch (err) {
      console.error('Error completing session:', err)
      setError(
        err instanceof Error ? err.message : 'Failed to submit completion proof'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setMood(null)
    setNotes('')
    setSuccessMessage('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Complete Your Work</h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm font-medium">Error: {error}</p>
            </div>
          )}

          {/* File Upload */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Upload Your Work *
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
                disabled={submitting}
              />
              
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="text-3xl">
                    {selectedFile.type === 'application/pdf' ? '📄' : '🖼️'}
                  </div>
                  <p className="font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setSelectedFile(null)
                    }}
                    className="mt-2 text-xs text-indigo-600 hover:underline"
                  >
                    Change file
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="text-3xl">📎</div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    JPEG, PNG, or PDF (max 10MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Mood Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              How did the session go?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {moodOptions.map(({ value, emoji, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMood(value)}
                  disabled={submitting}
                  className={`p-3 rounded-lg border-2 transition-colors disabled:opacity-50 ${
                    mood === value
                      ? 'border-indigo-600 bg-indigo-50'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                  title={label}
                >
                  <div className="text-2xl mb-1">{emoji}</div>
                  <p className="text-xs text-gray-600">{label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={submitting}
              placeholder="Any challenges faced, areas to improve, or questions asked..."
              rows={4}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/500 characters
            </p>
          </div>

          {/* Session Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-gray-700">Session Summary</p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Session ID: <code className="bg-gray-200 px-1 rounded">{sessionId.slice(0, 8)}</code></p>
              <p>Mood: <span className="font-medium">{mood ? moodOptions.find(m => m.value === mood)?.label : 'Not selected'}</span></p>
              <p>File: <span className="font-medium">{selectedFile?.name || 'Not selected'}</span></p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedFile}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Submitting...
                </>
              ) : (
                <>
                  ✓ Complete Session
                </>
              )}
            </button>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500 text-center">
            Your work file will be uploaded and associated with this focus session.
          </p>
        </form>
      </div>
    </div>
  )
}
