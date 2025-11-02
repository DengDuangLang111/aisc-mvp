"use client";

export function StorageInfoCard() {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-semibold text-gray-900 mb-3">ℹ️ 关于数据存储</h3>
      <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
        <li>所有数据存储在浏览器本地 (localStorage)</li>
        <li>数据不会上传到服务器，完全保护您的隐私</li>
        <li>清除浏览器数据会导致历史记录丢失</li>
        <li>建议定期导出数据备份</li>
        <li>最多保存 20 个聊天会话和 50 条上传记录</li>
      </ul>
    </div>
  );
}
