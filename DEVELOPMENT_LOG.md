# Study Oasis 开发日志

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

---

## 2025年1月 - 前端 UI 重构 (参考设计)

### 完成时间
2025年1月29日

### 功能描述
重构所有前端页面，统一设计风格，参考 Study Oasis 设计稿。

#### 设计系统
- **渐变文字**: `from-cyan-500 to-blue-500` 使用 `bg-clip-text`
- **配色方案**: 浅灰背景 (gray-50/100) + 白色卡片
- **圆角**: rounded-xl/2xl/3xl 大圆角设计
- **阴影**: shadow-xl + shadow-cyan-500/25 高亮效果
- **图标**: Emoji 快速原型 (🎯📚⚡✨🔒🤖)

#### 页面改造

**1. 首页 (apps/web/app/page.tsx)**
- ✅ 添加导航栏 (Logo + Home/Focus/Progress)
- ✅ Hero Section 两栏布局
  - 左侧: 渐变标题 "Learn independently" + CTA 按钮
  - 右侧: Quick Start 引导卡片 (3步流程)
- ✅ 统计数据展示 (MVP 时间线 2-4周, 可用性 99.5%, 响应时间 <1.5s)
- ✅ 内部路由链接到 /upload 和 /chat

**2. Chat 页面 (apps/web/app/chat/page.tsx)**
- ✅ 完整聊天界面实现
- ✅ 消息气泡样式 (用户右对齐蓝色渐变, AI左对齐白色卡片)
- ✅ Hint Level 徽章 (Level 1🤔/2💡/3✨ 彩色背景)
- ✅ 欢迎屏幕 + 示例问题快速开始
- ✅ 输入区域 (自动扩展 textarea + 拖拽发送)
- ✅ 加载状态动画 (typing dots)
- ✅ 支持 uploadId query 参数
- ✅ 自动滚动到最新消息

**3. Upload 页面 (apps/web/app/upload/page.tsx)**
- ✅ 拖拽上传 UI (Drag & Drop 虚线边框)
- ✅ 上传状态管理 (idle/uploading/success/error)
- ✅ 成功后显示文件信息卡片
- ✅ "Start Learning Session" 跳转到 /chat?uploadId=xxx
- ✅ "Upload Another" 重置功能
- ✅ 特性展示区 (Secure Storage🔒, Fast Processing⚡, AI-Ready🤖)
- ✅ 拖拽高亮效果 (border-cyan-500)

#### 技术实现

**颜色系统**:
```css
主色调: cyan-400/500/600, blue-500/600
中性色: gray-50/100/200/500/600/700/800
渐变: from-cyan-500 to-blue-500
高亮: shadow-cyan-500/25
```

**布局标准**:
- Container: max-w-5xl (Chat/Upload), max-w-7xl (Home)
- Padding: px-6 py-16/py-8
- Grid: lg:grid-cols-2 (响应式)
- Gap: gap-6/gap-12

**交互效果**:
- Hover: 颜色加深 (hover:from-cyan-600)
- 禁用状态: opacity-50 + cursor-not-allowed
- 过渡动画: transition-all duration-200
- 加载动画: animate-spin / animate-pulse

#### 文档体系
为每个页面创建完整 README.md:

1. **apps/web/app/README.md** (首页文档)
   - 设计理念与目标
   - 页面结构分解
   - 样式规范与颜色定义
   - SEO 优化建议
   - 可访问性清单

2. **apps/web/app/chat/README.md** (Chat UI 文档)
   - 组件功能概述
   - 状态管理逻辑
   - API 集成细节
   - Hint Level 渐进系统说明
   - 用户交互流程图
   - 测试用例

3. **apps/web/app/upload/README.md** (Upload 文档)
   - 上传流程图
   - 拖拽交互实现
   - 状态机设计
   - 路由跳转逻辑
   - 错误处理

### 技术栈
- **React 19.2.0**: 最新特性 (use hook, Server Components)
- **Next.js 16.0.1**: App Router + Turbopack 构建
- **Tailwind CSS 4.1.16**: 工具类优先开发
- **TypeScript 5.9.3**: 完整类型安全

### 用户体验改进

1. **统一视觉语言**: 所有页面使用相同的渐变、圆角、阴影
2. **流畅导航**: Upload成功→Chat (携带uploadId), Chat→Home
3. **状态反馈**: 加载、成功、错误清晰可见
4. **响应式设计**: 移动端自适应布局
5. **可访问性**: aria-label, keyboard navigation

### 开发过程

**顺利部分**:
- Chat UI 完整实现 (200+ lines)
- Home 页面重构成功
- 所有文档按时完成

**遇到问题**:
- Upload page 文件损坏: 在重写时出现内容合并导致语法错误 (77+ TypeScript errors)
- 解决方案: 使用 `rm -f` 强制删除后重新创建

### Git 提交
```bash
git add apps/web/app/
git commit -m "feat: UI 重构 - 统一设计风格

- 实现 Chat 界面 (多轮对话 + 渐进式提示徽章)
- 重构 Home 页面 (Hero Section + Quick Start)
- 创建 Upload 页面 (拖拽上传 + 状态管理)
- 为所有页面添加完整 README.md 文档
- 统一使用 cyan-blue 渐变设计系统"
```

### 学习要点
1. **Tailwind 渐变文字**: `bg-gradient-to-r from-x to-y bg-clip-text text-transparent`
2. **拖拽事件**: onDragEnter/Over/Leave/Drop + preventDefault()
3. **Next.js 路由**: useRouter().push(), useSearchParams()
4. **状态提升**: 父组件管理状态，子组件展示
5. **文档驱动开发**: 每个功能模块配套完整文档，便于团队协作和后期维护

---

## 2025年1月 - AI Chatbot 多轮对话功能 (后端)

### 完成时间
2025年10月29日 (实际应为2025年1月)

### 功能描述
实现了渐进式提示的 AI 对话系统后端，支持多轮对话：

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

## 待实现功能

### 下一步: AI Chatbot 多轮对话
- [ ] 设计对话数据结构 (Zod schemas)
- [ ] 实现 POST /chat 端点
- [ ] 多轮对话上下文管理
- [ ] 渐进式提示系统 (hintLevel 1→2→3)
- [ ] 创建聊天界面 UI
- [ ] 集成文件上传和对话功能
