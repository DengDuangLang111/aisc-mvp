# AI API 接入准备工作

## 📋 目录
1. [技术选型](#技术选型)
2. [后端准备工作](#后端准备工作)
3. [前端准备工作](#前端准备工作)
4. [环境配置](#环境配置)
5. [测试计划](#测试计划)
6. [安全考虑](#安全考虑)
7. [成本控制](#成本控制)

---

## 🎯 技术选型

### 推荐方案 1: OpenAI API (GPT-4 / GPT-3.5-turbo)
- **优点**: 
  - 强大的理解能力和推理能力
  - 中文支持良好
  - 文档完善，社区活跃
  - 支持函数调用（Function Calling）
  - 支持流式响应（Streaming）
- **缺点**: 
  - 需要科学上网（国内访问受限）
  - 价格相对较高
- **适合场景**: 需要高质量回答的教育场景

### 推荐方案 2: 智谱 AI (ChatGLM-4)
- **优点**: 
  - 国产大模型，无需科学上网
  - 中文能力强
  - 价格相对便宜
  - API 兼容 OpenAI 格式
- **缺点**: 
  - 推理能力略逊于 GPT-4
- **适合场景**: 国内用户，中文为主

### 推荐方案 3: Claude (Anthropic)
- **优点**: 
  - 擅长长文本理解
  - 安全性高，拒绝回答作业答案
  - 推理能力强
- **缺点**: 
  - 国内访问受限
  - 价格较高
- **适合场景**: 需要分析长文档的场景

### 🎯 推荐选择: 智谱 AI (GLM-4)
- 理由：国内可直接访问，性价比高，中文能力强，适合教育场景

---

## 🔧 后端准备工作

### 1. 安装依赖包

```bash
cd apps/api
pnpm add openai  # 使用官方 OpenAI SDK（智谱 AI 兼容）
pnpm add @nestjs/config  # 环境变量管理
pnpm add -D @types/node
```

### 2. 环境变量配置

创建 `.env` 文件：
```env
# AI API 配置
AI_API_KEY=your_api_key_here
AI_API_BASE_URL=https://open.bigmodel.cn/api/paas/v4  # 智谱 AI
AI_MODEL=glm-4  # 或 glm-4-flash（更快更便宜）

# 或使用 OpenAI
# AI_API_BASE_URL=https://api.openai.com/v1
# AI_MODEL=gpt-4-turbo-preview

# 文件存储配置
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# 应用配置
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

创建 `.env.example` 模板：
```env
AI_API_KEY=
AI_API_BASE_URL=
AI_MODEL=
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
PORT=4000
CORS_ORIGIN=http://localhost:3000
```

### 3. 创建 AI 服务模块

**文件结构**:
```
apps/api/src/
├── ai/
│   ├── ai.module.ts
│   ├── ai.service.ts
│   └── ai.types.ts
├── chat/
│   ├── chat.controller.ts
│   ├── chat.service.ts  # 需要重构
│   ├── chat.module.ts
│   └── chat.types.ts
└── upload/
    ├── upload.controller.ts
    ├── upload.service.ts  # 需要实现文档解析
    └── upload.module.ts
```

### 4. 实现 AI Service

**功能清单**:
- [x] 初始化 OpenAI 客户端
- [x] 实现流式响应
- [x] 实现提示词工程
- [x] 文档内容注入到对话
- [x] 渐进式提示等级控制
- [x] 错误处理和重试机制
- [x] Token 使用量统计

### 5. 实现文档解析服务

**Upload Service 需要添加**:
- [ ] PDF 文本提取（使用 `pdf-parse`）
- [ ] 图片 OCR 识别（可选，使用百度/腾讯 OCR）
- [ ] 文本文件读取
- [ ] Markdown 解析
- [ ] 文档内容缓存

**依赖包**:
```bash
pnpm add pdf-parse  # PDF 解析
pnpm add mammoth    # Word 文档解析（可选）
pnpm add xlsx       # Excel 解析（可选）
```

### 6. 实现 Chat Service 重构

**核心逻辑**:
```typescript
async chat(request: ChatRequest): Promise<ChatResponse> {
  // 1. 获取文档内容（如果有 fileId）
  const documentContent = await this.getDocumentContent(request.fileId);
  
  // 2. 构建系统提示词
  const systemPrompt = this.buildSystemPrompt(documentContent, request.hintLevel);
  
  // 3. 调用 AI API
  const messages = this.buildMessages(systemPrompt, request.conversationHistory, request.message);
  
  // 4. 获取 AI 回复
  const reply = await this.aiService.chat(messages);
  
  // 5. 计算下一次提示等级
  const nextHintLevel = this.calculateNextHintLevel(request);
  
  return { reply, hintLevel: nextHintLevel, timestamp: Date.now() };
}
```

### 7. 提示词工程

**系统提示词模板**:
```typescript
const SYSTEM_PROMPTS = {
  level1: `你是一位耐心的学习助手。当前是提示等级 1（轻度提示）。

规则：
- 不要直接给出答案
- 只提供思考方向和关键概念
- 引导学生自己思考
- 使用启发式提问

学生的文档内容：
{documentContent}

学生的问题关于上述文档，请给出轻度提示。`,

  level2: `你是一位耐心的学习助手。当前是提示等级 2（中度提示）。

规则：
- 不要直接给出答案
- 提供解题思路和步骤
- 可以举类似的例子
- 指出关键的公式或方法

学生的文档内容：
{documentContent}

学生已经尝试思考过，现在需要更具体的指导。`,

  level3: `你是一位耐心的学习助手。当前是提示等级 3（详细提示）。

规则：
- 仍然不要直接给出最终答案
- 提供非常详细的步骤分解
- 可以展示部分解题过程
- 但最后一步让学生自己完成

学生的文档内容：
{documentContent}

学生已经多次尝试，需要接近答案的详细指导，但请保留最后一步让学生思考。`,
};
```

### 8. API 路由设计

**现有**:
- `POST /chat` - 发送消息

**需要添加**:
- `GET /chat/history/:sessionId` - 获取历史对话（可选）
- `DELETE /chat/history/:sessionId` - 清除对话（可选）
- `POST /upload` - 上传文档（已有）
- `GET /uploads/:filename` - 获取文档（已有，通过静态文件）
- `POST /document/extract` - 提取文档内容（新增）

---

## 💻 前端准备工作

### 1. 环境变量配置

创建 `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 2. API 客户端封装

**创建文件**: `apps/web/lib/api-client.ts`

```typescript
// 统一的 API 客户端
export class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  }

  async chat(request: ChatRequest): Promise<ChatResponse> { }
  async uploadFile(file: File): Promise<UploadResponse> { }
  async streamChat(request: ChatRequest): AsyncGenerator<string> { }
}
```

### 3. 流式响应支持

**前端聊天页面需要添加**:
- [ ] SSE (Server-Sent Events) 接收流式数据
- [ ] 实时显示 AI 回复（打字机效果）
- [ ] 取消请求功能
- [ ] 加载状态优化

**示例代码**:
```typescript
const handleStreamChat = async (message: string) => {
  const response = await fetch('/chat/stream', {
    method: 'POST',
    body: JSON.stringify({ message }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    setMessages(prev => {
      const last = prev[prev.length - 1];
      return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
    });
  }
};
```

### 4. 错误处理增强

**需要处理的错误**:
- [ ] API 超时（30秒）
- [ ] API 限流（Rate Limit）
- [ ] Token 耗尽
- [ ] 网络错误
- [ ] 文件解析失败

**UI 提示**:
- 友好的错误提示
- 重试按钮
- 降级方案（使用缓存回复）

### 5. 用户体验优化

**加载状态**:
- [ ] 骨架屏（Skeleton）
- [ ] 打字机动画
- [ ] "正在思考..." 提示

**交互优化**:
- [ ] 消息发送后自动清空输入框
- [ ] 支持 Markdown 渲染
- [ ] 代码高亮显示
- [ ] 公式渲染（LaTeX）

### 6. 前端依赖安装

```bash
cd apps/web
pnpm add react-markdown remark-gfm  # Markdown 渲染
pnpm add react-syntax-highlighter    # 代码高亮
pnpm add katex react-katex           # 数学公式渲染
```

---

## 🔐 环境配置

### 1. Git 忽略配置

**更新 `.gitignore`**:
```gitignore
# 环境变量
.env
.env.local
.env*.local

# API Keys
apps/api/.env
apps/web/.env.local

# 上传文件
uploads/
apps/api/uploads/

# 日志
*.log
npm-debug.log*
```

### 2. 环境变量管理

**开发环境**:
- `.env.development` - 开发环境配置
- `.env.local` - 本地私密配置（不提交）

**生产环境**:
- 使用 Vercel/Railway 等平台的环境变量管理
- 或使用 Docker secrets

### 3. 配置验证

**创建配置验证服务**:
```typescript
// apps/api/src/config/configuration.ts
export default () => ({
  ai: {
    apiKey: process.env.AI_API_KEY,
    baseUrl: process.env.AI_API_BASE_URL,
    model: process.env.AI_MODEL || 'glm-4',
  },
  app: {
    port: parseInt(process.env.PORT, 10) || 4000,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
});

// 启动时验证
if (!process.env.AI_API_KEY) {
  throw new Error('AI_API_KEY is required');
}
```

---

## 🧪 测试计划

### 1. 单元测试

**后端**:
- [x] AI Service 测试（Mock OpenAI API）
- [x] Chat Service 提示等级逻辑测试
- [x] Upload Service 文档解析测试
- [x] 提示词生成测试

**前端**:
- [x] API Client 测试
- [x] 流式响应处理测试
- [x] 错误处理测试

### 2. 集成测试

- [ ] 端到端对话流程
- [ ] 文件上传 → 解析 → 对话流程
- [ ] 渐进式提示等级切换
- [ ] 长对话测试（10+ 轮）

### 3. 性能测试

- [ ] API 响应时间（< 3秒）
- [ ] 流式响应延迟（< 500ms 首字）
- [ ] 并发请求处理（10+ 用户）
- [ ] 文件解析速度（< 5秒 for 10MB PDF）

### 4. 安全测试

- [ ] API Key 泄露检测
- [ ] 注入攻击防护
- [ ] 文件上传安全
- [ ] Rate Limiting 测试

---

## 🔒 安全考虑

### 1. API Key 安全

✅ **必须做**:
- API Key 存储在环境变量中
- 永远不要提交到 Git
- 使用 `.env.example` 作为模板
- 生产环境使用密钥管理服务

❌ **禁止**:
- 前端直接调用 AI API（会暴露 Key）
- 硬编码 API Key
- 在日志中输出 API Key

### 2. 用户输入安全

**防止注入攻击**:
- 对用户输入进行清理和验证
- 限制提示词长度（< 4000 字符）
- 过滤敏感词和恶意指令

**示例**:
```typescript
const sanitizeUserInput = (input: string): string => {
  // 移除可能的注入指令
  const dangerous = ['ignore previous instructions', 'system:', 'assistant:'];
  let cleaned = input;
  dangerous.forEach(word => {
    cleaned = cleaned.replace(new RegExp(word, 'gi'), '***');
  });
  return cleaned;
};
```

### 3. Rate Limiting

**后端限流**:
```typescript
// 使用 @nestjs/throttler
@Controller('chat')
@UseGuards(ThrottlerGuard)
export class ChatController {
  // 每个用户 10 分钟内最多 20 次请求
}
```

### 4. 文件上传安全

- 限制文件类型（白名单）
- 限制文件大小（10MB）
- 扫描恶意文件
- 使用随机文件名
- 存储在安全目录

---

## 💰 成本控制

### 1. Token 使用优化

**策略**:
- 使用更小的模型（glm-4-flash vs glm-4）
- 控制上下文长度（只保留最近 10 条消息）
- 压缩文档内容（提取关键部分）
- 缓存常见问题的回复

**Token 计算**:
```typescript
// 中文：约 1.5 字 = 1 token
// 英文：约 4 字符 = 1 token

const estimateTokens = (text: string): number => {
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 1.5 + otherChars / 4);
};
```

### 2. 成本监控

**实现使用量统计**:
```typescript
interface UsageStats {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  cost: number;  // 预估费用
}

// 记录到数据库或日志
await this.logUsage(userId, stats);
```

### 3. 价格参考（智谱 AI GLM-4）

- **输入**: ¥0.1 / 千 tokens
- **输出**: ¥0.1 / 千 tokens
- **GLM-4-Flash**: 价格减半

**预估成本**:
- 单次对话（500 tokens）: ¥0.05
- 每月 1000 次对话: ¥50
- 带文档对话（2000 tokens）: ¥0.2

---

## 📅 实施步骤

### Phase 1: 基础设施 (Day 1-2)
1. ✅ 环境变量配置
2. ✅ 安装依赖包
3. ✅ 创建 AI Service 模块
4. ✅ 实现基础 API 调用

### Phase 2: 核心功能 (Day 3-4)
1. ✅ 实现提示词工程
2. ✅ 重构 Chat Service
3. ✅ 实现文档解析
4. ✅ 前端 API 集成

### Phase 3: 优化体验 (Day 5-6)
1. ✅ 实现流式响应
2. ✅ 添加 Markdown 渲染
3. ✅ 错误处理优化
4. ✅ 加载状态优化

### Phase 4: 测试部署 (Day 7)
1. ✅ 单元测试
2. ✅ 集成测试
3. ✅ 性能测试
4. ✅ 部署到测试环境

---

## 🎯 下一步行动

### 立即开始
1. **注册 AI API**
   - 推荐：智谱 AI (https://open.bigmodel.cn/)
   - 获取 API Key
   - 充值 ¥50 测试额度

2. **创建环境配置文件**
   ```bash
   cp .env.example .env
   # 编辑 .env，填入 API Key
   ```

3. **安装依赖**
   ```bash
   cd apps/api && pnpm add openai @nestjs/config
   cd ../web && pnpm add react-markdown
   ```

### 需要决定的事项
- [ ] 选择哪个 AI 提供商？（推荐：智谱 AI）
- [ ] 是否需要流式响应？（推荐：是）
- [ ] 是否需要 OCR 识别图片？（可选）
- [ ] 是否需要保存对话历史到数据库？（可选）

---

**创建时间**: 2025年10月30日  
**文档版本**: v1.0
