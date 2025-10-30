import Link from "next/link"
import { Card } from "./components/Card"
import { Button } from "./components/Button"
import { Layout } from "./components/Layout"

export default function Home() {
  return (
    <Layout maxWidth="lg" centered>
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Study Oasis 学习绿洲
        </h1>
        <p className="text-lg text-gray-600">
          AI 驱动的智能学习助手 - 渐进式提示，帮助你独立思考
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Card title="💬 AI 对话">
          <div className="space-y-4">
            <p className="text-gray-600">
              与 AI 助手对话，获得智能渐进式提示
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>🤔 Level 1: 轻微提示 - 引导思考方向</li>
              <li>💡 Level 2: 中等提示 - 提供思路步骤</li>
              <li>✨ Level 3: 详细提示 - 接近完整答案</li>
            </ul>
            <Link href="/chat">
              <Button variant="primary" size="lg" className="w-full">
                开始对话
              </Button>
            </Link>
          </div>
        </Card>

        <Card title="📁 文件上传">
          <div className="space-y-4">
            <p className="text-gray-600">
              上传学习资料，让 AI 帮助你理解内容
            </p>
            <ul className="text-sm text-gray-500 space-y-2">
              <li>📄 支持多种文件格式</li>
              <li>🔍 智能内容分析</li>
              <li>💾 安全存储</li>
            </ul>
            <Link href="/upload">
              <Button variant="secondary" size="lg" className="w-full">
                上传文件
              </Button>
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-16 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-8">
          为什么选择 Study Oasis？
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="text-4xl mb-4">🧠</div>
            <h3 className="text-lg font-semibold mb-2">独立思考</h3>
            <p className="text-gray-600 text-sm">
              渐进式提示系统帮助你自己找到答案
            </p>
          </div>
          <div>
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">实时反馈</h3>
            <p className="text-gray-600 text-sm">
              即时获得 AI 助手的智能回复
            </p>
          </div>
          <div>
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold mb-2">个性化学习</h3>
            <p className="text-gray-600 text-sm">
              根据你的进度调整提示等级
            </p>
          </div>
        </div>
      </div>
    </Layout>
  )
}
