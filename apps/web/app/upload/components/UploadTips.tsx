import { Card } from "../../components/Card";

export function UploadTips() {
  return (
    <Card>
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">💡 使用提示</h3>
        <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
          <li>支持的文件格式：PDF, TXT, DOC, DOCX</li>
          <li>上传成功后点击"开始对话学习"</li>
          <li>AI 会根据你的文件内容提供学习帮助</li>
          <li>提供渐进式提示，帮助你独立思考</li>
          <li>上传记录会自动保存，刷新页面不会丢失</li>
        </ul>
      </div>
    </Card>
  );
}
