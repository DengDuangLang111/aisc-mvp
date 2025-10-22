'use client';

import { useState } from 'react';
import { Brain, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function PracticePage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Mock bookmarks for demo - in production, fetch from API
  const mockBookmarks = [
    {
      question: 'Find the derivative of f(x) = x^3 + 2x^2 - 5x + 1',
      concept: 'Derivatives',
      subject: 'Mathematics',
    },
    {
      question: 'Solve the quadratic equation: x^2 - 5x + 6 = 0',
      concept: 'Quadratic Equations',
      subject: 'Mathematics',
    },
  ];

  const handleGeneratePractice = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/practice-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookmarks: mockBookmarks,
          count: 5,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate practice questions');
      }

      const data = await response.json();
      setPracticeQuestions(data.questions);
    } catch (err) {
      setError('Failed to generate practice test. Please try again.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="w-8 h-8 text-indigo-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Practice Tests
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Review and strengthen your weak areas
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Info Card */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            AI-Generated Practice Tests
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Based on your bookmarked difficult questions, we'll generate similar practice
            problems to help you master these concepts. The questions will test the same
            principles without being identical to your homework.
          </p>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Tests same concepts</span>
            </div>
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Different problems</span>
            </div>
            <div className="flex items-center space-x-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm">Adaptive difficulty</span>
            </div>
          </div>
        </div>

        {/* Generate Button */}
        {practiceQuestions.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <Brain className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Practice?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              We found {mockBookmarks.length} bookmarked questions. Let's generate a
              practice test to help you master these concepts!
            </p>
            <button
              onClick={handleGeneratePractice}
              disabled={isGenerating}
              className="inline-flex items-center space-x-2 px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Generate Practice Test</span>
                </>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Practice Questions */}
        {practiceQuestions.length > 0 && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Your Practice Test
                </h3>
                <button
                  onClick={handleGeneratePractice}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm"
                >
                  Generate New Test
                </button>
              </div>

              <div className="space-y-4">
                {practiceQuestions.map((question, index) => (
                  <div
                    key={index}
                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-white">{question}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-6 border border-indigo-200 dark:border-indigo-800">
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-3">
                Study Tips
              </h4>
              <ul className="space-y-2 text-sm text-indigo-800 dark:text-indigo-200">
                <li>• Work through each problem on paper before checking solutions</li>
                <li>• If you get stuck, use the AI Assistant to understand concepts</li>
                <li>• Bookmark any questions you find difficult for future review</li>
                <li>• Track your progress over time to see improvement</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
