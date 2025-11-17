"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { useChatLogic } from '../../chat/hooks/useChatLogic'
import { ChatLayout } from '../../chat/components/ChatLayout'
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

type Doc = { name: string; size: number; uploadedAt: string; type?: string; content?: string };

export default function SessionPage() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = params?.id ?? "0";
  const idx = parseInt(Array.isArray(id) ? id[0] : id, 10);

  const minutesParam = parseInt(search?.get("minutes") || "30", 10) || 30;
  const targetSeconds = useMemo(() => minutesParam * 60, [minutesParam]);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeIdx, setActiveIdx] = useState(idx);
  const [notes, setNotes] = useState("");
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitReason, setExitReason] = useState("");
  const [allowExit, setAllowExit] = useState(false);
  const [showFullscreenExitModal, setShowFullscreenExitModal] = useState(false);
  const [pausedByFullscreen, setPausedByFullscreen] = useState(false);
  const [paused, setPaused] = useState(false);
  const [pauseStart, setPauseStart] = useState<number | null>(null);
  const pauseTimerRef = useRef<number | null>(null);
  const [pauseElapsed, setPauseElapsed] = useState(0);
  const [pauseEvents, setPauseEvents] = useState<Array<{start:number,end:number,duration:number}>>([]);
  const [totalPausedSeconds, setTotalPausedSeconds] = useState(0);
  const [leftFocus, setLeftFocus] = useState(false);
  const [showInterruptionModal, setShowInterruptionModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [finalSummary, setFinalSummary] = useState<any | null>(null);
  const [summaryExitReason, setSummaryExitReason] = useState<string>("");
  // splitter state (notes vs assistant)
  const rightColRef = useRef<HTMLDivElement | null>(null);
  const [notesHeight, setNotesHeight] = useState<number>(240);
  const draggingRef = useRef(false);

  // Embedded chat component placed inside the Assistant area
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
      <div className="flex flex-col h-full">
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

  useEffect(() => {
    try {
      const raw = localStorage.getItem("oasis:documents");
      const arr: Doc[] = raw ? JSON.parse(raw) : [];
      setDocs(arr);
      if (arr.length === 0) {
        // if no docs, redirect back to home
        router.push("/");
        return;
      }
      if (arr[activeIdx]) {
        setNotes(localStorage.getItem(`oasis:notes:${activeIdx}`) || "");
      } else {
        setActiveIdx(0);
        setNotes(localStorage.getItem(`oasis:notes:0`) || "");
      }
    } catch (err) {
      console.error(err);
    }
  }, [activeIdx, router]);

  useEffect(() => {
  // start timer
  if (!paused) timerRef.current = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);

    // try to enter fullscreen on start (best-effort)
    const enter = async () => {
      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn('fullscreen request failed', err);
      }
    };
    enter();

    // warn on reload/close while session active
    const beforeunload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener('beforeunload', beforeunload);

    // warn if user leaves the page/tab — track when document becomes hidden/blurred
    const onVisibilityChange = () => {
      if (document.hidden) {
        setLeftFocus(true);
      } else {
        if (leftFocus && !allowExit) {
          // user returned after leaving the tab; show interruption warning
          setShowInterruptionModal(true);
        }
      }
    };
    const onBlur = () => setLeftFocus(true);
    const onFocus = () => {
      if (leftFocus && !allowExit) setShowInterruptionModal(true);
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    // handle fullscreen change (Escape or other causes)
    const onFullScreenChange = () => {
      // if fullscreen was exited while session active and exit not allowed, pause and show modal
      if (!document.fullscreenElement && !allowExit) {
        // pause timer
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setPausedByFullscreen(true);
        setShowFullscreenExitModal(true);
      }
    };
    document.addEventListener('fullscreenchange', onFullScreenChange);

    // mouse move/up handlers for dragging the notes/chat divider
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current || !rightColRef.current) return;
      const rect = rightColRef.current.getBoundingClientRect();
      // compute new height relative to top of the right column
      let newH = e.clientY - rect.top - 12; // adjust for header spacing
      const minH = 80;
      const maxH = rect.height - 80;
      if (newH < minH) newH = minH;
      if (newH > maxH) newH = maxH;
      setNotesHeight(newH);
    };
    const onMouseUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        document.body.style.userSelect = '';
      }
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (pauseTimerRef.current) window.clearInterval(pauseTimerRef.current);
      window.removeEventListener('beforeunload', beforeunload as EventListener);
      document.removeEventListener('visibilitychange', onVisibilityChange as EventListener);
      window.removeEventListener('blur', onBlur as EventListener);
      window.removeEventListener('focus', onFocus as EventListener);
      document.removeEventListener('fullscreenchange', onFullScreenChange as EventListener);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (secondsElapsed >= targetSeconds) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      // session complete: exit fullscreen, save summary and navigate to summary page
      (async () => {
        try {
          // allow exit behavior so fullscreen can be left
          setAllowExit(true);
          if (document.fullscreenElement) await document.exitFullscreen();
        } catch (err) {
          console.warn('exit fullscreen failed', err);
        }
        const sid = String(Date.now());
        const summary = {
          id: sid,
          docIndex: activeIdx,
          minutesSet: minutesParam,
          secondsStudied: secondsElapsed,
          exitReason: 'Completed',
          endedAt: new Date().toISOString(),
        };
        try {
          // finalize any active pause before saving
          let finalPauseEvents = [...pauseEvents];
          let finalTotalPaused = totalPausedSeconds;
          if (pauseStart) {
            const now = Date.now();
            const dur = Math.round((now - pauseStart) / 1000);
            finalPauseEvents = [...finalPauseEvents, { start: pauseStart, end: now, duration: dur }];
            finalTotalPaused = finalTotalPaused + dur;
            setPauseEvents(finalPauseEvents);
            setTotalPausedSeconds(finalTotalPaused);
            setPauseStart(null);
            if (pauseTimerRef.current) { window.clearInterval(pauseTimerRef.current); pauseTimerRef.current = null; }
          }
          const finalSummary = { ...summary, pauseEvents: finalPauseEvents, totalPausedSeconds: finalTotalPaused };
          saveSessionSummary(finalSummary);
          // show summary modal instead of navigating away
          setFinalSummary(finalSummary);
          setShowSummaryModal(true);
        } catch (err) { console.error('save session summary failed', err); }
      })();
    }
  }, [secondsElapsed, targetSeconds]);

  // helper to save session summary and update stats (streak, daily totals)
  function saveSessionSummary(summary: any) {
    try {
      const key = 'oasis:sessions';
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      // enrich summary
      summary.documentsUsed = docs.map((d) => d.name);
      summary.pauseEvents = pauseEvents;
      summary.totalPausedSeconds = totalPausedSeconds;
      summary.completed = summary.exitReason === 'Completed' || (summary.secondsStudied >= (summary.minutesSet || minutesParam) * 60);
      arr.push(summary);
      localStorage.setItem(key, JSON.stringify(arr));

      // compute current streak (consecutive completed sessions from most recent backwards)
      let streak = 0;
      for (let i = arr.length - 1; i >= 0; i--) {
        const s = arr[i];
        if (s.completed) streak++; else break;
      }
      const stats = { currentStreak: streak, lastUpdated: new Date().toISOString() };
      localStorage.setItem('oasis:stats', JSON.stringify(stats));
    } catch (err) {
      console.error('saving session + stats failed', err);
    }
  }

  useEffect(() => {
    if (finalSummary) setSummaryExitReason(finalSummary.exitReason || '');
  }, [finalSummary]);

  function computeTotals() {
    try {
      const raw = localStorage.getItem('oasis:sessions');
      const arr = raw ? JSON.parse(raw) : [];
      let totalSecs = 0;
      let totalQuits = 0;
      for (const s of arr) {
        totalSecs += (s.secondsStudied || 0);
        if (!s.completed) totalQuits++;
        else if (s.exitReason && s.exitReason !== 'Completed') totalQuits++;
      }
      return { totalMinutes: Math.round(totalSecs / 60), totalQuits };
    } catch (err) {
      return { totalMinutes: 0, totalQuits: 0 };
    }
  }

  function saveNotes(newNotes: string) {
    setNotes(newNotes);
    localStorage.setItem(`oasis:notes:${activeIdx}`, newNotes);
  }

  function switchToDoc(i: number) {
    setActiveIdx(i);
    setNotes(localStorage.getItem(`oasis:notes:${i}`) || "");
  }

  const remaining = Math.max(0, targetSeconds - secondsElapsed);
  const pct = Math.max(0, Math.min(100, Math.round((remaining / targetSeconds) * 100)));

  return (
    <div className="fixed inset-0 bg-[#445e72]">
      <div className="bg-[#355563] border-b border-[#2b4752]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center">
          <div className="flex items-center gap-3 mr-6">
            <div className="text-2xl font-semibold text-teal-200">Study<span className="text-yellow-300">Oasis</span></div>
          </div>

          <div className="flex-1 flex flex-col items-center">
            <div className="text-xs text-[#e6eef2] mb-1">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2,'0')}</div>
            <div className="w-1/2 h-3 bg-[#cbd6db] rounded overflow-hidden">
              <div className="h-3 bg-gradient-to-r from-yellow-300 via-orange-300 to-teal-300" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (paused) {
                  const now = Date.now();
                  if (pauseStart) {
                    const dur = Math.round((now - pauseStart) / 1000);
                    setPauseEvents((p) => [...p, { start: pauseStart, end: now, duration: dur }]);
                    setTotalPausedSeconds((t) => t + dur);
                  }
                  setPauseStart(null);
                  if (pauseTimerRef.current) { window.clearInterval(pauseTimerRef.current); pauseTimerRef.current = null; }
                  setPauseElapsed(0);
                  setPaused(false);
                  if (!timerRef.current) timerRef.current = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
                } else {
                  setPaused(true);
                  if (timerRef.current) {
                    window.clearInterval(timerRef.current);
                    timerRef.current = null;
                  }
                  const start = Date.now();
                  setPauseStart(start);
                  setPauseElapsed(0);
                  pauseTimerRef.current = window.setInterval(() => {
                    setPauseElapsed(Math.round((Date.now() - start) / 1000));
                  }, 1000);
                }
              }}
              className={`px-4 py-2 rounded text-white font-semibold ${paused ? 'bg-gray-500' : 'bg-green-600'}`}
            >
              {paused ? 'Resume' : 'Focus Mode'}
            </button>
            <button onClick={() => setShowExitModal(true)} className="px-3 py-2 rounded bg-gray-300 text-gray-800 font-medium">Exit</button>
          </div>
        </div>
      </div>
        {/* Exit confirmation modal triggered by Exit button */}
        {showExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-xl p-8 w-full max-w-2xl mx-4">
              <h2 className="text-2xl font-semibold text-center mb-4">Are You Sure You Want Exit?</h2>
              <textarea
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                placeholder="Indicate Your Reason..."
                className="w-full h-40 border rounded p-4 mb-6"
              />
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={async () => {
                    // Attempt to re-enter fullscreen and resume timer (best-effort)
                    try {
                      if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                      }
                    } catch (err) {
                      console.warn('request fullscreen failed', err);
                      alert('Unable to re-enter fullscreen. Resuming the session without fullscreen.');
                    }
                    // resume timer if paused
                    if (!timerRef.current) {
                      timerRef.current = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
                    }
                    setShowExitModal(false);
                    setPausedByFullscreen(false);
                    setLeftFocus(false);
                    setShowFullscreenExitModal(false);
                  }}
                  className="px-8 py-4 bg-green-700 text-white rounded-lg text-lg font-bold"
                >
                  Back to Focus
                </button>
                <button
                  onClick={() => {
                    // confirm exit: require a non-empty reason; this button will be disabled in UI until a reason is provided
                    if (!exitReason || exitReason.trim().length === 0) return;
                    if (timerRef.current) {
                      window.clearInterval(timerRef.current);
                      timerRef.current = null;
                    }
                    (async () => {
                      try { setAllowExit(true); if (document.fullscreenElement) await document.exitFullscreen(); } catch (err) { console.warn(err); }
                      const sid = String(Date.now());
                      const summary = {
                        id: sid,
                        docIndex: activeIdx,
                        minutesSet: minutesParam,
                        secondsStudied: secondsElapsed,
                        exitReason: exitReason || 'User exited',
                        endedAt: new Date().toISOString(),
                      };
                      try {
                        // finalize any active pause and compute final pause arrays synchronously
                        let finalPauseEvents = [...pauseEvents];
                        let finalTotalPaused = totalPausedSeconds;
                        if (pauseStart) {
                          const now = Date.now();
                          const dur = Math.round((now - pauseStart) / 1000);
                          finalPauseEvents = [...finalPauseEvents, { start: pauseStart, end: now, duration: dur }];
                          finalTotalPaused = finalTotalPaused + dur;
                          // also update UI state
                          setPauseEvents(finalPauseEvents);
                          setTotalPausedSeconds(finalTotalPaused);
                          setPauseStart(null);
                          if (pauseTimerRef.current) { window.clearInterval(pauseTimerRef.current); pauseTimerRef.current = null; }
                        }
                        const finalSummary = { ...summary, pauseEvents: finalPauseEvents, totalPausedSeconds: finalTotalPaused };
                        saveSessionSummary(finalSummary);
                        // show modal instead of navigating
                        setFinalSummary(finalSummary);
                        setShowSummaryModal(true);
                      } catch (err) { console.error('save session summary failed', err); }
                    })();
                  }}
                  disabled={!exitReason || exitReason.trim().length === 0}
                  className={`px-6 py-3 rounded-lg text-lg font-semibold ${exitReason && exitReason.trim().length > 0 ? 'bg-red-400 text-white' : 'bg-red-200 text-white/60 cursor-not-allowed'}`}
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Session final summary modal (popup) */}
        {showSummaryModal && finalSummary && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" />
            <div className="relative bg-white rounded-xl p-8 w-full max-w-4xl mx-4">
              <h2 className="text-center text-2xl font-medium mb-2">Study Session Summary</h2>
              <div className="text-center text-sm text-gray-500 mb-6">Your Focus Goal: {finalSummary.minutesSet} mins</div>

              <div className="mx-auto max-w-xl">
                <div className="border-2 border-red-300 rounded-lg p-6 mb-4">
                  <div className="text-red-600 text-sm text-center">You Focused:</div>
                  <div className="text-center text-red-600 font-bold" style={{fontSize: '48px'}}>
                    {Math.round((finalSummary.secondsStudied || 0) / 60)} mins
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-600">Total Focus Time</div>
                    <div className="text-lg font-medium">{computeTotals().totalMinutes} mins</div>
                  </div>
                  <div className="border rounded-lg p-4 text-center">
                    <div className="text-sm text-gray-600">Total Quitting Time</div>
                    <div className="text-lg font-medium">{computeTotals().totalQuits}</div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-gray-700 mb-1">Exit Reason:</label>
                  <div className="w-full border-b pb-2 text-sm text-gray-700">{finalSummary.exitReason}</div>
                </div>

                <div className="text-center text-sm text-gray-500 mt-6">Document: {docs[finalSummary.docIndex]?.name || 'Unknown'}</div>

                <div className="mt-6 flex items-center justify-center gap-4">
                  <button
                    onClick={async () => {
                      // persist any exit reason edits into stored sessions, then close and go home
                      try {
                        const key = 'oasis:sessions';
                        const raw = localStorage.getItem(key);
                        const arr = raw ? JSON.parse(raw) : [];
                        const idx = arr.findIndex((s:any) => s.id === finalSummary.id);
                        if (idx !== -1) {
                          arr[idx].exitReason = summaryExitReason || arr[idx].exitReason;
                          localStorage.setItem(key, JSON.stringify(arr));
                        }
                      } catch (err) { console.error('persisting summary edits failed', err); }
                      setShowSummaryModal(false);
                      router.push('/');
                    }}
                    className="px-6 py-3 bg-green-700 text-white rounded-md"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Pause popup/modal with counting timer */}
        {paused && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-xl p-8 w-full max-w-md mx-4 text-center">
              <h3 className="text-xl font-semibold mb-2">Session Paused</h3>
              <div className="text-3xl font-mono mb-4">{String(Math.floor(pauseElapsed/60)).padStart(2,'0')}:{String(pauseElapsed%60).padStart(2,'0')}</div>
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={() => {
                    // resume from pause (same as pressing Resume)
                    const now = Date.now();
                    if (pauseStart) {
                      const dur = Math.round((now - pauseStart) / 1000);
                      setPauseEvents((p) => [...p, { start: pauseStart, end: now, duration: dur }]);
                      setTotalPausedSeconds((t) => t + dur);
                    }
                    setPauseStart(null);
                    if (pauseTimerRef.current) { window.clearInterval(pauseTimerRef.current); pauseTimerRef.current = null; }
                    setPauseElapsed(0);
                    setPaused(false);
                    if (!timerRef.current) timerRef.current = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg"
                >Resume</button>
                <button
                  onClick={() => {
                    // open exit modal from pause
                    setShowExitModal(true);
                  }}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg"
                >Exit</button>
              </div>
            </div>
          </div>
        )}

        {/* Interruption modal shown when user returns after leaving the tab */}
        {showInterruptionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-xl p-8 w-full max-w-2xl mx-4">
              <h2 className="text-2xl font-semibold text-center mb-4">You've Left the Session</h2>
              <p className="text-center text-gray-600 mb-6">We detected that you left the study session. Do you want to continue or exit?</p>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={async () => {
                    // Attempt to re-enter fullscreen and resume timer (best-effort)
                    try {
                      if (document.documentElement.requestFullscreen) {
                        await document.documentElement.requestFullscreen();
                      }
                    } catch (err) {
                      console.warn('request fullscreen failed', err);
                      // If fullscreen can't be re-entered, let the user know but still resume
                      alert('Unable to re-enter fullscreen. Resuming the session without fullscreen.');
                    }
                    // resume timer if paused
                    if (!timerRef.current) {
                      timerRef.current = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
                    }
                    setPausedByFullscreen(false);
                    setShowInterruptionModal(false);
                    setLeftFocus(false);
                    setShowFullscreenExitModal(false);
                  }}
                  className="px-8 py-4 bg-green-700 text-white rounded-lg text-lg font-bold"
                >
                  Continue Session
                </button>
                <button
                  onClick={() => {
                    // open the exit modal so user must provide a reason
                    setShowInterruptionModal(false);
                    setShowExitModal(true);
                  }}
                  className="px-6 py-3 bg-red-400 text-white rounded-lg text-lg font-semibold"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fullscreen-exited modal (Escape or other causes) */}
        {showFullscreenExitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative bg-white rounded-xl p-8 w-full max-w-2xl mx-4">
              <h2 className="text-2xl font-semibold text-center mb-4">You left full screen</h2>
              <p className="text-center text-gray-600 mb-6">It looks like you've left fullscreen. Would you like to return to fullscreen and continue, or exit the session?</p>
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={async () => {
                    // attempt to re-enter fullscreen and resume timer
                    try {
                      if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
                    } catch (err) {
                      console.warn('request fullscreen failed', err);
                      alert('Unable to re-enter fullscreen. You can choose Exit to finish the session.');
                      return;
                    }
                    // resume timer
                    if (!timerRef.current) {
                      timerRef.current = window.setInterval(() => setSecondsElapsed((s) => s + 1), 1000);
                    }
                    setPausedByFullscreen(false);
                    setShowFullscreenExitModal(false);
                  }}
                  className="px-8 py-4 bg-green-700 text-white rounded-lg text-lg font-bold"
                >
                  Go Back to Fullscreen
                </button>
                <button
                  onClick={() => {
                    // open the exit modal so user must provide a reason
                    setShowFullscreenExitModal(false);
                    setShowExitModal(true);
                  }}
                  className="px-6 py-3 bg-red-400 text-white rounded-lg text-lg font-semibold"
                >
                  Exit
                </button>
              </div>
            </div>
          </div>
        )}

  <div className="w-full h-full px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Document */}
        <div className="col-span-2 bg-white rounded-lg p-6 shadow-sm min-h-[68vh]">
          <div className="hidden text-sm text-gray-500 mb-4">Document</div>
          <div>
            {docs[activeIdx] && docs[activeIdx].content ? (
              docs[activeIdx].type && (docs[activeIdx].type === 'application/pdf' || docs[activeIdx].type?.startsWith('image/')) ? (
                <div className="w-full h-[60vh]">
                  <iframe src={docs[activeIdx].content} className="w-full h-full border rounded" />
                </div>
              ) : (
                <div className="prose max-w-none">
                  <pre className="whitespace-pre-wrap text-sm">{docs[activeIdx].content}</pre>
                </div>
              )
            ) : (
              <div className="prose max-w-none text-center text-gray-400 py-20">User File</div>
            )}
          </div>
        </div>

        {/* Right: Notes (top) and Chatbot (bottom) */}
        <div className="flex flex-col gap-6">
            <div ref={rightColRef} className="flex flex-col gap-6">
              <div className="bg-white rounded-lg shadow-sm" style={{display:'grid', gridTemplateRows: `${notesHeight}px 8px 1fr`}}>
                <div className="p-4 overflow-auto">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {docs.map((d, i) => (
                        <button
                          key={i}
                          onClick={() => switchToDoc(i)}
                          className={`px-3 py-1 rounded-md ${i === activeIdx ? 'bg-green-100 text-green-800 font-semibold' : 'bg-white text-gray-700 border border-gray-200'}`}
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500">{docs.length} documents</div>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => saveNotes(e.target.value)}
                    placeholder="Type your notes here..."
                    className="w-full h-full border rounded p-3 text-sm resize-none"
                  />
                </div>
                {/* divider */}
                <div
                  onMouseDown={(e) => { draggingRef.current = true; document.body.style.userSelect = 'none'; }}
                  className="bg-gray-100 hover:bg-gray-200 cursor-row-resize"
                  style={{height:8}}
                />
                <div className="p-4 overflow-auto bg-white">
                  <div className="text-sm text-gray-500 mb-2">Assistant</div>
                  <div className="flex-1 bg-gray-50 rounded p-4 h-full">
                      <EmbeddedChat />
                  </div>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  );
}
