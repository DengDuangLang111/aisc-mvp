import Link from 'next/link';
import { BookOpen, Lock, Target, TrendingUp } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Lock className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">StudyLock</h1>
          </div>
          <nav className="space-x-4">
            <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300">
              Dashboard
            </Link>
            <Link href="/login" className="text-gray-600 hover:text-indigo-600 dark:text-gray-300">
              Login
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">
            Focus on Learning, Not Distractions
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
            StudyLock helps students maintain focus while completing homework through screen locking,
            AI-powered study assistance, and progress tracking.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/dashboard"
              className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Get Started
            </Link>
            <Link
              href="/demo"
              className="px-8 py-3 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-gray-800 transition-colors"
            >
              See Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-20">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Screen Lock
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Stay focused with timer-based screen locking that keeps distractions at bay.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              AI Study Guides
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Get intelligent help that explains concepts without giving direct answers.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Smart Bookmarks
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Bookmark difficult questions and organize them by subject for review.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Progress Tracking
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Monitor your study patterns and improvement over time with detailed analytics.
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-20 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-8">
            Proven Results
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-indigo-600 mb-2">25%</div>
              <div className="text-gray-600 dark:text-gray-300">Faster Homework Completion</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-600 mb-2">70%</div>
              <div className="text-gray-600 dark:text-gray-300">Daily Active Retention</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-600 mb-2">15%</div>
              <div className="text-gray-600 dark:text-gray-300">Grade Improvement</div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-20 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2025 StudyLock. Built to help students focus and succeed.</p>
        </div>
      </footer>
    </div>
  );
}
