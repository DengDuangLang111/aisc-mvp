# 前端组件重构文档

## 概述

本文档描述了 Study Oasis 项目前端的组件架构重构，包括 Chat 页面和 Upload 页面的模块化改造。

## 重构目标

- ✅ 减少单个文件的代码行数（目标：每个主页面文件 < 100 行）
- ✅ 提高代码可维护性和可测试性
- ✅ 实现关注点分离（UI 与逻辑分离）
- ✅ 提升代码复用性

## 重构成果

### 代码行数优化

| 页面 | 重构前 | 重构后 | 减少 | 优化率 |
|------|--------|--------|------|--------|
| settings/page.tsx | 321 行 | 64 行 | -257 行 | -80% |
| chat/page.tsx | 235 行 | 56 行 | -179 行 | -76% |
| upload/page.tsx | 282 行 | 51 行 | -231 行 | -82% |
| **总计** | **838 行** | **171 行** | **-667 行** | **-80%** |

---

## Chat 页面架构

### 文件结构

```
app/chat/
├── page.tsx                    # 主页面 (56 行)
├── components/
│   ├── ChatHeader.tsx          # 头部组件
│   ├── ChatError.tsx           # 错误提示组件
│   ├── ChatLayout.tsx          # 主布局组件
│   ├── MessageList.tsx         # 消息列表
│   ├── MessageInput.tsx        # 输入框
│   ├── MessageBubble.tsx       # 消息气泡
│   └── DocumentViewer.tsx      # 文档查看器
└── hooks/
    └── useChatLogic.ts         # 聊天逻辑 Hook
```

### 组件说明

#### 1. ChatHeader 组件

**职责**: 显示页面标题、消息计数、操作按钮

**Props**:
```typescript
interface ChatHeaderProps {
  messageCount: number;          // 消息数量
  hasDocument: boolean;          // 是否有文档
  showDocument: boolean;         // 是否显示文档
  onClearChat: () => void;       // 清空对话回调
  onToggleDocument: () => void;  // 切换文档显示回调
}
```

**功能**:
- 显示应用标题和描述
- 显示当前消息数量
- 提供清空对话按钮（仅在有消息时显示）
- 提供切换文档显示按钮（仅在有文档时显示）

**测试覆盖**: ✅ 10 个测试用例

---

#### 2. ChatError 组件

**职责**: 统一显示错误消息

**Props**:
```typescript
interface ChatErrorProps {
  error: string | null;  // 错误消息
}
```

**功能**:
- 条件渲染（error 为 null 时不显示）
- 统一的错误样式（红色背景 + 左侧边框）

**测试覆盖**: ✅ 3 个测试用例

---

#### 3. ChatLayout 组件

**职责**: 管理聊天界面的整体布局

**Props**:
```typescript
interface ChatLayoutProps {
  messages: Message[];          // 消息列表
  isLoading: boolean;          // 加载状态
  showDocument: boolean;       // 是否显示文档
  fileUrl?: string;            // 文档 URL
  filename?: string;           // 文档文件名
  onSend: (content: string) => Promise<void>;  // 发送消息回调
}
```

**功能**:
- 左右分屏布局（文档 + 聊天）
- 响应式宽度调整
- 文档查看器条件渲染
- 消息列表和输入框组合

**特性**:
- 文档显示时：左侧文档 50% + 右侧聊天 50%
- 文档隐藏时：聊天区域占 100%

---

#### 4. useChatLogic Hook

**职责**: 管理聊天页面的所有业务逻辑

**返回值**:
```typescript
{
  messages: Message[];                      // 消息列表
  isLoading: boolean;                      // 加载状态
  error: string | null;                    // 错误信息
  showDocument: boolean;                   // 文档显示状态
  fileUrl: string | undefined;             // 文档 URL
  filename: string | null;                 // 文档文件名
  handleSend: (content: string) => Promise<void>;      // 发送消息
  handleClearChat: () => void;                         // 清空对话
  handleToggleDocument: () => void;                    // 切换文档显示
}
```

**功能**:
- 会话状态管理
- 从 URL 读取文件信息
- 从 localStorage 加载历史会话
- 保存会话到 localStorage
- 发送消息到 API
- 处理错误
- 清空对话确认

