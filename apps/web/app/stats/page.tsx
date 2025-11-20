"use client"

import React, { useState } from 'react';
import Link from 'next/link';

export default function StatsHome() {
  const [sessions] = useState<any[]>(() => {
    try {
      const raw = localStorage.getItem('oasis:sessions');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });

  const [stats] = useState<any>(() => {
    try {
      const s = localStorage.getItem('oasis:stats');
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const [documentsCount] = useState<number>(() => {
    try {
      return (JSON.parse(localStorage.getItem('oasis:documents') || '[]') || []).length;
    } catch {
      return 0;
    }
  });

  // computed metrics
  const totalSessions = sessions.length;
  const totalMinutes = Math.round((sessions.reduce((acc, s) => acc + (s.secondsStudied || 0), 0) / 60) * 10) / 10;
  const avgMinutes = totalSessions ? Math.round((totalMinutes / totalSessions) * 10) / 10 : 0;
  const totalPauseMinutes = Math.round((sessions.reduce((acc, s) => acc + (s.totalPausedSeconds || 0), 0) / 60) * 10) / 10;
  const totalPauses = sessions.reduce((acc, s) => acc + ((s.pauseEvents && s.pauseEvents.length) || 0), 0);

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Study Stats</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Sessions</div>
            <div className="text-2xl font-bold">{totalSessions}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Current Streak</div>
            <div className="text-2xl font-bold">{(stats && stats.currentStreak) || 0}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Total Minutes</div>
            <div className="text-2xl font-bold">{totalMinutes} min</div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-500">Avg Session</div>
            <div className="text-2xl font-bold">{avgMinutes} min</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 items-start mb-6">
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Total Pauses</div>
            <div className="text-xl font-bold">{totalPauses}</div>
            <div className="text-sm text-gray-500">Total Pause Time</div>
            <div className="font-semibold">{totalPauseMinutes} min</div>
          </div>
          <div className="p-4 bg-white rounded shadow">
            <div className="text-sm text-gray-500">Documents</div>
            <div className="text-xl font-bold">{(JSON.parse(localStorage.getItem('oasis:documents') || '[]') || []).length}</div>
            <div className="mt-4">
              <Link href="/stats/details" className="px-4 py-2 bg-green-600 text-white rounded">View Detailed Data</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
