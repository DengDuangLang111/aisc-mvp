"use client"

import React, { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/Header';

export default function StatsDetails() {
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oasis:sessions');
      const arr = raw ? JSON.parse(raw) : [];
      setSessions(Array.isArray(arr) ? arr.reverse() : []);
    } catch (err) {
      setSessions([]);
    }
  }, []);

  const totals = useMemo(() => {
    const totalSeconds = sessions.reduce((acc, s) => acc + (s.secondsStudied || 0), 0);
    const totalPaused = sessions.reduce((acc, s) => acc + (s.totalPausedSeconds || 0), 0);
    return {
      totalMinutes: Math.round((totalSeconds / 60) * 10) / 10,
      totalPausedMinutes: Math.round((totalPaused / 60) * 10) / 10,
    };
  }, [sessions]);

  const sessionsCount = sessions.length;
  const avgFocus = sessionsCount ? Math.round((totals.totalMinutes / sessionsCount) * 10) / 10 : 0;
  const completedTasks = sessions.filter((s) => s.completed).length;

  const last7 = useMemo(() => {
    // build last 7 days totals
    const map: Record<string, number> = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      map[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of sessions) {
      if (!s.endedAt) continue;
      const key = new Date(s.endedAt).toISOString().slice(0, 10);
      if (map[key] !== undefined) map[key] += (s.secondsStudied || 0) / 60;
    }
    return Object.keys(map).map(k => ({ date: k, minutes: Math.round((map[k]||0) * 10) / 10 }));
  }, [sessions]);

  const suggestions = [
    'Math 253 equation practice — LinkResources',
    'Read Chapter 4: Thermodynamics — LinkResources',
    'Flashcards: Biology Week 3 — LinkResources',
    'Project outline review — LinkResources',
  ];

  const statsSummary = useMemo(() => {
    try {
      const raw = localStorage.getItem('oasis:stats');
      return raw ? JSON.parse(raw) : {};
    } catch (e) { return {}; }
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fbfb]">
      <div className="max-w-7xl mx-auto px-8 py-10">
        <Header />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: main greeting and suggestions (col-span 7) */}
          <div className="lg:col-span-7 bg-white rounded-lg p-8 shadow-sm">
            <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 leading-tight">Hello, Sophii</h1>
            <p className="mt-2 text-xl text-gray-600">Welcome to your Study Analysis Lab</p>

            <div className="mt-8 flex items-center gap-6">
              {/* Day streak badges */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center shadow">🥇</div>
                <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center shadow">🥈</div>
                <div className="w-14 h-14 rounded-full bg-sky-50 flex items-center justify-center shadow">🥉</div>
              </div>

              <div>
                <div className="text-sm text-gray-500">Day Streak</div>
                <div className="text-2xl font-bold text-gray-900">{(statsSummary && statsSummary.currentStreak) || 0} days</div>
              </div>
            </div>

            <div className="mt-10">
              <h3 className="text-lg font-medium mb-4">Study Suggestion For You</h3>
              <ul className="space-y-6">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex gap-4 items-start">
                    <div className="mt-1">•</div>
                    <div>
                      <div className="text-gray-800">{s.split('—')[0]}</div>
                      <a className="text-sm text-teal-600 underline" href="#">LinkResources</a>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right: progress panel (col-span 5) */}
          <aside className="lg:col-span-5">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Your Study Progress</h3>
                <div className="text-sm text-gray-500">7 days</div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white border rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500">Total Focus Time</div>
                  <div className="text-2xl font-bold text-gray-900">{totals.totalMinutes} mins</div>
                </div>
                <div className="bg-white border rounded-lg p-4 text-center">
                  <div className="text-sm text-gray-500">Total Pause Time</div>
                  <div className="text-2xl font-bold text-gray-900">{totals.totalPausedMinutes} mins</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-white shadow-sm text-center">
                  <div className="text-sm text-gray-500">Average Focus</div>
                  <div className="font-bold text-gray-900">{avgFocus} min</div>
                </div>
                <div className="p-4 rounded-lg bg-white shadow-sm text-center">
                  <div className="text-sm text-gray-500">Completed Tasks</div>
                  <div className="font-bold text-gray-900">{completedTasks}</div>
                </div>
              </div>

              <div className="bg-white border rounded-lg p-4 mb-4">
                <WeekChart data={last7} highlightLabel={`${Math.round(Math.max(...last7.map(d=>d.minutes),0))}min`} />
              </div>

              <div className="flex gap-3">
                <button className="flex-1 px-3 py-2 border rounded text-sm">Math Time Track</button>
                <button className="flex-1 px-3 py-2 border rounded text-sm">Project Time Track</button>
                <button className="flex-1 px-3 py-2 bg-teal-100 rounded text-sm">English Time Track</button>
                <button className="flex-1 px-3 py-2 bg-amber-100 rounded text-sm">Chem Time Track</button>
              </div>
            </div>
          </aside>
        </div>

        {/* Sessions list below */}
        <div className="mt-10 bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium mb-4">Recent Sessions</h3>
          <div className="space-y-3">
            {sessions.length === 0 && <div className="text-sm text-gray-500">No sessions yet</div>}
            {sessions.map((s, idx) => (
              <div key={s.id || idx} className="bg-[#fbfcfc] border rounded p-4 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-800">{new Date(s.endedAt).toLocaleString()}</div>
                  <div className="text-sm text-gray-500">Docs: {(s.documentsUsed||[]).join(', ')}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-gray-900">{Math.round((s.secondsStudied||0)/60)} min</div>
                  <div className="text-sm text-gray-500">Pauses: {(s.pauseEvents||[]).length} — {Math.round((s.totalPausedSeconds||0)/60*10)/10} min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeekChart({ data, highlightLabel }: { data: Array<{date:string, minutes:number}>, highlightLabel?: string }) {
  // Create a simple SVG line + area chart
  const width = 480;
  const height = 200;
  const padding = 20;
  const points = data.map((d, i) => {
    const x = padding + (i * (width - padding * 2) / Math.max(1, data.length - 1));
    return { x, yValue: d.minutes, date: d.date };
  });
  const max = Math.max(...data.map(d => d.minutes), 1);
  const pts = points.map(p => `${p.x},${height - padding - ((p.yValue / max) * (height - padding * 2))}`).join(' ');
  // find index of max to show highlight
  const maxIdx = data.reduce((acc, d, i) => d.minutes > (data[acc]?.minutes||0) ? i : acc, 0);
  const highlightX = points[maxIdx]?.x ?? padding;
  const highlightY = height - padding - ((points[maxIdx]?.yValue || 0) / max * (height - padding * 2));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-48">
        <defs>
          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dff6f2" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        {/* area (approx using polygon) */}
        <polyline points={`${pts} ${width-padding},${height-padding} ${padding},${height-padding}`} fill="url(#g1)" stroke="none" />
        {/* main stroke */}
        <polyline points={pts} fill="none" stroke="#15b6a6" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {/* dashed comparison line */}
        <polyline points={pts} fill="none" stroke="#f0a500" strokeWidth={2} strokeDasharray="6 6" opacity={0.9} transform={`translate(0,6)`} />

        {/* highlight dot */}
        <circle cx={highlightX} cy={highlightY} r={10} fill="#15b6a6" stroke="#fff" strokeWidth={3} />
      </svg>

      <div className="-mt-12 flex justify-center">
        <div className="bg-teal-500 text-white px-3 py-1 rounded-full text-sm shadow">{highlightLabel}</div>
      </div>
    </div>
  )
}
