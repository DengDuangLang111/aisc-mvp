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

## 待实现功能

### 下一步: AI Chatbot 多轮对话
- [ ] 设计对话数据结构 (Zod schemas)
- [ ] 实现 POST /chat 端点
- [ ] 多轮对话上下文管理
- [ ] 渐进式提示系统 (hintLevel 1→2→3)
- [ ] 创建聊天界面 UI
- [ ] 集成文件上传和对话功能
