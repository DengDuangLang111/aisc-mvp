#!/bin/bash

echo "🧪 测试 Study Oasis API"
echo "======================="
echo ""

# 测试 1: 健康检查
echo "1️⃣ 测试健康检查..."
response=$(curl -s http://localhost:4001/health)
if [ $? -eq 0 ]; then
    echo "✅ API 健康检查成功"
    echo "   响应: $response"
else
    echo "❌ API 健康检查失败"
    exit 1
fi
echo ""

# 测试 2: 测试文件上传 (需要一个测试文件)
echo "2️⃣ 测试文件上传..."
# 创建一个测试文本文件
echo "这是一个测试文件。Study Oasis 测试内容。" > /tmp/test-upload.txt

response=$(curl -s -X POST http://localhost:4001/upload \
  -F "file=@/tmp/test-upload.txt" \
  -H "Content-Type: multipart/form-data")

if [ $? -eq 0 ]; then
    echo "✅ 文件上传成功"
    echo "   响应: $response"
    
    # 提取 documentId (假设返回 JSON 包含此字段)
    documentId=$(echo $response | grep -o '"documentId":"[^"]*"' | cut -d'"' -f4)
    echo "   文档ID: $documentId"
else
    echo "❌ 文件上传失败"
fi
echo ""

# 测试 3: 测试 AI 对话 (不带文档)
echo "3️⃣ 测试 AI 对话 (无文档)..."
chat_response=$(curl -s -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "什么是人工智能？",
    "hintLevel": 1
  }')

if [ $? -eq 0 ]; then
    echo "✅ AI 对话成功"
    echo "   响应: ${chat_response:0:200}..."
else
    echo "❌ AI 对话失败"
fi
echo ""

# 测试 4: 测试 AI 对话 (带文档)
if [ ! -z "$documentId" ]; then
    echo "4️⃣ 测试 AI 对话 (带文档)..."
    chat_with_doc=$(curl -s -X POST http://localhost:4001/chat \
      -H "Content-Type: application/json" \
      -d "{
        \"message\": \"文档里说了什么？\",
        \"documentId\": \"$documentId\",
        \"hintLevel\": 2
      }")
    
    if [ $? -eq 0 ]; then
        echo "✅ 带文档的 AI 对话成功"
        echo "   响应: ${chat_with_doc:0:200}..."
    else
        echo "❌ 带文档的 AI 对话失败"
    fi
fi
echo ""

# 清理
rm -f /tmp/test-upload.txt

echo "✅ 测试完成！"
echo ""
echo "📊 总结:"
echo "  - API 运行在: http://localhost:4001"
echo "  - Web 运行在: http://localhost:3000"
echo "  - Swagger 文档: http://localhost:4001/api-docs"
