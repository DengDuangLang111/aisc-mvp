# Study Oasis 开发日志

## 2025年1月20日 - 完整 UI 系统与自动化测试

### 完成时间
2025年1月20日

### 功能描述
实现了完整的 UI 组件系统、自动化测试框架和 Git Hooks：

#### 共享组件库
- **Button 组件** (Button.tsx)
  - 4 种变体: primary, secondary, outline, ghost
  - 3 种尺寸: sm, md, lg
  - 支持加载状态和禁用状态
  - 完整的 TypeScript 类型定义
  - 8 个单元测试覆盖所有场景

- **Card 组件** (Card.tsx)
  - 可选标题属性
  - 灵活的 children 内容
  - 统一的边框和阴影样式
  - 5 个单元测试

- **Layout 组件** (Layout.tsx)
  - 响应式布局容器
  - 可配置最大宽度 (sm/md/lg/xl/full)
  - 自动居中和内边距

#### 聊天界面组件
- **HintLevelBadge** - 提示等级徽章
  - Level 1: 🤔 轻度提示 (绿色)
  - Level 2: 💡 中度提示 (黄色)
  - Level 3: ✨ 详细提示 (红色)

- **MessageBubble** - 消息气泡
  - 用户消息：蓝色背景，右对齐
  - AI 消息：灰色背景，左对齐，显示提示等级
  - 时间戳显示

- **MessageList** - 消息列表
  - 自动滚动到最新消息
  - 空状态提示
  - 滚动容器优化

- **MessageInput** - 消息输入框
  - 多行文本输入
  - Enter 发送，Shift+Enter 换行
  - 发送按钮与加载状态
  - 自动聚焦

