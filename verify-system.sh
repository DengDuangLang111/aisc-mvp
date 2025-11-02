#!/bin/bash

# Study Oasis 系统验证脚本
# 检查后端和前端是否正常运行

echo "🔍 Study Oasis 系统验证\n"
echo "========================================\n"

# 检查后端
echo "📍 检查后端服务 (Port 4001)..."
if curl -s http://localhost:4001/health > /dev/null 2>&1; then
    echo "✅ 后端服务运行正常"
else
    echo "❌ 后端服务无响应"
    echo "   请运行: cd /Users/knight/study_oasis_simple/apps/api && npm run start"
fi

# 检查前端
echo "\n📍 检查前端服务 (Port 3000)..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ 前端服务运行正常"
else
    echo "❌ 前端服务无响应"
    echo "   请运行: cd /Users/knight/study_oasis_simple/apps/web && npm run dev"
fi

# 检查关键文件
echo "\n📍 检查关键文件..."

files=(
    "/Users/knight/study_oasis_simple/apps/web/app/chat/page.tsx"
    "/Users/knight/study_oasis_simple/apps/web/app/chat/conversations/page.tsx"
    "/Users/knight/study_oasis_simple/apps/web/app/documents/page.tsx"
    "/Users/knight/study_oasis_simple/apps/web/app/dashboard/page.tsx"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $(basename $file) 存在"
    else
        echo "❌ $(basename $file) 不存在"
    fi
done

# 测试 API 端点
echo "\n📍 测试 API 端点..."

# 测试聊天 API
echo "   测试 POST /chat..."
response=$(curl -s -X POST http://localhost:4001/chat \
    -H "Content-Type: application/json" \
    -d '{"message":"测试消息"}' 2>&1)

if echo "$response" | grep -q "reply"; then
    echo "✅ /chat 端点正常"
else
    echo "⚠️  /chat 端点返回异常"
fi

echo "\n========================================\n"
echo "✅ 验证完成！\n"
echo "📌 访问地址："
echo "   • 前端主页: http://localhost:3000"
echo "   • 对话页面: http://localhost:3000/chat"
echo "   • 对话列表: http://localhost:3000/chat/conversations"
echo "   • 文档管理: http://localhost:3000/documents"
echo "   • 仪表盘: http://localhost:3000/dashboard"
echo "   • 后端 API: http://localhost:4001"
