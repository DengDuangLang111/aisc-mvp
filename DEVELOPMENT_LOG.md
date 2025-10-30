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
