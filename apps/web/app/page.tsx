"use client"

import { Layout } from "./components/Layout";
import { Header } from "@/components/Header";

export default function Home() {
  return (
    <Layout maxWidth="full" centered>
      <Header />

      <div className="flex">
        {/* Sidebar is rendered by the root layout. Main area shows placeholders until a document is selected. */}
        <main className="flex-1 p-6 bg-[#445e72] min-h-screen">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm h-[70vh] flex items-center justify-center">
                <div className="text-center text-gray-700">
                  <div className="text-2xl font-semibold mb-2">Please select a document</div>
                  <div className="text-sm text-gray-600">Open a file from the left to preview it here.</div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 shadow-sm h-[70vh] flex flex-col">
                <h3 className="font-semibold mb-3">Notes</h3>
                <textarea
                  readOnly
                  value={"Please select notes"}
                  className="flex-1 w-full border-b pb-2 text-sm resize-none min-h-[50vh] bg-white text-gray-700"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </Layout>
  );
}
