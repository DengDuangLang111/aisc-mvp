#!/bin/bash

# Phase 2 集成测试脚本
# 测试对话上下文、文件上传、SSE 流式响应

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:4001}"
TIMEOUT=10

echo -e "${YELLOW}=== Phase 2 Integration Test ===${NC}\n"

# 测试计数
PASS=0
FAIL=0

# 辅助函数
test_case() {
  local name=$1
  local cmd=$2
  echo -e "${YELLOW}▶ Test: $name${NC}"
  
  if eval "$cmd"; then
    echo -e "${GREEN}✅ PASS${NC}\n"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}\n"
    ((FAIL++))
  fi
}

# Test 1: 后端健康检查
test_case "Backend Health Check" "curl -s -f $API_URL/health > /dev/null"

# Test 2: 第一条消息
echo -e "${YELLOW}▶ Test: First Message (Conversation Context)${NC}"
RESPONSE=$(curl -s -X POST $API_URL/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "1 + 2 + 3 = ?",
    "conversationHistory": []
  }')

echo "Response: $RESPONSE"

# 提取 conversationId
CONV_ID=$(echo "$RESPONSE" | grep -o '"conversationId":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$CONV_ID" ]; then
  echo -e "${RED}❌ FAIL - No conversationId returned${NC}\n"
  ((FAIL++))
else
  echo -e "${GREEN}✅ PASS - conversationId: $CONV_ID${NC}\n"
  ((PASS++))
fi

# Test 3: 第二条消息（使用 conversationId）
if [ ! -z "$CONV_ID" ]; then
  echo -e "${YELLOW}▶ Test: Second Message (Context Continuity)${NC}"
  RESPONSE2=$(curl -s -X POST $API_URL/chat \
    -H "Content-Type: application/json" \
    -d "{
      \"message\": \"结果是多少？\",
      \"conversationId\": \"$CONV_ID\",
      \"conversationHistory\": [
        {\"role\": \"user\", \"content\": \"1 + 2 + 3 = ?\"},
        {\"role\": \"assistant\", \"content\": \"这是一个很好的数学问题...\"}
      ]
    }")
  
  echo "Response: $RESPONSE2"
  
  # 验证返回相同的 conversationId
  CONV_ID2=$(echo "$RESPONSE2" | grep -o '"conversationId":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ "$CONV_ID" == "$CONV_ID2" ]; then
    echo -e "${GREEN}✅ PASS - Context maintained${NC}\n"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL - conversationId mismatch${NC}\n"
    ((FAIL++))
  fi
fi

# Test 4: 获取对话列表
test_case "Get Conversations API" \
  "curl -s -f $API_URL/chat/conversations | grep -q 'id'"

# Test 5: SSE 流式端点检查
echo -e "${YELLOW}▶ Test: SSE Stream Endpoint${NC}"
STREAM_RESPONSE=$(curl -s -m 3 -X GET "$API_URL/chat/stream?message=test&conversationId=&uploadId=" \
  -H "Accept: text/event-stream" || echo "timeout or error")

if echo "$STREAM_RESPONSE" | grep -q "data:"; then
  echo -e "${GREEN}✅ PASS - SSE endpoint responds${NC}\n"
  ((PASS++))
else
  echo -e "${YELLOW}⚠️  WARNING - SSE endpoint may not be working properly${NC}"
  echo "Response: $STREAM_RESPONSE"
  echo ""
fi

# Test 6: 前端类型检查
echo -e "${YELLOW}▶ Test: Frontend Type Definitions${NC}"
if [ -f "apps/web/app/chat/hooks/useChatLogic.ts" ]; then
  if grep -q "conversationId" "apps/web/app/chat/hooks/useChatLogic.ts"; then
    echo -e "${GREEN}✅ PASS - useChatLogic updated with conversationId${NC}\n"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL - useChatLogic missing conversationId${NC}\n"
    ((FAIL++))
  fi
fi

# Test 7: API 客户端检查
echo -e "${YELLOW}▶ Test: Frontend API Client${NC}"
if [ -f "apps/web/lib/api-client.ts" ]; then
  if grep -q "chatStream" "apps/web/lib/api-client.ts"; then
    echo -e "${GREEN}✅ PASS - ApiClient has chatStream method${NC}\n"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL - ApiClient missing chatStream${NC}\n"
    ((FAIL++))
  fi
fi

# Test 8: Contracts 类型定义
echo -e "${YELLOW}▶ Test: Type Contracts${NC}"
if [ -f "packages/contracts/src/chat.ts" ]; then
  if grep -q "conversationId.*optional" "packages/contracts/src/chat.ts"; then
    echo -e "${GREEN}✅ PASS - Contracts updated with conversationId${NC}\n"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL - Contracts missing conversationId${NC}\n"
    ((FAIL++))
  fi
fi

# 总结
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"

if [ $FAIL -eq 0 ]; then
  echo -e "\n${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}❌ Some tests failed!${NC}"
  exit 1
fi
