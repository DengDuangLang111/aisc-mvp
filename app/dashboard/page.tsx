'use client';

import { useState, useEffect } from 'react';
import ScreenLock from '@/components/ScreenLock';
import BookmarkPanel from '@/components/BookmarkPanel';
import AIAssistant from '@/components/AIAssistant';
import { Clock, Target, BookOpen, Award, Camera, X } from 'lucide-react';

interface Bookmark {
  id: string;
  question: string;
  concept?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject?: string;
  isResolved: boolean;
}

export default function DashboardPage() {
  const [isLocked, setIsLocked] = useState(false);
  const [currentSession, setCurrentSession] = useState({
    subject: 'Mathematics',
    estimatedMinutes: 60,
    startTime: null as Date | null,
    questionsCount: 0,
  });

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [showHomeworkScanner, setShowHomeworkScanner] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 12,
    averageFocus: 85,
    totalMinutes: 720,
    bookmarksCreated: 15,
  });

  const handleLockToggle = (locked: boolean) => {
    setIsLocked(locked);
    if (locked) {
      setCurrentSession({
        ...currentSession,
        startTime: new Date(),
      });
    }
  };

  const handleTimeUp = () => {
    setIsLocked(false);
    setShowHomeworkScanner(true);
  };

  const handleAddBookmark = (bookmark: Omit<Bookmark, 'id' | 'isResolved'>) => {
    const newBookmark: Bookmark = {
      ...bookmark,
      id: Date.now().toString(),
      isResolved: false,
    };
    setBookmarks([...bookmarks, newBookmark]);
    setCurrentSession({
      ...currentSession,
      questionsCount: currentSession.questionsCount + 1,
    });
  };

  const handleToggleResolved = (id: string) => {
    setBookmarks(
      bookmarks.map((b) => (b.id === id ? { ...b, isResolved: !b.isResolved } : b))
    );
  };

  const handleDeleteBookmark = (id: string) => {
    setBookmarks(bookmarks.filter((b) => b.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BookOpen className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  StudyLock Dashboard
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Welcome back! Ready to focus?
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-600 dark:text-gray-400">Focus Score</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {sessionStats.averageFocus}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Session Setup Card (when not locked) */}
        {!isLocked && !currentSession.startTime && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Start New Study Session
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Subject
                </label>
                <select
                  value={currentSession.subject}
                  onChange={(e) =>
                    setCurrentSession({ ...currentSession, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                >
                  <option>Mathematics</option>
                  <option>Science</option>
                  <option>English</option>
                  <option>History</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Estimated Time (minutes)
                </label>
                <input
                  type="number"
                  value={currentSession.estimatedMinutes}
                  onChange={(e) =>
                    setCurrentSession({
                      ...currentSession,
                      estimatedMinutes: parseInt(e.target.value) || 60,
                    })
                  }
                  min={5}
                  max={180}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Sessions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sessionStats.totalSessions}
                </p>
              </div>
              <Target className="w-8 h-8 text-indigo-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Study Time</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {Math.floor(sessionStats.totalMinutes / 60)}h
                </p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bookmarks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sessionStats.bookmarksCreated}
                </p>
              </div>
              <BookOpen className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg Focus</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {sessionStats.averageFocus}%
                </p>
              </div>
              <Award className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Screen Lock */}
        <div className="mb-8">
          <ScreenLock
            isLocked={isLocked}
            onLockToggle={handleLockToggle}
            estimatedMinutes={currentSession.estimatedMinutes}
            onTimeUp={handleTimeUp}
          />
        </div>

        {/* Main Content Area - Side by Side Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* AI Assistant */}
          <AIAssistant currentSubject={currentSession.subject} />

          {/* Bookmarks Panel */}
          <BookmarkPanel
            bookmarks={bookmarks}
            onAddBookmark={handleAddBookmark}
            onToggleResolved={handleToggleResolved}
            onDeleteBookmark={handleDeleteBookmark}
            currentSubject={currentSession.subject}
          />
        </div>

        {/* Current Session Info */}
        {isLocked && currentSession.startTime && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              Current Session
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Subject</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentSession.subject}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Started</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentSession.startTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {currentSession.questionsCount}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Bookmarks</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {bookmarks.length}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Homework Scanner Modal */}
      {showHomeworkScanner && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Session Complete!
              </h3>
              <button
                onClick={() => setShowHomeworkScanner(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Great job! Would you like to scan your completed homework for verification?
            </p>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                <Camera className="w-5 h-5" />
                <span>Scan Homework</span>
              </button>
              <button
                onClick={() => setShowHomeworkScanner(false)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
