'use client';

import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, AlertCircle } from 'lucide-react';

interface ScreenLockProps {
  isLocked: boolean;
  onLockToggle: (locked: boolean) => void;
  estimatedMinutes: number;
  onTimeUp?: () => void;
}

export default function ScreenLock({
  isLocked,
  onLockToggle,
  estimatedMinutes,
  onTimeUp,
}: ScreenLockProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(estimatedMinutes * 60);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    if (!isLocked) {
      setRemainingSeconds(estimatedMinutes * 60);
      return;
    }

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onTimeUp?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isLocked, estimatedMinutes, onTimeUp]);

  const handleUnlockRequest = useCallback(() => {
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 3000);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmergencyUnlock = () => {
    if (confirm('Are you sure you want to unlock? This will end your focused study session.')) {
      onLockToggle(false);
      setShowWarning(false);
    }
  };

  if (!isLocked) {
    return (
      <div className="flex items-center space-x-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
        <Unlock className="w-6 h-6 text-green-600" />
        <div className="flex-1">
          <h3 className="font-semibold text-green-900 dark:text-green-100">
            Ready to Start
          </h3>
          <p className="text-sm text-green-700 dark:text-green-300">
            Click the lock button to begin your focused study session
          </p>
        </div>
        <button
          onClick={() => onLockToggle(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Lock & Focus
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Lock Header */}
      <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border-2 border-indigo-600">
        <div className="flex items-center space-x-4">
          <Lock className="w-6 h-6 text-indigo-600 animate-pulse" />
          <div>
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100">
              Focus Mode Active
            </h3>
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Time remaining: {formatTime(remainingSeconds)}
            </p>
          </div>
        </div>
        <button
          onClick={handleUnlockRequest}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
        >
          Emergency Unlock
        </button>
      </div>

      {/* Warning Message */}
      {showWarning && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Stay Focused!
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                You're doing great! Breaking focus now will impact your session score.
                Remember your goal!
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowWarning(false)}
                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                >
                  Keep Going
                </button>
                <button
                  onClick={handleEmergencyUnlock}
                  className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                >
                  Unlock Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-indigo-600 h-2 rounded-full transition-all duration-1000"
            style={{
              width: `${((estimatedMinutes * 60 - remainingSeconds) / (estimatedMinutes * 60)) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
