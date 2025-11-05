import Link from "next/link"
import { Card } from "./components/Card"
import { Button } from "./components/Button"
import { Layout } from "./components/Layout"
import { Header } from "@/components/Header"

export default function Home() {
  return (
    <Layout maxWidth="lg" centered>
      <Header />
      
      {/* Hero Section */}
      <div className="text-center mb-16 mt-8">
        <h2 className="text-5xl font-bold text-gray-900 mb-4">
          Learn Smarter, Not Harder
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          AI-powered intelligent learning assistant with progressive prompts to help you think independently
        </p>
      </div>

      {/* Main Features - Cards */}
      <div id="features" className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
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

      {/* Why Choose Section */}
      <div className="mt-20 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Why Choose Study Oasis?
        </h2>
        <p className="text-gray-600 mb-12 max-w-2xl mx-auto">
          Transform your learning experience with AI-powered features designed for independent thinking
        </p>
        
        <div className="grid md:grid-cols-3 gap-10">
          <div className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-shadow">
            <div className="text-5xl mb-4">🧠</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Independent Thinking</h3>
            <p className="text-gray-600">
              Progressive prompting system helps you find answers yourself, building critical thinking skills
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 hover:shadow-lg transition-shadow">
            <div className="text-5xl mb-4">⚡</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Real-time Feedback</h3>
            <p className="text-gray-600">
              Get instant intelligent responses from AI assistant with streaming support
            </p>
          </div>
          
          <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-teal-50 hover:shadow-lg transition-shadow">
            <div className="text-5xl mb-4">🎯</div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Personalized Learning</h3>
            <p className="text-gray-600">
              Adjust hint levels based on your progress and learning style
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-20 text-center py-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold text-white mb-4">
          Ready to Transform Your Learning?
        </h2>
        <p className="text-blue-100 mb-8 text-lg">
          Join thousands of students already learning smarter with Study Oasis
        </p>
        <Link href="/auth/register">
          <Button 
            variant="secondary" 
            size="lg" 
            className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-4 text-lg font-semibold"
          >
            Get Started Free →
          </Button>
        </Link>
      </div>
    </Layout>
  )
}
