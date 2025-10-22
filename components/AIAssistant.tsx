'use client';

import { useState } from 'react';
import { Sparkles, Send, Loader2, AlertCircle } from 'lucide-react';

interface AIAssistantProps {
  currentSubject?: string;
  onExplanationReceived?: (explanation: string) => void;
}

export default function AIAssistant({ currentSubject, onExplanationReceived }: AIAssistantProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<{
    explanation: string;
    concepts: string[];
    hints: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/study-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          subject: currentSubject,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to get study guide');
      }

      const data = await res.json();
      setResponse(data);
      onExplanationReceived?.(data.explanation);
    } catch (err) {
      setError('Failed to get AI assistance. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="flex items-center space-x-2 mb-6">
        <Sparkles className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          AI Study Assistant
        </h2>
      </div>

      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> I'll help you understand concepts without giving direct answers.
          Ask about topics, methods, or request hints!
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            What do you need help understanding?
          </label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white resize-none"
            rows={4}
            placeholder="e.g., 'How do I approach derivative problems with the chain rule?' or 'What's the concept behind balancing chemical equations?'"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Getting help...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Get Study Guide</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {response && (
        <div className="space-y-4">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
            <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
              Study Guide
            </h3>
            <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
              {response.explanation}
            </div>
          </div>

          {response.concepts.length > 0 && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Key Concepts
              </h3>
              <ul className="space-y-1">
                {response.concepts.map((concept, index) => (
                  <li key={index} className="text-sm text-green-800 dark:text-green-200">
                    • {concept}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {response.hints.length > 0 && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Hints
              </h3>
              <ul className="space-y-1">
                {response.hints.map((hint, index) => (
                  <li key={index} className="text-sm text-yellow-800 dark:text-yellow-200">
                    • {hint}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
