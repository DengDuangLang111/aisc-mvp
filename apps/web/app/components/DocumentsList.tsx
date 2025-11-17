"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type Doc = { id: string; name: string; size: number; uploadedAt: string; type?: string; content?: string; folderId?: string };

export default function DocumentsList() {
  const [docs, setDocs] = useState<Doc[] | null>(null);

  function load() {
    try {
      const raw = localStorage.getItem("oasis:documents");
      const parsed: Doc[] = raw ? JSON.parse(raw) : [];
      // Ensure every doc has a stable id; migrate older items
      let changed = false;
      const migrated = parsed.map((d: any) => {
        if (!d.id) {
          d.id = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
          changed = true;
        }
        if (!d.folderId) d.folderId = 'general';
        return d;
      });
      if (changed) {
        try { localStorage.setItem('oasis:documents', JSON.stringify(migrated)); } catch (err) {}
      }
      setDocs(migrated);
    } catch (err) {
      console.error("failed to load documents", err);
      setDocs([]);
    }
  }

  useEffect(() => {
    load();
    const handler = () => load();
    window.addEventListener("oasis:documentsChanged", handler as EventListener);
    return () => window.removeEventListener("oasis:documentsChanged", handler as EventListener);
  }, []);

  if (docs === null) return null; // still loading

  // read selected folder
  let selectedFolder = 'general';
  try { const sf = localStorage.getItem('oasis:selectedFolder'); if (sf) selectedFolder = sf; } catch (err) {}

  const filtered = docs.filter(d => (d.folderId || 'general') === selectedFolder);

  return (
    <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Your Documents</h2>
        <span className="text-sm text-gray-500">{filtered.length} items</span>
      </div>

      {docs.length === 0 ? (
        <div className="py-10 text-center text-sm text-gray-500">No documents uploaded</div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((d, i) => (
            <li
              key={d.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer?.setData('text/plain', d.id);
              }}
              className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:shadow"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center text-xl">📄</div>
                <div>
                  <div className="font-medium text-gray-900">{d.name}</div>
                  <div className="text-sm text-gray-500">{new Date(d.uploadedAt).toLocaleString()} • {(d.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
              <div>
                <Link href={`/document/${docs.findIndex(x => x.id === d.id)}`} className="text-sm text-blue-600 hover:underline">
                  Open
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
