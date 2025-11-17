import React from 'react'
import { Layout } from '../components/Layout'

export const metadata = {
  title: 'Study Analysis Lab'
}

export default function AnalysisPage() {
  return (
    <Layout maxWidth="full" centered>
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Study Analysis Lab</h1>
            <p className="text-sm text-gray-500">Deep dive into your focus metrics</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow">
              <h2 className="font-semibold mb-4">Average Focus</h2>
              <div className="text-4xl font-bold">—</div>
              <div className="mt-6 text-sm text-gray-600">Detailed charts and analytics will appear here.</div>
            </div>

            <aside className="bg-white rounded-lg p-6 shadow">
              <h3 className="font-semibold mb-3">This Week</h3>
              <div className="text-sm text-gray-600">Placeholder for weekly breakdown and trends.</div>
            </aside>
          </div>
        </div>
      </div>
    </Layout>
  )
}