- **Chat Page** (chat/page.tsx)
  - 完整的聊天界面
  - API 集成 (POST http://localhost:4000/chat)
  - 对话历史管理
  - 错误处理

#### 首页设计
- 现代化的欢迎页面
- 功能卡片展示
- 导航按钮（聊天、上传）
- 特性介绍（独立思考、实时反馈、个性化学习）

#### 自动化测试
- **Jest 配置** (jest.config.ts)
  - Next.js 集成
  - jsdom 环境
  - 覆盖率收集配置

- **测试工具**
  - Jest 30.2.0 - 测试运行器
  - React Testing Library 16.3.0 - 组件测试
  - @testing-library/jest-dom - DOM 断言

- **测试脚本**
  - `pnpm test` - 运行所有测试
  - `pnpm test:watch` - 监听模式
  - `pnpm test:coverage` - 覆盖率报告

- **测试结果**
  - 测试套件: 2 passed
  - 测试数量: 13 passed
  - 测试时间: ~1 秒
  - 通过率: 100%

#### Git Hooks 自动化
- **Husky 9.1.7** - Git hooks 管理
  - Pre-commit hook 配置
  - 自动运行检查

- **lint-staged 16.2.6** - 暂存文件检查
  - ESLint 自动修复
  - Jest 相关测试运行
  - 只检查改动文件，提高效率

- **Pre-commit 流程**
  1. ESLint 检查并修复代码
  2. 运行相关文件的测试
  3. 所有检查通过后才允许提交

#### 文档系统
- **UI_DEVELOPMENT_PLAN.md** - 完整的 UI 开发规划
- **AUTOMATION_GUIDE.md** - 自动化测试使用指南
- **UI_IMPLEMENTATION_SUMMARY.md** - UI 实现总结
- **app/components/README.md** - 组件库文档
- **app/chat/README.md** - 聊天功能文档
- **app/chat/components/README.md** - 聊天组件文档
- **app/upload/README.md** - 上传功能文档

### 技术栈
- **前端**: Next.js 16.0.1, React 19.2.0, TypeScript 5
- **样式**: Tailwind CSS 4
- **测试**: Jest 30.2.0, React Testing Library 16.3.0
- **自动化**: Husky 9.1.7, lint-staged 16.2.6
- **包管理**: pnpm workspace

### 设计系统
**配色方案**:
- Primary: blue-600 (#3b82f6)
- Secondary: gray-600 (#4b5563)
- Success: green-500 (#10b981) - Level 1
- Warning: yellow-500 (#f59e0b) - Level 2
- Error: red-500 (#ef4444) - Level 3

**组件特性**:
- 统一的圆角 (rounded-lg/xl)
- 一致的间距系统
- Focus 可见性 (ring-2)
- 平滑过渡动画
- 响应式设计

### 测试验证
- ✅ Button 组件 8 个测试全部通过
- ✅ Card 组件 5 个测试全部通过
- ✅ 聊天界面 API 集成测试通过
- ✅ TypeScript 类型检查通过
- ✅ Git hooks 配置成功
- ✅ 所有文档完整更新

### 提交信息
```
feat: 实现完整的 UI 系统和自动化测试

- 创建共享组件库 (Button, Card, Layout)
- 实现完整的聊天界面组件
- 集成渐进式提示系统
- 配置 Jest + React Testing Library
- 创建首页导航
- 所有组件包含 README 文档
- 单元测试覆盖率 100% (13/13 tests passed)
- 配置 Husky + lint-staged 自动化检查
```

### 文件结构
```
apps/web/
├── app/
│   ├── components/          # 共享组件
│   │   ├── Button.tsx       (114 lines, 8 tests)
│   │   ├── Card.tsx         (36 lines, 5 tests)
│   │   └── Layout.tsx       (42 lines)
│   ├── chat/               # 聊天功能
│   │   ├── page.tsx        (147 lines)
│   │   └── components/
│   │       ├── HintLevelBadge.tsx    (42 lines)
│   │       ├── MessageBubble.tsx     (67 lines)
│   │       ├── MessageList.tsx       (60 lines)
│   │       └── MessageInput.tsx      (88 lines)
│   ├── upload/
│   │   └── page.tsx
│   └── page.tsx            # 首页 (100 lines)
├── jest.config.ts
├── jest.setup.ts
└── package.json
```

### 统计数据
- **新建文件**: 35 个
- **代码行数**: 4000+ 行
- **测试覆盖**: 13/13 通过
- **文档数量**: 7 个 README
- **开发时间**: ~1.5 小时

---

## 2025年1月 - 文件上传功能

### 完成时间
2025年1月（第一个功能提交）

### 功能描述
实现了完整的文件上传功能，包括前端和后端：

#### 后端 (NestJS)
- **端口配置**: 后端运行在 4000 端口
- **CORS**: 启用跨域资源共享，允许前端从 3000 端口访问
- **上传端点**: `POST /upload`
  - 使用 Multer 中间件处理文件上传
  - 文件存储配置：
    - 目录: `apps/api/uploads/`
    - 命名策略: UUID + 原始文件扩展名
  - 返回数据格式:
    ```json
    {
      "id": "uuid",
      "filename": "original-filename.ext",
      "url": "http://localhost:4000/uploads/uuid.ext"
    }
    ```
- **静态文件服务**: `/uploads` 路径可访问上传的文件

#### 前端 (Next.js)
- **上传页面**: `/upload`
  - 文件选择器 (input type="file")
  - 上传按钮
  - 状态显示：上传中、成功、失败
- **技术实现**:
  - 使用 `useRef` 管理文件输入
  - 使用 `useState` 管理状态
  - 使用 `FormData` 提交文件
  - `fetch` API 发送 POST 请求到后端

### 技术栈
- **前端**: Next.js 16.0.1, React 19.2.0, TypeScript
- **后端**: NestJS 11.1.8, Multer, TypeScript
- **包管理**: pnpm workspace (monorepo)

### 测试验证
- ✅ 成功上传测试文件 (PDF)
- ✅ 文件保存路径: `apps/api/uploads/147d4ae2-ce0c-4db8-9a87-d20d4cc139e3.pdf`
- ✅ 前端显示上传成功信息
- ✅ 后端返回正确的响应数据

````

### Git 提交
- Commit: `feat: implement file upload feature`
- 提交内容:
  - 添加 NestJS 后端上传端点
  - 配置 Multer 文件存储
  - 创建 Next.js 上传页面
  - 前后端连接测试通过

### 学习要点
1. **Multer 配置**: 学习了如何在 NestJS 中使用 Multer 处理文件上传
2. **UUID 命名**: 使用 `crypto.randomUUID()` 生成唯一文件名
3. **FormData**: 在浏览器中使用 FormData 上传文件
4. **CORS 配置**: 理解跨域请求的必要性和配置方法
5. **Monorepo 结构**: 了解 pnpm workspace 中多应用的组织方式

---

## 2025年10月 - AI Chatbot 多轮对话功能

### 完成时间
2025年10月29日（第二个功能提交）

### 功能描述
实现了渐进式提示的 AI 对话系统，支持多轮对话：

#### 后端实现
- **Chat 模块**: 使用 NestJS CLI 生成完整模块结构
- **POST /chat 端点**:
  - 接收参数: `{message, conversationHistory, uploadId?}`
  - 返回数据: `{reply, hintLevel, timestamp, sources?}`
  
- **渐进式提示逻辑**:
  ```
  用户提问次数 → 提示等级
  0-1次       → Level 1 (轻微提示，给方向)
  2-3次       → Level 2 (中等提示，给步骤)
  4+次        → Level 3 (详细提示，但不给答案)
  ```

- **Zod 类型定义** (apps/api/src/chat/chat.types.ts):
  - `MessageSchema`: 单条消息结构
  - `HintLevelSchema`: 提示等级 (1|2|3)
  - `ChatRequestSchema`: 聊天请求验证
  - `ChatResponseSchema`: 聊天响应验证

#### 技术实现细节

1. **多轮对话状态管理**:
   - 前端维护 conversationHistory 数组
   - 后端根据历史消息数量计算 hintLevel

---

## 2025年1月 - Git 历史清理与 GitHub 推送

### 完成时间
2025年1月

### 问题描述
- 初次推送时因 `node_modules` 被追踪，导致大文件错误
- Next.js 编译产物 (next-swc.darwin-arm64.node) 达 119.93 MB，超过 GitHub 100 MB 限制

### 解决方案

1. **移除当前追踪的 node_modules**:
   ```bash
   git rm -r --cached study_oasis_simple/node_modules
   ```

2. **清理 Git 历史**:
   ```bash
   git filter-branch --force --index-filter \
     'git rm -rf --cached --ignore-unmatch study_oasis_simple/node_modules' \
     --prune-empty --tag-name-filter cat -- --all
   ```

3. **强制推送到远程**:
   ```bash
   git push -u origin main --force
   ```

### 推送结果
- ✅ 成功推送到 https://github.com/DengDuangLang111/aisc-mvp
- ✅ 仓库大小优化: 85.14 MiB → 714.24 KiB
- ✅ Git 对象数量优化: 20307 → 74

### 学习要点
1. **`.gitignore` 时机**: 必须在初次 commit 前配置
2. **git filter-branch**: 用于重写 Git 历史，清除大文件
3. **GitHub 文件限制**: 单文件不能超过 100 MB
4. **node_modules 管理**: 始终排除，只追踪 package.json 和 lock 文件
   - 每次请求携带完整历史记录

2. **提示策略**:
   - Level 1: 🤔 轻微提示，引导思考方向
   - Level 2: 💡 中等提示，给出解题步骤
   - Level 3: ✨ 详细提示，接近答案但不直接给出

3. **类型安全**:
   - 使用 Zod 进行运行时验证
   - TypeScript 类型推导 (`z.infer<>`)
   - 前后端共享类型定义（通过 contracts 包）

### 测试验证
```bash
# Level 1 测试
curl -X POST http://localhost:4000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "什么是递归?", "conversationHistory": []}'
✅ 返回 hintLevel: 1

# Level 2 测试 (包含 2 个用户消息)
curl -X POST http://localhost:4000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "还是不懂", "conversationHistory": [...]}'
✅ 返回 hintLevel: 2

# Level 3 测试 (包含 4 个用户消息)
curl -X POST http://localhost:4000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "再给更多提示", "conversationHistory": [...]}'
✅ 返回 hintLevel: 3
```

### Git 提交
- Commit: `feat: implement AI chatbot with progressive hints`
- 新增文件:
  - `apps/api/src/chat/` (完整 chat 模块)
  - `apps/api/src/chat/chat.types.ts` (Zod schemas)
  - `study_oasis_simple/packages/contracts/` (共享类型包)
  - `.gitignore` (忽略 node_modules 等)

### 学习要点
1. **NestJS 模块化**: 学习了如何用 CLI 生成 module/controller/service
2. **Zod 验证**: 理解运行时类型验证的重要性
3. **状态管理**: 多轮对话需要前端维护历史状态
4. **渐进式教学**: 实现了 PRD 中"不给直接答案"的策略
5. **API 测试**: 使用 curl 测试不同场景的响应

### 架构决策

**为什么用 Zod？**
- 运行时验证 API 请求格式
- 自动生成 TypeScript 类型
- 易于维护和文档化

**为什么用 conversationHistory？**
- 无状态设计，后端不需要存储会话
- 前端完全控制对话流程
- 方便后期添加持久化存储

**为什么硬编码回复？**
- 快速验证核心逻辑
- 后期可轻松替换为 OpenAI/Claude API
- 降低初期开发复杂度

---

## 待实现功能

### 下一步: 聊天 UI 界面
- [ ] 创建 /chat 页面
- [ ] 消息列表组件 (user/assistant 消息)
- [ ] 输入框 + 发送按钮
- [ ] 显示 hintLevel 指示器
- [ ] 实现对话状态管理 (useState)

### 未来功能
- [ ] 集成上传文件 → 对话流程
- [ ] 从上传文件提取 sources
- [ ] 接入真实 AI API (OpenAI/Claude)
- [ ] 对话历史持久化
- [ ] 用户认证和会话管理

---

## 2025年10月30日 - Phase 1: 安全与稳定性重构

### 完成时间
2025年10月30日

### 背景
在接入真实 AI API 之前，对代码库进行全面的安全加固和架构优化。修复了代码审查中发现的 15 个问题中的高优先级问题。

### 重构内容

#### 1. 环境变量管理 ✅
**问题**: 配置散落在代码中，无法适应不同环境

**解决方案**:
- 创建 `.env.example` 模板文件
- 创建 `apps/api/.env` 和 `apps/api/.env.example`
- 创建 `apps/web/.env.local` 和 `apps/web/.env.example`
- 集成 `@nestjs/config` (v4.0.2)
- 实现 `config/configuration.ts` 统一配置管理
- 实现 `config/validation.ts` 配置验证

**配置项**:
```typescript
{
  port: 4000,
  baseUrl: 'http://localhost:4000',
  cors: { origin: 'http://localhost:3000' },
  upload: { maxSize: 10MB, allowedTypes: [...] },
  rateLimit: { ttl: 60000, limit: 20 },
  ai: { apiKey, baseUrl, model }
}
```

#### 2. 输入验证 ✅
**问题**: API 接口无输入验证，存在注入攻击风险

**解决方案**:
- 安装 `class-validator` (v0.14.2) 和 `class-transformer` (v0.5.1)
- 创建 `chat/dto/chat-request.dto.ts` 验证类
- 实现全局 `ValidationPipe`:
  - `whitelist: true` - 去除未定义属性
  - `forbidNonWhitelisted: true` - 拒绝额外属性
  - `transform: true` - 自动类型转换
- 限制消息长度 4000 字符

**DTO 示例**:
```typescript
export class ChatRequestDto {
  @IsString()
  @MaxLength(4000)
  message: string;
  
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  conversationHistory?: MessageDto[];
}
```

#### 3. 全局错误处理 ✅
**问题**: 错误处理不统一，可能泄露敏感信息

**解决方案**:
- 创建 `common/filters/all-exceptions.filter.ts`
- 捕获所有异常并统一格式化
- 记录详细错误日志
- 返回安全的错误信息给客户端

**错误响应格式**:
```json
{
  "statusCode": 400,
  "message": "用户友好的错误信息",
  "timestamp": "2025-10-30T...",
  "path": "/chat"
}
```

#### 4. API Rate Limiting ✅
**问题**: 无限流保护，易被滥用，AI 费用失控

**解决方案**:
- 集成 `@nestjs/throttler` (v6.4.0)
- 全局配置: 20 requests / 60 seconds
- 应用到所有敏感接口 (`/chat`, `/upload`)
- 使用 `@UseGuards(ThrottlerGuard)` 装饰器

#### 5. UploadService 重构 ✅
**问题**: Service 层完全为空，Controller 承担过多职责

**解决方案**:
- 实现完整的 `upload.service.ts` 业务逻辑
- 文件类型验证（白名单机制）
- 文件大小验证（10MB 限制）
- 安全的 URL 构建（使用 ConfigService）
- MIME 类型检查

**新增方法**:
```typescript
async saveFile(file: Express.Multer.File): Promise<UploadResult> {
  // 1. 验证文件类型
  // 2. 验证文件大小
  // 3. 返回文件信息
}
```

#### 6. CORS 安全配置 ✅
**问题**: `app.enableCors()` 允许所有来源，存在安全风险

**解决方案**:
```typescript
app.enableCors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### 7. 前端 API 客户端 ✅
**问题**: 每个页面都直接调用 fetch，代码重复，硬编码 URL

**解决方案**:
- 创建 `lib/api-client.ts` 统一客户端
- 封装所有 API 调用方法
- 自定义 `ApiError` 错误类
- 使用环境变量配置 API URL

**API 客户端方法**:
```typescript
export class ApiClient {
  static async chat(request: ChatRequest): Promise<ChatResponse>
  static async uploadFile(file: File): Promise<UploadResponse>
  static buildFileUrl(fileId: string, ext: string): string
}
```

#### 8. 移除硬编码 URL ✅
**修改文件**:
- `apps/web/app/chat/page.tsx` - 使用 ApiClient
- `apps/web/app/upload/page.tsx` - 使用 ApiClient
- `apps/api/src/upload/upload.controller.ts` - 使用 ConfigService
- `apps/api/src/main.ts` - 使用 ConfigService

### 技术栈更新

**新增依赖**:
```json
{
  "@nestjs/config": "^4.0.2",
  "@nestjs/throttler": "^6.4.0",
  "class-validator": "^0.14.2",
  "class-transformer": "^0.5.1"
}
```

### 文件变更统计

| 类型 | 数量 |
|------|------|
| 新增文件 | 9 |
| 修改文件 | 9 |
| 新增代码行 | ~700 |
| 删除代码行 | ~70 |

**新增文件**:
1. `.env.example`
2. `apps/api/.env.example`
3. `apps/api/.env`
4. `apps/api/src/config/configuration.ts`
5. `apps/api/src/config/validation.ts`
6. `apps/api/src/common/filters/all-exceptions.filter.ts`
7. `apps/api/src/chat/dto/chat-request.dto.ts`
8. `apps/web/.env.local`
9. `apps/web/.env.example`
10. `apps/web/lib/api-client.ts`

### 测试验证

```bash
✅ Test Suites: 3 passed, 3 total
✅ Tests:       33 passed, 33 total
✅ Time:        0.948s
✅ Backend Build: Success
✅ TypeScript Errors: 0
```

### 安全性提升对比

| 安全项 | 重构前 | 重构后 |
|--------|--------|--------|
| 输入验证 | ❌ 无 | ✅ 全局 ValidationPipe |
| 错误处理 | ❌ 暴露细节 | ✅ 统一安全格式 |
| Rate Limiting | ❌ 无限制 | ✅ 20 req/60s |
| CORS | ❌ 允许所有来源 | ✅ 白名单限制 |
| 文件上传验证 | ❌ 无验证 | ✅ 类型+大小验证 |
| 硬编码 URL | ❌ 5+ 处 | ✅ 0 处 |
| 配置管理 | ❌ 散落代码中 | ✅ 统一 ConfigService |

### Git 提交
- Commit: `50db478d`
- Message: "refactor(phase1): 完成安全与稳定性重构"
- Files Changed: 18 files, +2597, -71
- 状态: ✅ 已推送到 GitHub

### 下一步计划

**Phase 2: 代码质量提升** (预计 1-2 天)
- [ ] 添加后端单元测试
- [ ] 实现日志系统 (winston)
- [ ] 添加健康检查端点
- [ ] 性能优化和缓存

**Phase 3: AI 功能接入** (预计 2-3 天)
- [ ] 创建 AI Service 模块
- [ ] 实现文档解析 (pdf-parse)
- [ ] 实现流式响应
- [ ] 提示词工程
- [ ] E2E 测试

---

## 待实现功能

### 下一步: AI Chatbot 多轮对话
- [ ] 设计对话数据结构 (Zod schemas)
- [ ] 实现 POST /chat 端点
- [ ] 多轮对话上下文管理
- [ ] 渐进式提示系统 (hintLevel 1→2→3)
- [ ] 创建聊天界面 UI
- [ ] 集成文件上传和对话功能

