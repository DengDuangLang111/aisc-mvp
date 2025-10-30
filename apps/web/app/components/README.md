# 共享组件库

本文件夹包含应用中可复用的 UI 组件。

## 设计原则

1. **可复用性**: 所有组件设计为通用组件
2. **可配置性**: 通过 props 支持多种样式和行为
3. **类型安全**: 使用 TypeScript 确保类型安全
4. **可访问性**: 遵循 WCAG 无障碍标准

## 组件列表

### Button (按钮)
通用按钮组件，支持多种样式和状态。

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' - 按钮样式
- `size`: 'sm' | 'md' | 'lg' - 按钮尺寸
- `disabled`: boolean - 禁用状态
- `loading`: boolean - 加载状态
- `children`: ReactNode - 按钮内容
- `onClick`: () => void - 点击事件

**使用示例:**
```tsx
import { Button } from '@/app/components/Button'

<Button variant="primary" size="md" onClick={() => console.log('clicked')}>
  提交
</Button>
```

### Card (卡片)
内容容器组件，用于组织和展示相关内容。

**Props:**
- `title`: string - 卡片标题（可选）
- `children`: ReactNode - 卡片内容
- `className`: string - 额外的 CSS 类名

**使用示例:**
```tsx
import { Card } from '@/app/components/Card'

<Card title="文件上传">
  <p>拖拽文件到这里上传</p>
</Card>
```

### Layout (布局)
页面布局组件，提供一致的页面结构。

**Props:**
- `children`: ReactNode - 页面内容
- `maxWidth`: 'sm' | 'md' | 'lg' | 'xl' | 'full' - 最大宽度
- `centered`: boolean - 是否居中

**使用示例:**
```tsx
import { Layout } from '@/app/components/Layout'

<Layout maxWidth="lg" centered>
  <h1>页面标题</h1>
  <p>页面内容</p>
</Layout>
```

## 样式约定

### 配色方案
遵循 Tailwind CSS 默认配色，主要使用：
- Primary: `blue-600` (#3b82f6)
- Secondary: `gray-600` (#4b5563)
- Success: `green-500` (#10b981)
- Warning: `yellow-500` (#f59e0b)
- Error: `red-500` (#ef4444)

### 间距
- `sm`: 0.5rem (8px)
- `md`: 1rem (16px)
- `lg`: 1.5rem (24px)
- `xl`: 2rem (32px)

### 圆角
- `sm`: 0.25rem (4px)
- `md`: 0.5rem (8px)
- `lg`: 0.75rem (12px)

## 测试

每个组件都应该有对应的测试文件：
```
components/
├── Button.tsx
├── Button.test.tsx
├── Card.tsx
├── Card.test.tsx
└── ...
```

运行测试：
```bash
pnpm test
```

## 开发规范

1. **组件导出**: 使用命名导出
2. **Props 类型**: 定义在组件文件顶部
3. **默认 Props**: 使用解构赋值提供默认值
4. **样式**: 使用 Tailwind CSS 类名

## 更新日志

### 2025-10-29
- ✅ 创建组件库文档
- ⏳ 实现 Button 组件
- ⏳ 实现 Card 组件
- ⏳ 实现 Layout 组件
