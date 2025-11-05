import Link from "next/link"
import { Card } from "./components/Card"
import { Button } from "./components/Button"
import { Layout } from "./components/Layout"

export default function Home() {
  return (
    <Layout maxWidth="lg" centered>
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-4 mb-4">
          <h1 className="text-4xl font-bold text-gray-900">
            Study Oasis
          </h1>
          <Link 
            href="/settings"
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </Link>
        </div>
        <p className="text-lg text-gray-600">
          AI-powered intelligent learning assistant - Progressive prompts to help you think independently
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card title="💬 AI Chat">
          <div className="space-y-4">
            <p className="text-gray-600">
              Chat with AI assistant and get intelligent progressive hints
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>🤔 Level 1: Gentle Hint - Guide thinking direction</li>
              <li>💡 Level 2: Medium Hint - Provide thought steps</li>
              <li>✨ Level 3: Detailed Hint - Near complete answer</li>
            </ul>
            <Link href="/chat">
              <Button variant="primary" size="lg" className="w-full">
                Start Chat
              </Button>
            </Link>
          </div>
        </Card>

        <Card title="📁 File Upload">
          <div className="space-y-4">
            <p className="text-gray-600">
              Upload study materials and let AI help you understand the content
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>📄 Support multiple file formats</li>
              <li>🔍 Intelligent content analysis</li>
              <li>💾 Secure storage</li>
            </ul>
            <Link href="/upload">
              <Button variant="secondary" size="lg" className="w-full">
                Upload File
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8">
          Why Choose Study Oasis?
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-lg font-semibold mb-2">Independent Thinking</h3>
            <p className="text-gray-600 text-sm">
              Progressive prompting system helps you find answers yourself
            </p>
          </div>
          <div>
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Real-time Feedback</h3>
            <p className="text-gray-600 text-sm">
              Get instant intelligent responses from AI assistant
            </p>
          </div>
          <div>
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2">Personalized Learning</h3>
            <p className="text-gray-600 text-sm">
              Adjust hint levels based on your progress
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