**依赖**:
- `useSearchParams`: Next.js 路由参数
- `ApiClient`: API 调用
- `ChatStorage`: 本地存储

---

## Upload 页面架构

### 文件结构

```
app/upload/
├── page.tsx                    # 主页面 (51 行)
├── components/
│   ├── UploadForm.tsx          # 上传表单组件
│   ├── UploadHistory.tsx       # 上传历史组件
│   └── UploadTips.tsx          # 使用提示组件
└── hooks/
    └── useUploadLogic.ts       # 上传逻辑 Hook
```

### 组件说明

#### 1. UploadForm 组件

**职责**: 文件上传表单和结果展示

**Props**:
```typescript
interface UploadFormProps {
  uploading: boolean;                       // 上传中状态
  status: string;                          // 状态消息
  uploadedFile: {                          // 已上传文件信息
    id: string;
    filename: string;
    url: string;
  } | null;
  onUpload: (file: File) => Promise<void>; // 上传处理
  onStartChat: () => void;                 // 开始对话回调
  onFileChange: () => void;                // 文件选择变化回调
}
```

**功能**:
- 文件选择输入框
- 上传按钮（带加载状态）
- 状态消息展示（成功/失败/进行中）
- 上传成功后显示文件信息
- 开始对话按钮

**测试覆盖**: ✅ 9 个测试用例

---

#### 2. UploadHistory 组件

**职责**: 显示和管理上传历史记录

**Props**:
```typescript
interface UploadHistoryProps {
  uploadHistory: UploadRecord[];                    // 历史记录列表
  onContinueWithFile: (record: UploadRecord) => void;  // 继续学习回调
  onDeleteRecord: (id: string) => void;                // 删除记录回调
  onClearHistory: () => void;                          // 清空历史回调
}
```

**功能**:
- 显示最近 10 条上传记录
- 文件大小格式化显示（B/KB/MB）
- 时间格式化显示（刚刚/X分钟前/X小时前/X天前/具体日期）
- 继续学习按钮
- 删除单条记录按钮
- 清空所有历史按钮

**工具函数**:
- `formatFileSize(bytes)`: 格式化文件大小
- `formatDate(timestamp)`: 格式化上传时间

**测试覆盖**: ✅ 9 个测试用例

---

#### 3. UploadTips 组件

**职责**: 显示使用提示

**功能**:
- 静态展示使用说明
- 支持的文件格式
- 使用流程说明

**测试覆盖**: ✅ 3 个测试用例

---

#### 4. useUploadLogic Hook

**职责**: 管理上传页面的所有业务逻辑

**返回值**:
```typescript
{
  status: string;                                      // 状态消息
  uploading: boolean;                                  // 上传中状态
  uploadedFile: {...} | null;                         // 已上传文件
  uploadHistory: UploadRecord[];                      // 历史记录
  handleUpload: (file: File) => Promise<void>;        // 处理上传
  handleStartChat: () => void;                        // 开始对话
  handleContinueWithFile: (record) => void;           // 继续学习
  handleDeleteRecord: (id: string) => void;           // 删除记录
  handleClearHistory: () => void;                     // 清空历史
  handleFileChange: () => void;                       // 文件变化
}
```

**功能**:
- 文件上传到服务器
- 保存上传记录到 localStorage
- 管理上传历史
- 路由跳转到聊天页面
- 错误处理

**依赖**:
- `useRouter`: Next.js 路由
- `ApiClient`: API 调用
- `UploadStorage`: 本地存储

---

## 设计模式

### Container/Presentation 模式

我们采用了经典的 Container/Presentation 分离模式：

- **Container（Hooks）**: 管理状态和业务逻辑
  - `useChatLogic.ts`
  - `useUploadLogic.ts`

- **Presentation（Components）**: 纯展示组件，接收 props 并渲染 UI
  - `ChatHeader.tsx`
  - `ChatError.tsx`
  - `UploadForm.tsx`
  - `UploadHistory.tsx`
  - `UploadTips.tsx`

**优势**:
1. **可测试性**: UI 组件和逻辑分离，易于编写单元测试
2. **可复用性**: 展示组件可在不同上下文中复用
3. **可维护性**: 修改逻辑不影响 UI，修改 UI 不影响逻辑
4. **关注点分离**: 每个模块职责清晰

