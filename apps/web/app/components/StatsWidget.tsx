"use client"

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider'

export default function StatsWidget() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [weekData, setWeekData] = useState<Array<{date:string, minutes:number, completed:boolean}>>([]);

  useEffect(() => {
    try { const raw = localStorage.getItem('oasis:sessions'); setSessions(raw ? JSON.parse(raw) : []); } catch (err) { setSessions([]); }
    try { const s = localStorage.getItem('oasis:stats'); setStats(s ? JSON.parse(s) : null); } catch (err) { setStats(null); }
    try { const d = localStorage.getItem('oasis:documents'); setDocs(d ? JSON.parse(d) : []); } catch (err) { setDocs([]); }
    // build last-7-days data
    try {
      const raw = localStorage.getItem('oasis:sessions');
      const arr = raw ? JSON.parse(raw) : [];
      const days = 7;
      const map: Record<string, {minutes:number, completed:boolean}> = {};
      const now = new Date();
      for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() - (days - 1 - i));
        const key = d.toISOString().slice(0,10);
        map[key] = { minutes: 0, completed: false };
      }
      for (const s of arr) {
        if (!s.endedAt) continue;
        const key = new Date(s.endedAt).toISOString().slice(0,10);
        if (map[key] !== undefined) {
          map[key].minutes += (s.secondsStudied || 0) / 60;
          if (s.completed) map[key].completed = true;
        }
      }
      const wd = Object.keys(map).map(k => ({ date: k, minutes: Math.round((map[k].minutes||0)*10)/10, completed: map[k].completed }));
      setWeekData(wd);
    } catch (err) { setWeekData([]); }
  }, []);

  const sessionsCount = sessions.length;
  const docsCount = docs.length;
  const currentStreak = (stats && stats.currentStreak) || 0;
  const totalMinutes = Math.round((sessions.reduce((acc, s) => acc + (s.secondsStudied || 0), 0) / 60) * 10) / 10;
  const avgFocus = sessionsCount ? Math.round((totalMinutes / sessionsCount) * 10) / 10 : 0;

  return (
    <div>
      <div className="bg-white rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-100 to-orange-200 flex items-center justify-center">👩‍🎓</div>
          <div>
            {/* show logged-in user's display name or email */}
            <UserNameDisplay />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-sm text-gray-500">Sessions</div>
            <div className="font-bold">{sessionsCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Docs</div>
            <div className="font-bold">{docsCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Streak</div>
            <div className="font-bold">{currentStreak}</div>
          </div>
        </div>
      </div>

      {/* Weekly summary: 7 stars and hours/day */}
      <div className="mt-4 bg-white rounded-lg p-4 shadow-sm">
        <div className="text-sm text-gray-500 mb-2">This week</div>
        <div className="flex items-center gap-3 justify-between">
          {weekData.map((d, i) => (
            <div key={d.date} className="flex flex-col items-center text-center">
              <div className="text-xs text-gray-400">{new Date(d.date).toLocaleDateString(undefined,{weekday:'short'})}</div>
              <div className="mt-1">{d.completed ? '★' : '☆'}</div>
              <div className="text-xs text-gray-600 mt-1">{d.minutes}m</div>
            </div>
          ))}
        </div>
        <div className="mt-3 text-sm text-gray-700">Weekly total: <strong>{Math.round((weekData.reduce((a,b)=>a+(b.minutes||0),0)/60)*10)/10} hrs</strong></div>
      </div>

      <div className="mt-4">
        <Link href="/stats/details" className="px-4 py-2 bg-green-600 text-white rounded text-sm">View Sessions</Link>
      </div>
    </div>
  );
}

function UserNameDisplay() {
  try {
    const { user } = useAuth()
    const name = (user?.user_metadata && (user.user_metadata.full_name || user.user_metadata.name)) || user?.email || 'Guest'
    return (
      <>
        <div className="font-semibold">{name}</div>
      </>
    )
  } catch (err) {
    return <div className="font-semibold">Guest</div>
  }
}
