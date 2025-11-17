"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function SessionSummaryPage() {
  const params = useParams();
  const sid = params?.sid ?? "";
  const [summary, setSummary] = useState<any | null>(null);
  const [stats, setStats] = useState<any | null>(null);
  const [dailyData, setDailyData] = useState<Array<{date:string, minutes:number}>>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('oasis:sessions');
      const arr = raw ? JSON.parse(raw) : [];
      const found = arr.find((s: any) => s.id === sid);
      setSummary(found || null);
      // load stats (streak)
      try {
        const stRaw = localStorage.getItem('oasis:stats');
        setStats(stRaw ? JSON.parse(stRaw) : null);
      } catch (err) { setStats(null); }

      // build daily totals for last 14 days
      try {
        const days = 14;
        const map: Record<string, number> = {};
        const now = new Date();
        for (let i = 0; i < days; i++) {
          const d = new Date(now);
          d.setDate(now.getDate() - (days - 1 - i));
          const key = d.toISOString().slice(0,10);
          map[key] = 0;
        }
        for (const s of arr) {
          if (!s.endedAt) continue;
          const key = new Date(s.endedAt).toISOString().slice(0,10);
          if (map[key] !== undefined) {
            map[key] += (s.secondsStudied || 0) / 60;
          }
        }
        const dd = Object.keys(map).map(d => ({ date: d, minutes: Math.round((map[d]||0) * 10) / 10 }));
        setDailyData(dd);
      } catch (err) { setDailyData([]); }
    } catch (err) {
      console.error(err);
      setSummary(null);
    }
  }, [sid]);

  if (!summary) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">Session not found</h2>
          <Link href="/" className="text-blue-600">Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-4">Study Session Summary</h2>
        {stats && (
          <div className="mb-4">
            <strong>Current streak:</strong> {stats.currentStreak || 0} sessions without early exit
          </div>
        )}
        {dailyData && dailyData.length > 0 && (
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">Last {dailyData.length} days study (minutes)</div>
            <div className="w-full h-28 bg-gray-50 rounded p-2">
              <svg viewBox={`0 0 ${dailyData.length * 28} 100`} className="w-full h-full">
                {(() => {
                  const max = Math.max(...dailyData.map(d => d.minutes), 1);
                  return dailyData.map((d, i) => {
                    const barH = Math.round((d.minutes / max) * 80);
                    const x = i * 28 + 6;
                    return (
                      <g key={d.date}>
                        <rect x={x} y={90 - barH} width={16} height={barH} fill="#10B981" rx={3} />
                        <text x={x + 8} y={96} fontSize={9} textAnchor="middle" fill="#374151">{d.date.slice(5)}</text>
                      </g>
                    );
                  });
                })()}
              </svg>
            </div>
          </div>
        )}
        <div className="space-y-3">
          <div><strong>Document Index:</strong> {summary.docIndex}</div>
          <div><strong>Time set (minutes):</strong> {summary.minutesSet}</div>
          <div><strong>Time studied (seconds):</strong> {summary.secondsStudied}</div>
          <div><strong>Exit reason:</strong> {summary.exitReason}</div>
          <div><strong>Ended at:</strong> {new Date(summary.endedAt).toLocaleString()}</div>
        </div>

        <div className="mt-6 flex gap-4">
          <Link href="/" className="px-4 py-2 bg-green-700 text-white rounded">Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
