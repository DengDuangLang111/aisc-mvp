"use client";

import React, { useEffect, useState, useRef } from "react";
import { useChatLogic } from '../../chat/hooks/useChatLogic'
import { ChatLayout } from '../../chat/components/ChatLayout'
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Doc = { name: string; size: number; uploadedAt: string; type?: string; content?: string };

export default function DocumentViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id ?? "0";
  const idx = parseInt(Array.isArray(id) ? id[0] : id, 10);

  const [doc, setDoc] = useState<Doc | null>(null);
  const [notes, setNotes] = useState("");
  const [showDoc, setShowDoc] = useState(true);
  const [showNotes, setShowNotes] = useState(true);
  const [showChat, setShowChat] = useState(true);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedMinutes, setSelectedMinutes] = useState<number | "custom" | null>(30);
  const [customMinutes, setCustomMinutes] = useState<string>("");
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("oasis:documents");
      const arr: Doc[] = raw ? JSON.parse(raw) : [];
      if (arr[idx]) setDoc(arr[idx]);
      else setDoc(null);

      const noteRaw = localStorage.getItem(`oasis:notes:${idx}`) || "";
      setNotes(noteRaw);
    } catch (err) {
      console.error(err);
      setDoc(null);
      setNotes("");
    }
  }, [idx]);

  function saveNotes(newNotes: string) {
    setNotes(newNotes);
    localStorage.setItem(`oasis:notes:${idx}`, newNotes);
  }

  function EmbeddedChat() {
    const {
      messages,
      isLoading,
      error,
      showDocument,
      fileUrl,
      filename,
      conversationId,
      streamingContent,
      isStreaming,
      isThinking,
      handleSend,
      handleFileSelect,
      handleClearChat,
      handleToggleDocument,
    } = useChatLogic();

    return (
      <div className="flex flex-col h-64">
        <div className="flex-1 overflow-hidden">
          <ChatLayout
            messages={messages}
            isLoading={isLoading}
            showDocument={showDocument}
            fileUrl={fileUrl}
            filename={filename}
            conversationId={conversationId ?? undefined}
            streamingContent={streamingContent}
            isStreaming={isStreaming}
            isThinking={isThinking}
            onSend={handleSend}
            onFileSelect={handleFileSelect}
            onToggleDocument={handleToggleDocument}
          />
        </div>
      </div>
    )
  }

  function exportNotesAsTxt() {
    const blob = new Blob([notes || ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = (doc?.name ?? "notes").replace(/[^a-z0-9_.-]/gi, "_");
    a.download = `${safeName}-notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (doc === null) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto">
          <div className="mb-4">
            <Link href="/">← Back</Link>
          </div>
          <div className="text-center text-gray-500">Document not found</div>
        </div>
      </div>
    );
  }

  // Render the uploaded document if available, otherwise fall back to placeholder
  const documentHtml = doc.content ? (
    doc.type && (doc.type === 'application/pdf' || doc.type.startsWith('image/')) ? (
      <div className="w-full h-[60vh]">
        <iframe src={doc.content} className="w-full h-full border rounded" />
      </div>
    ) : (
      // treat as text
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-sm">{doc.content}</pre>
      </div>
    )
  ) : (
    <div className="prose max-w-none">
      <h2>Chapter 3: Quantum Mechanics Fundamentals</h2>
      <h3>3.1 Wave-Particle Duality</h3>
      <p>
        One of the most fundamental concepts in quantum mechanics is wave-particle duality, which states that all particles exhibit both wave and particle properties. This concept was first proposed by Louis de Broglie in 1924.
      </p>
      <div className="my-6 p-6 rounded-lg bg-gray-50 text-center">λ = h / p<br/><small>where h is Planck's constant and p is the momentum</small></div>
      <h3>3.2 The Heisenberg Uncertainty Principle</h3>
      <p>
        The Heisenberg Uncertainty Principle is a fundamental limit to the precision with which certain pairs of physical properties can be known simultaneously.
      </p>
      <div className="my-6 p-6 rounded-lg bg-gray-50 text-center">Δx · Δp ≥ ħ/2</div>
    </div>
  );

  return (
    <div className="h-full p-6 bg-[#445e72]">
      <div className="max-w-7xl mx-auto h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4 text-[#e6eef2]">
            <Link href="/">←</Link>
            <h1 className="text-xl font-semibold">{doc.name}</h1>
            <div className="text-sm text-[#cfe1ea]">{new Date(doc.uploadedAt).toLocaleString()}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full bg-white/90 p-1 border">
              <button onClick={() => setShowDoc(!showDoc)} className={`px-3 py-1 text-sm ${showDoc ? "bg-black text-white rounded" : "text-gray-700"}`}>Document</button>
              <button onClick={() => setShowNotes(!showNotes)} className={`px-3 py-1 text-sm ${showNotes ? "bg-black text-white rounded" : "text-gray-700"}`}>Notes</button>
              <button onClick={() => setShowChat(!showChat)} className={`px-3 py-1 text-sm ${showChat ? "bg-black text-white rounded" : "text-gray-700"}`}>Chat</button>
            </div>
            <button onClick={exportNotesAsTxt} className="px-3 py-2 bg-white rounded border text-sm">Export Notes</button>
            <div className="text-xs text-[#cfe1ea]">(PDF/DOCX export not implemented)</div>

            {!sessionStarted ? (
              <>
                <button
                  onClick={() => setShowModal(true)}
                  className="ml-4 inline-flex items-center gap-2 bg-gradient-to-br from-green-700 to-green-600 text-white px-4 py-2 rounded-md shadow"
                >
                  ▶ Start Study Session
                </button>
              </>
            ) : (
              <div className="ml-4 flex items-center gap-3">
                <div className="text-sm font-medium text-[#e6eef2]">Session: {Math.floor((sessionTargetSeconds ?? 0 - sessionSeconds)/60)}:{String((sessionTargetSeconds ?? 0 - sessionSeconds)%60).padStart(2,'0')}</div>
                <button
                  onClick={() => {
                    setSessionStarted(false);
                    setSessionTargetSeconds(null);
                    if (timerRef.current) {
                      window.clearInterval(timerRef.current);
                      timerRef.current = null;
                    }
                  }}
                  className="px-3 py-1 bg-white rounded border text-sm"
                >
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 items-start min-h-0 overflow-auto">
          {showDoc && (
            <div className="bg-white rounded-lg p-6 shadow-sm flex flex-col min-h-0">
              <div className="flex-1 overflow-auto">
                {documentHtml}
              </div>
            </div>
          )}

          <div className={`space-y-6 ${!showDoc ? 'md:col-span-2' : ''} flex flex-col min-h-0`}> 
            {showNotes && (
              <div className="bg-white rounded-lg p-4 shadow-sm flex flex-col min-h-0">
                <h3 className="font-medium text-gray-600 mb-2">Type Your Notes ....</h3>
                <textarea
                  value={notes}
                  onChange={(e) => saveNotes(e.target.value)}
                  placeholder="Type your notes here..."
                  className="flex-1 w-full border-b pb-2 text-sm resize-none min-h-0 p-2 overflow-auto"
                />
              </div>
            )}

            {showChat && (
              <div className="bg-white rounded-lg p-4 shadow-sm flex flex-col min-h-0">
                <h3 className="font-medium text-gray-600 mb-2">Chat with AI</h3>
                <div className="mt-4 bg-gray-50 rounded p-3 flex-1 overflow-auto">
                  <EmbeddedChat />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Modal for selecting focus time */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
            <div className="relative bg-white rounded-xl p-8 w-full max-w-2xl mx-4">
              <button
                aria-label="Close"
                className="absolute right-4 top-4 text-gray-600 hover:text-gray-800"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>

              <h2 className="text-2xl font-semibold text-center mb-6">Set Focus Time</h2>

              <div className="flex gap-4 justify-center mb-6">
                <button
                  onClick={() => setSelectedMinutes(30)}
                  className={`px-8 py-4 rounded-lg border ${selectedMinutes === 30 ? "bg-green-100 border-green-600 text-green-800 text-2xl font-bold" : "bg-white border-gray-300 text-lg"}`}
                >
                  30 min
                </button>

                <button
                  onClick={() => setSelectedMinutes(60)}
                  className={`px-8 py-4 rounded-lg border ${selectedMinutes === 60 ? "bg-green-100 border-green-600 text-green-800 text-2xl font-bold" : "bg-white border-gray-300 text-lg"}`}
                >
                  60 min
                </button>

                <div className={`px-6 py-4 rounded-lg border ${selectedMinutes === "custom" ? "bg-green-50 border-green-500" : "bg-white border-gray-300"}`}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={customMinutes}
                    onChange={(e) => { setCustomMinutes(e.target.value); setSelectedMinutes("custom"); }}
                    placeholder="type..."
                    className="w-24 text-center text-lg outline-none"
                  />
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => {
                    let minutes = 30;
                    if (selectedMinutes === "custom") {
                      const parsed = parseInt(customMinutes || "0", 10);
                      if (!isNaN(parsed) && parsed > 0) minutes = parsed;
                    } else if (typeof selectedMinutes === "number") minutes = selectedMinutes;

                      setShowModal(false);
                      // Navigate to a dedicated session page which will handle the timer and UI
                      const minutesParam = minutes;
                      router.push(`/session/${idx}?minutes=${minutesParam}`);
                  }}
                  className="mt-6 w-full bg-green-700 text-white font-bold text-xl py-4 rounded-lg"
                >
                  Start NOW
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