---

## 测试策略

### 测试覆盖率

| 组件 | 测试用例数 | 覆盖内容 |
|------|-----------|---------|
| ChatHeader | 10 | 渲染、交互、条件显示 |
| ChatError | 3 | 条件渲染、样式 |
| UploadForm | 9 | 表单交互、状态显示、样式 |
| UploadHistory | 9 | 列表渲染、格式化、交互 |
| UploadTips | 3 | 静态内容渲染 |
| **总计** | **34** | - |

### 测试类型

1. **渲染测试**: 验证组件正确渲染
2. **交互测试**: 验证用户交互触发正确的回调
3. **条件渲染测试**: 验证组件根据 props 正确显示/隐藏
4. **样式测试**: 验证不同状态下的样式类
5. **格式化测试**: 验证数据格式化函数

### 运行测试

```bash
# 运行所有测试
pnpm test

# 运行特定组件测试
pnpm test ChatHeader

# 查看测试覆盖率
pnpm test --coverage
```

---

## 最佳实践

### 1. 组件设计原则

- **单一职责**: 每个组件只做一件事
- **Props 类型安全**: 使用 TypeScript 定义清晰的接口
- **条件渲染**: 使用 early return 提升可读性
- **无状态组件**: 展示组件尽量无状态，状态由 Hook 管理

### 2. Hook 设计原则

- **关注点聚合**: 相关逻辑集中在一个 Hook 中
- **清晰的返回值**: 返回对象键名清晰明确
- **副作用管理**: 使用 useEffect 管理副作用
- **依赖项明确**: useEffect 依赖项数组清晰完整

### 3. 命名约定

- **组件文件**: PascalCase（如 `ChatHeader.tsx`）
- **Hook 文件**: camelCase with `use` 前缀（如 `useChatLogic.ts`）
- **测试文件**: `*.test.tsx`
- **Props 接口**: `<ComponentName>Props`
- **事件处理函数**: `handle<Action>`（如 `handleSend`）
- **回调 Props**: `on<Action>`（如 `onSend`）

### 4. 文件组织

```
app/<feature>/
├── page.tsx              # 主页面（入口）
├── components/           # UI 组件
│   ├── Component1.tsx
│   ├── Component1.test.tsx
│   ├── Component2.tsx
│   └── Component2.test.tsx
└── hooks/               # 业务逻辑 Hooks
    ├── useFeatureLogic.ts
    └── useFeatureLogic.test.ts
```

---

## 未来改进方向

### 短期（1-2 周）

1. ✅ 为所有新组件编写单元测试
2. ✅ 更新项目文档
3. 🔄 提升测试覆盖率到 90%+
4. 🔄 添加 Storybook 用于组件文档和可视化测试

### 中期（1-2 月）

1. 🔄 实现组件懒加载优化性能
2. 🔄 提取共享样式到 Tailwind 配置
3. 🔄 添加 E2E 测试（使用 Playwright）
4. 🔄 实现错误边界（Error Boundary）

### 长期（3+ 月）

1. 🔄 迁移到 React Server Components
2. 🔄 实现更细粒度的代码分割
3. 🔄 添加性能监控和分析
4. 🔄 优化移动端体验

---

## 相关资源

### 文档
- [Next.js 官方文档](https://nextjs.org/docs)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Tailwind CSS](https://tailwindcss.com/docs)

### 内部文档
- [API 接口文档](../../../docs/API_DOCUMENTATION.md)
- [数据存储设计](../../../docs/STORAGE_DESIGN.md)
- [项目架构](../../../docs/ARCHITECTURE.md)

---

## 变更日志

### 2025-11-02
- ✅ 完成 Chat 页面重构（235 行 → 56 行）
- ✅ 完成 Upload 页面重构（282 行 → 51 行）
- ✅ 添加 34 个组件单元测试
- ✅ 创建组件文档

### 2025-10-28
- ✅ 完成 Settings 页面重构（321 行 → 64 行）
- ✅ 提取 StatsCard、DataManagementCard 等组件

---

## 联系方式

如有问题或建议，请联系开发团队或提交 Issue。
