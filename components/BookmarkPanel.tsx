'use client';

import { useState } from 'react';
import { Bookmark, Plus, X, Edit2, Check } from 'lucide-react';

interface BookmarkItem {
  id: string;
  question: string;
  concept?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  subject?: string;
  isResolved: boolean;
}

interface BookmarkPanelProps {
  bookmarks: BookmarkItem[];
  onAddBookmark: (bookmark: Omit<BookmarkItem, 'id' | 'isResolved'>) => void;
  onToggleResolved: (id: string) => void;
  onDeleteBookmark: (id: string) => void;
  currentSubject?: string;
}

export default function BookmarkPanel({
  bookmarks,
  onAddBookmark,
  onToggleResolved,
  onDeleteBookmark,
  currentSubject,
}: BookmarkPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newBookmark, setNewBookmark] = useState({
    question: '',
    concept: '',
    difficulty: 'medium' as const,
    subject: currentSubject || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBookmark.question.trim()) {
      onAddBookmark(newBookmark);
      setNewBookmark({
        question: '',
        concept: '',
        difficulty: 'medium',
        subject: currentSubject || '',
      });
      setIsAdding(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'hard':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Bookmark className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Bookmarks
          </h2>
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full text-sm">
            {bookmarks.length}
          </span>
        </div>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center space-x-1 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>

      {/* Add Bookmark Form */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Question/Problem
              </label>
              <textarea
                value={newBookmark.question}
                onChange={(e) => setNewBookmark({ ...newBookmark, question: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="What question did you find difficult?"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Main Concept
              </label>
              <input
                type="text"
                value={newBookmark.concept}
                onChange={(e) => setNewBookmark({ ...newBookmark, concept: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Derivatives, Chemical Equations"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Difficulty
              </label>
              <select
                value={newBookmark.difficulty}
                onChange={(e) =>
                  setNewBookmark({
                    ...newBookmark,
                    difficulty: e.target.value as 'easy' | 'medium' | 'hard',
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Save Bookmark
              </button>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Bookmarks List */}
      <div className="space-y-3">
        {bookmarks.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Bookmark className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No bookmarks yet. Add difficult questions to review later!</p>
          </div>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                bookmark.isResolved
                  ? 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-700 opacity-60'
                  : 'bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {bookmark.concept && (
                      <span className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {bookmark.concept}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(bookmark.difficulty)}`}>
                      {bookmark.difficulty}
                    </span>
                    {bookmark.isResolved && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        Resolved
                      </span>
                    )}
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm">
                    {bookmark.question}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => onToggleResolved(bookmark.id)}
                    className={`p-1 rounded transition-colors ${
                      bookmark.isResolved
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        : 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400'
                    }`}
                    title={bookmark.isResolved ? 'Mark as unresolved' : 'Mark as resolved'}
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteBookmark(bookmark.id)}
                    className="p-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    title="Delete bookmark"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
