/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useRef, useState } from "react";

export default function UploadArea() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  function onSelectFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files ? Array.from(e.target.files) : [];
    if (selected.length === 0) return;
    // Append new files (avoid duplicates by name+size)
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of selected) {
        if (!merged.some((m) => m.name === f.name && m.size === f.size)) merged.push(f);
      }
      return merged;
    });
    // Reset the input so the same file can be re-selected if removed
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function mockUpload() {
    if (files.length === 0) return;
    setUploading(true);
    // Simulate upload latency and read files
    try {
      // helper to read file content (text or data URL for PDFs/images)
      const readFileContent = (file: File): Promise<{ content: string; type: string }> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          const type = file.type || 'application/octet-stream';
          if (type === 'application/pdf' || type.startsWith('image/')) {
            reader.onload = () => resolve({ content: String(reader.result), type });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          } else {
            reader.onload = () => resolve({ content: String(reader.result), type });
            reader.onerror = () => {
              const r2 = new FileReader();
              r2.onload = () => resolve({ content: String(r2.result), type });
              r2.onerror = reject;
              r2.readAsDataURL(file);
            };
            reader.readAsText(file);
          }
        });
      };

      const processed = await Promise.all(files.map(async (f) => {
        const { content, type } = await readFileContent(f);
        return {
          id: `${Date.now()}-${Math.floor(Math.random()*10000)}`,
          name: f.name,
          size: f.size,
          uploadedAt: new Date().toISOString(),
          type,
          content,
          folderId: 'general',
        };
      }));

      const key = "oasis:documents";
      const existingRaw = localStorage.getItem(key);
      const existing: Array<any> = existingRaw ? JSON.parse(existingRaw) : [];
      // ensure 'general' folder exists
      try {
        const foldersRaw = localStorage.getItem('oasis:folders');
        const folders = foldersRaw ? JSON.parse(foldersRaw) : [];
        if (!folders.some((f:any)=>f.id === 'general')) {
          folders.unshift({ id: 'general', name: 'General' });
          localStorage.setItem('oasis:folders', JSON.stringify(folders));
        }
      } catch (err) {}

      localStorage.setItem(key, JSON.stringify([...existing, ...processed]));
      // Notify other components
      window.dispatchEvent(new CustomEvent("oasis:documentsChanged"));
      setFiles([]);
      alert(`Uploaded ${processed.length} file(s)`);
    } catch (err) {
      console.error('failed to read or persist files', err);
      alert('Upload failed (mock)');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 bg-white hover:shadow transition-shadow">
        <div className="flex items-center gap-4">
          <div className="text-4xl">📂</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Upload study materials</h3>
            <p className="text-gray-500">Drag & drop files here or select multiple files to upload</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium cursor-pointer hover:bg-blue-700">
            Select files
            <input
              ref={inputRef}
              type="file"
              multiple
              onChange={onSelectFiles}
              className="sr-only"
            />
          </label>

          <button
            onClick={mockUpload}
            disabled={files.length === 0 || uploading}
            className="ml-2 inline-flex items-center bg-white border border-gray-200 rounded-md px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>

          <div className="ml-auto text-sm text-gray-500">Accepted: PDF, TXT, DOCX, PPTX</div>
        </div>

        {/* Selected files preview */}
        {files.length > 0 && (
          <div className="mt-6 bg-gray-50 rounded-lg p-3">
            <div className="text-sm text-gray-600 mb-2">Files to upload ({files.length})</div>
            <ul className="space-y-2">
              {files.map((f, i) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center justify-between p-2 rounded-md bg-white border">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-gray-100 flex items-center justify-center text-lg">📄</div>
                    <div>
                      <div className="font-medium text-gray-900">{f.name}</div>
                      <div className="text-xs text-gray-500">{(f.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => removeFile(i)}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Documents list is now managed by DocumentsList component in page.tsx */}
    </div>
  );
}
