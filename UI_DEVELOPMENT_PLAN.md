# UI 开发计划

## 目标
模仿提供的设计图片，创建现代化的聊天界面和文件上传界面

## 设计原则
1. **简洁现代**: 使用 Tailwind CSS 实现干净的界面
2. **响应式设计**: 支持移动端和桌面端
3. **用户友好**: 清晰的视觉反馈和状态提示
4. **一致性**: 统一的配色方案和组件风格

## 文件夹结构与文档要求

每个功能文件夹必须包含：
- `README.md`: 功能说明、组件文档、API 接口
- 组件代码
- 样式配置

```
apps/web/app/
├── README.md                    # 应用整体说明
├── chat/
│   ├── README.md               # 聊天功能文档
│   ├── page.tsx                # 聊天页面
│   └── components/             # 聊天组件
│       ├── README.md           # 组件说明
│       ├── MessageList.tsx
│       ├── MessageInput.tsx
│       └── HintLevelBadge.tsx
├── upload/
│   ├── README.md               # 上传功能文档
│   ├── page.tsx                # 上传页面
│   └── components/             # 上传组件
│       ├── README.md
│       ├── FileUploader.tsx
│       └── UploadProgress.tsx
└── components/                  # 共享组件
    ├── README.md
    ├── Button.tsx
    ├── Card.tsx
    └── Layout.tsx
```

## 开发阶段

### 阶段 1: 共享组件库 (30分钟)
- [ ] 创建 `components/` 文件夹
- [ ] Button 组件 (主按钮、次按钮、图标按钮)
- [ ] Card 组件 (内容卡片)
- [ ] Layout 组件 (页面布局)
- [ ] 编写组件 README

### 阶段 2: 聊天界面 (1小时)
- [ ] 聊天页面布局
- [ ] MessageList 组件 (消息列表，自动滚动)
- [ ] MessageBubble 组件 (用户/AI 消息气泡)
- [ ] MessageInput 组件 (输入框 + 发送按钮)
- [ ] HintLevelBadge 组件 (提示等级标识)
- [ ] 状态管理 (useState/useReducer)
- [ ] API 集成
- [ ] 编写 chat/README.md

### 阶段 3: 上传界面优化 (30分钟)
- [ ] 重构上传页面使用共享组件
- [ ] FileUploader 组件 (拖拽上传)
- [ ] UploadProgress 组件 (进度条)
- [ ] 成功/失败反馈
- [ ] 编写 upload/README.md

### 阶段 4: 导航和路由 (20分钟)
- [ ] 首页导航
- [ ] 页面间跳转
- [ ] URL 参数传递

## 自动化测试方案

### 测试工具选择
1. **单元测试**: Jest + React Testing Library
2. **组件测试**: Storybook (可选)
3. **E2E 测试**: Playwright
4. **类型检查**: TypeScript
5. **代码检查**: ESLint
6. **Git Hooks**: Husky + lint-staged

### 测试文件结构
```
apps/web/
├── __tests__/
│   ├── components/
│   │   ├── Button.test.tsx
│   │   └── Card.test.tsx
│   ├── chat/
│   │   └── page.test.tsx
│   └── upload/
│       └── page.test.tsx
├── e2e/
│   ├── chat.spec.ts
│   └── upload.spec.ts
└── jest.config.js
```

### CI/CD 流程
```yaml
推送代码 → GitHub Actions
  ├─ 类型检查 (tsc --noEmit)
  ├─ 代码检查 (eslint)
  ├─ 单元测试 (jest)
  ├─ E2E 测试 (playwright)
  └─ 构建验证 (next build)
```

### 本地自动测试设置

#### 1. Git Hooks (开发阶段推荐)
```bash
# pre-commit: 提交前检查
- 类型检查
- ESLint
- 格式化

# pre-push: 推送前测试
- 单元测试
- E2E 测试 (关键路径)
```

#### 2. Watch Mode (开发时)
```bash
# 终端 1: 前端开发服务器
pnpm --filter web dev

# 终端 2: 后端开发服务器
pnpm --filter api start:dev

# 终端 3: 测试监听模式
pnpm --filter web test:watch
```

## 配色方案

基于现代 UI 设计：
```css
/* 主色调 */
--primary: #3b82f6      /* 蓝色 - 主按钮、链接 */
--primary-dark: #2563eb /* 深蓝 - hover 状态 */

/* 中性色 */
--gray-50: #f9fafb
--gray-100: #f3f4f6
--gray-200: #e5e7eb
--gray-300: #d1d5db
--gray-600: #4b5563
--gray-700: #374151
--gray-900: #111827

/* 状态色 */
--success: #10b981      /* 绿色 - 成功 */
--warning: #f59e0b      /* 橙色 - 警告 */
--error: #ef4444        /* 红色 - 错误 */

/* 聊天相关 */
--user-message: #3b82f6    /* 用户消息背景 */
--ai-message: #f3f4f6      /* AI 消息背景 */
--hint-level-1: #10b981    /* Level 1 提示 */
--hint-level-2: #f59e0b    /* Level 2 提示 */
--hint-level-3: #ef4444    /* Level 3 提示 */
```

## 实现优先级

### 高优先级 (本次实现)
1. ✅ 共享组件库
2. ✅ 聊天界面完整实现
3. ✅ 基础自动化测试 (Jest + ESLint)

### 中优先级 (后续迭代)
1. 上传界面优化 (拖拽、进度条)
2. E2E 测试覆盖
3. CI/CD GitHub Actions

### 低优先级 (未来优化)
1. Storybook 组件文档
2. 性能优化
3. 国际化支持

## 开发规范

### 组件命名
- 文件名: PascalCase (e.g., `MessageList.tsx`)
- 组件名: PascalCase (e.g., `function MessageList()`)
- Props 类型: `组件名Props` (e.g., `MessageListProps`)

### 提交信息格式
```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 样式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具相关
```

### 文档更新规则
每次代码修改后：
1. 更新对应的 README.md
2. 更新 DEVELOPMENT_LOG.md (记录重要变更)
3. 更新 TEST_LOG.md (如果涉及测试)
4. Git commit 提交所有变更

## 下一步行动

1. **立即开始**: 创建共享组件库
2. **设置测试**: 配置 Jest 和 ESLint
3. **实现聊天 UI**: 完成聊天界面
4. **测试验证**: 运行测试并验证功能
5. **文档更新**: 更新所有相关文档
6. **Git 提交**: 提交并推送到 GitHub

---

**预计完成时间**: 2-3 小时
**文档更新频率**: 每个功能完成后立即更新
**测试运行频率**: 每次代码变更后自动运行
