"use client"

import React, { useEffect, useState } from "react";
import Link from 'next/link';
import { useRouter } from 'next/navigation'
import UploadArea from "./UploadArea";
import DocumentsList from "./DocumentsList";
import StatsWidget from "./StatsWidget";
import { useAuth } from '@/lib/auth/AuthProvider'

export default function SidebarDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [folders, setFolders] = useState<Array<{id:string,name:string}>>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<string>('general');
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oasis:sidebarCollapsed');
      setCollapsed(raw === '1');
    } catch (err) {
      setCollapsed(false);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oasis:folders');
      let f = raw ? JSON.parse(raw) : [];
      if (!f.some((x:any)=>x.id === 'general')) {
        f = [{ id: 'general', name: 'General' }, ...f];
        localStorage.setItem('oasis:folders', JSON.stringify(f));
      }
      setFolders(f);
    } catch (err) { setFolders([{ id: 'general', name: 'General' }]); }
    try { const sf = localStorage.getItem('oasis:selectedFolder'); if (sf) setSelectedFolder(sf); } catch(err){}
    // compute counts initially
    updateFolderCounts();
    // listen for changes to documents
    const handler = () => updateFolderCounts();
    window.addEventListener('oasis:documentsChanged', handler as EventListener);
    return () => window.removeEventListener('oasis:documentsChanged', handler as EventListener);
  }, []);

  function updateFolderCounts() {
    try {
      const rawDocs = localStorage.getItem('oasis:documents');
      const docs = rawDocs ? JSON.parse(rawDocs) : [];
      const counts: Record<string, number> = {};
      for (const d of docs) {
        const fid = d.folderId || 'general';
        counts[fid] = (counts[fid] || 0) + 1;
      }
      setFolderCounts(counts);
    } catch (err) { setFolderCounts({}); }
  }

  useEffect(() => {
    try { localStorage.setItem('oasis:sidebarCollapsed', collapsed ? '1' : '0'); } catch (err) {}
  }, [collapsed]);

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const id = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
    const next = [{ id, name }, ...folders];
    setFolders(next);
    try { localStorage.setItem('oasis:folders', JSON.stringify(next)); } catch (err) {}
    setNewFolderName('');
    updateFolderCounts();
  }

  function selectFolder(id:string) {
    setSelectedFolder(id);
    try { localStorage.setItem('oasis:selectedFolder', id); } catch (err) {}
    // notify documents list to refresh
    window.dispatchEvent(new CustomEvent('oasis:documentsChanged'));
  }

  function onDropToFolder(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    const docId = e.dataTransfer.getData('text/plain');
    if (!docId) return;
    try {
      const raw = localStorage.getItem('oasis:documents');
      const docs = raw ? JSON.parse(raw) : [];
      // find by id first, fallback to name/uploadedAt
      let found = false;
      const changed = docs.map((d:any) => {
        if (d.id === docId) { found = true; return { ...d, folderId }; }
        return d;
      });
      if (!found) {
        for (let i = 0; i < docs.length; i++) {
          const d = docs[i];
          if (`${d.name}-${d.uploadedAt}` === docId) { docs[i].folderId = folderId; found = true; break; }
        }
      }
      if (found) {
        localStorage.setItem('oasis:documents', JSON.stringify(found ? changed : docs));
        window.dispatchEvent(new CustomEvent('oasis:documentsChanged'));
        updateFolderCounts();
      }
    } catch (err) { console.error(err); }
  }

  if (collapsed) {
    return (
      <aside className="w-16 h-screen sticky top-0 p-2 bg-white border-r flex flex-col items-center overflow-y-auto">
        <button
          aria-label="Expand sidebar"
          className="mb-4 p-2 rounded hover:bg-gray-100"
          onClick={() => setCollapsed(false)}
        >
          ▶
        </button>
        <div className="flex-1 flex flex-col items-center gap-4 mt-6 text-xs text-gray-600">
          <div title="Uploads">⬆️</div>
          <div title="Documents">📄</div>
          <div title="Stats">📊</div>
        </div>
        {/* collapsed: keep minimal icons only */}
      </aside>
    );
  }

  return (
    <aside className="w-72 h-screen sticky top-0 p-3 bg-white border-r flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          {/* show signed-in user name / email to match login */}
          <UserBadge />
          <div className="text-xs text-gray-500">Folders & Files</div>
        </div>
        <button
          aria-label="Collapse sidebar"
          onClick={() => setCollapsed(true)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Hide
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {/* 1) Stats (sessions, docs, streak + This week) */}
        <div>
          <StatsWidget />
        </div>

        {/* 2) Documents and folders */}
        <div>
          <div className="mb-2 text-xs text-gray-500">Folders</div>
          <div className="space-y-2 mb-3">
            {folders.map((f) => (
              <div
                key={f.id}
                onClick={() => selectFolder(f.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => onDropToFolder(e, f.id)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer ${selectedFolder===f.id ? 'bg-blue-50 ring-1 ring-blue-100' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded bg-blue-100 flex items-center justify-center text-blue-700 text-xs">📁</div>
                  <div className="text-sm font-medium text-gray-900">{f.name}</div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{folderCounts[f.id] || 0}</div>
              </div>
            ))}
          </div>

          <div className="mb-4">
            <DocumentsList />
          </div>
        </div>

        {/* 3) Upload area (placed last) */}
        <div>
          <UploadArea />
        </div>
      </div>

      {/* single View Sessions button kept inside the StatsWidget; no duplicate here */}
    </aside>
  );
}

function UserBadge() {
  try {
    const { user, signOut } = useAuth()
    const router = useRouter()
    const name = (user?.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user?.email || 'Guest'

    if (!user) {
      return (
        <div className="mb-1">
          <Link href="/auth/login" className="text-sm font-semibold text-blue-600">Sign in</Link>
        </div>
      )
    }

    return (
      <div className="mb-1 flex items-center justify-between">
        <div className="pr-2">
          <div className="text-sm font-semibold">{name}</div>
        </div>
        <div>
          <button
            onClick={async () => {
              try {
                await signOut()
              } catch (e) {}
              // redirect to login after sign-out
              router.push('/auth/login')
            }}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded border border-gray-100"
          >
            Sign out
          </button>
        </div>
      </div>
    )
  } catch (err) {
    return (
      <div className="mb-1">
        <div className="text-sm font-semibold">Guest</div>
      </div>
    )
  }
}
