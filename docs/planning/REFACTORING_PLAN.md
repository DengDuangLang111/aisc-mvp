# Study Oasis 项目重构计划

> **目标受众**：GitHub Copilot / AI 编程助手
> **项目状态**：Phase 3 完成（90%），代码质量评分 7.2/10
> **重构目标**：提升至 8.5/10，达到生产就绪标准

---

## 执行优先级说明

- **P0（关键）**：必须立即完成，阻塞生产部署
- **P1（重要）**：本周完成，影响代码质量
- **P2（优化）**：本月完成，提升用户体验
- **P3（增强）**：下个版本，长期规划

---

## P0：关键问题修复（预计 4 小时）

### 任务 1.1：修复失败的单元测试（13 个）

**问题诊断**：
```
13 failed, 91 passed, 104 total
主要错误：Nest can't resolve dependencies (缺少 mock providers)
```

**执行步骤**：

#### Step 1.1.1：修复 `apps/api/src/upload/upload.controller.spec.ts`
```typescript
// 问题：缺少 VisionService 的 mock
// 位置：apps/api/src/upload/upload.controller.spec.ts

// 需要添加的代码（在 beforeEach 中）：
const mockVisionService = {
  processOcr: jest.fn(),
  getOcrResult: jest.fn(),
};

// 在 TestingModule.createTestingModule() 的 providers 中添加：
{
  provide: VisionService,
  useValue: mockVisionService,
}
```

#### Step 1.1.2：修复 `apps/api/src/chat/chat.controller.spec.ts`
```typescript
// 问题：缺少 AnalyticsService 的 mock
// 位置：apps/api/src/chat/chat.controller.spec.ts

const mockAnalyticsService = {
  trackEvent: jest.fn().mockResolvedValue(undefined),
  getActiveUsers: jest.fn(),
  getEventStats: jest.fn(),
};

// 在 providers 中添加：
{
  provide: AnalyticsService,
  useValue: mockAnalyticsService,
}
```

#### Step 1.1.3：批量修复所有 spec 文件
**检查清单**：
- [ ] `upload.controller.spec.ts` - 添加 VisionService mock
- [ ] `upload.service.spec.ts` - 添加 GcsService, PrismaService mock
- [ ] `chat.controller.spec.ts` - 添加 AnalyticsService mock
- [ ] `chat.service.spec.ts` - 添加 VisionService, AnalyticsService mock
- [ ] `ocr/vision.controller.spec.ts` - 添加所有依赖 mock
- [ ] `analytics/analytics.controller.spec.ts` - 添加 PrismaService mock
- [ ] 其他失败的测试文件

**验证命令**：
```bash
cd apps/api
npm test -- --coverage
# 目标：0 failed, 104 passed
```

---

### 任务 1.2：删除备份文件和临时文件

**执行步骤**：

#### Step 1.2.1：删除 `.old.ts` 备份文件
```bash
# 检查所有备份文件
find /Users/knight/study_oasis_simple -name "*.old.ts" -type f

# 删除以下文件：
rm -f apps/api/src/chat/chat.controller.old.ts
rm -f apps/api/src/chat/chat.module.old.ts
rm -f apps/api/src/chat/chat.service.old.ts
```

#### Step 1.2.2：清理根目录临时文件
```bash
# 移动数据库相关文件到 docs/database/
mkdir -p docs/database
mv DATABASE_MIGRATION_GUIDE.md docs/database/
mv apps/api/migration.sql docs/database/
mv apps/api/supabase-init.sql docs/database/
mv apps/api/verify-tables.sql docs/database/
```

#### Step 1.2.3：更新 `.gitignore`
```bash
# 在 .gitignore 中添加：
*.old.ts
*.old.tsx
*.backup
.DS_Store
```

**验证命令**：
```bash
git status
# 确认没有 .old.ts 文件
```

---

### 任务 1.3：保护敏感文件（安全性）

#### Step 1.3.1：检查 `google-cloud-key.json` 是否在 `.gitignore` 中
```bash
# 执行命令：
grep -r "google-cloud-key.json" .gitignore

# 如果没有，添加到 apps/api/.gitignore：
echo "google-cloud-key.json" >> apps/api/.gitignore
```

#### Step 1.3.2：从 Git 历史中移除（如果已提交）
```bash
# 检查是否已提交到 Git
git log --all --full-history -- "**/google-cloud-key.json"

# 如果已提交，使用 git filter-branch 移除（谨慎操作）
# 或者简单地确保不再提交
git rm --cached apps/api/google-cloud-key.json
```

#### Step 1.3.3：添加安全提醒到 README
```markdown
## 🔒 安全注意事项

**敏感文件**（请勿提交到 Git）：
- `apps/api/.env` - 环境变量（包含 API keys）
- `apps/api/google-cloud-key.json` - Google Cloud 服务账号密钥
- `apps/web/.env.local` - 前端环境变量

**已添加到 `.gitignore`**，请确保不要使用 `git add -f` 强制添加。
```

---

## P1：重要改进（预计 2 周）

### 任务 2.1：重组文档结构

**问题**：40 个 markdown 文件散落在根目录，难以查找

**执行步骤**：

#### Step 2.1.1：创建文档目录结构
```bash
mkdir -p docs/{guides,architecture,api,development,history}
```

#### Step 2.1.2：移动文档到对应目录
```bash
# 用户指南
mv QUICK_START_GUIDE.md docs/guides/
mv README.md docs/guides/README_FULL.md  # 保留副本

# 架构文档
mv GOOGLE_CLOUD_ARCHITECTURE.md docs/architecture/
mv PHASE_3_BACKEND_REFACTORING_COMPLETE.md docs/architecture/
mv ANALYTICS_AND_TRACKING_GUIDE.md docs/architecture/

# 开发文档
mv E2E_TESTING_IMPLEMENTATION_REPORT.md docs/development/
mv THROTTLER_E2E_TESTING_REPORT.md docs/development/

# 历史记录
mv PHASE_*.md docs/history/
mv *_IMPLEMENTATION_REPORT.md docs/history/
mv *_GUIDE_*.md docs/history/
```

#### Step 2.1.3：创建精简的根目录 README
```markdown
# Study Oasis - AI 学习助手

> 基于 AI 的智能学习平台，支持文档上传、OCR 识别和智能问答

## 📚 快速链接

- [快速开始指南](docs/guides/QUICK_START_GUIDE.md)
- [项目架构](docs/architecture/)
- [API 文档](docs/api/)
- [开发指南](docs/development/)

## 🚀 快速开始

### 1. 安装依赖
```bash
pnpm install
```

### 2. 配置环境变量
```bash
# 后端配置
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env，填入真实的 API keys

# 前端配置
cp apps/web/.env.local.example apps/web/.env.local
```

### 3. 启动数据库
```bash
cd apps/api
npx prisma migrate dev
npx prisma generate
```

### 4. 启动开发服务器
```bash
# 后端（端口 4000）
cd apps/api
npm run start:dev

# 前端（端口 3000）
cd apps/web
npm run dev
```

## 🛠️ 技术栈

**后端**：NestJS 11 + TypeScript + Prisma + PostgreSQL
**前端**：Next.js 16 + React 19 + Tailwind CSS 4
**AI 服务**：DeepSeek API + Google Cloud Vision
**存储**：Google Cloud Storage

## 📖 详细文档

请查看 [docs/](docs/) 目录获取完整文档。

## 📝 License

MIT
```

---

### 任务 2.2：统一类型定义到 `packages/contracts`

**问题**：类型定义重复（`apps/api/src/chat/chat.types.ts` 和 `packages/contracts/src/chat.ts`）

**执行步骤**：

#### Step 2.2.1：合并类型定义到 `packages/contracts/src/chat.ts`
```typescript
// 文件：packages/contracts/src/chat.ts
// 添加缺失的类型：

export type HintLevel = 1 | 2 | 3;

export interface ChatResponse {
  reply: string;
  hintLevel: HintLevel;
  timestamp: number;
  conversationId?: string;
  tokensUsed?: number;
}

export interface Conversation {
  id: string;
  title: string;
  documentId?: string;
  messageCount: number;
  lastMessage: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationDetail extends Conversation {
  userId?: string;
  messages: Message[];
  document?: {
    id: string;
    filename: string;
    mimeType: string;
    ocrResult?: {
      confidence: number;
      language: string;
      pageCount: number;
    };
  };
}
```

#### Step 2.2.2：删除 `apps/api/src/chat/chat.types.ts`
```bash
rm apps/api/src/chat/chat.types.ts
```

#### Step 2.2.3：更新所有导入路径
```typescript
// 文件：apps/api/src/chat/chat.service.ts
// 将以下行：
import type { ChatResponse, HintLevel } from './chat.types';

// 替换为：
import type { ChatResponse, HintLevel } from '@study-oasis/contracts';
```

#### Step 2.2.4：添加 Upload 相关类型到 contracts
```typescript
// 文件：packages/contracts/src/upload.ts（新建）
export interface UploadResponse {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
}

export interface UploadRequest {
  file: File;
  userId?: string;
}

export interface OcrResult {
  id: string;
  documentId: string;
  fullText: string;
  confidence: number;
  language: string;
  pageCount: number;
  createdAt: string;
}
```

#### Step 2.2.5：更新 `packages/contracts/src/index.ts`
```typescript
export * from './chat';
export * from './upload';  // 新增
```

**验证命令**：
```bash
cd apps/api
npm run build
# 确保没有类型错误
```

---

### 任务 2.3：补充前端 E2E 测试（Playwright）

**问题**：前端完全缺失 E2E 测试（0 个）

**执行步骤**：

#### Step 2.3.1：安装 Playwright
```bash
cd apps/web
npm install -D @playwright/test
npx playwright install
```

#### Step 2.3.2：配置 Playwright
```typescript
// 文件：apps/web/playwright.config.ts（新建）
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### Step 2.3.3：创建测试目录和基础测试
```bash
mkdir -p apps/web/e2e
```

#### Step 2.3.4：编写核心 E2E 测试

**测试 1：上传流程**
```typescript
// 文件：apps/web/e2e/upload.spec.ts
import { test, expect } from '@playwright/test';

test.describe('文件上传功能', () => {
  test('应该能够成功上传 PDF 文件', async ({ page }) => {
    await page.goto('/upload');

    // 等待页面加载
    await expect(page.locator('h1')).toContainText('上传文档');

    // 选择文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/test.pdf');

    // 等待文件信息显示
    await expect(page.locator('.file-preview')).toBeVisible();

    // 点击上传按钮
    await page.click('button:has-text("上传")');

    // 等待上传成功提示
    await expect(page.locator('.success-message')).toBeVisible({ timeout: 10000 });
  });

  test('应该验证文件类型', async ({ page }) => {
    await page.goto('/upload');

    // 尝试上传不支持的文件类型
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/test.exe');

    // 应该显示错误提示
    await expect(page.locator('.error-message')).toContainText('不支持的文件类型');
  });

  test('应该验证文件大小', async ({ page }) => {
    await page.goto('/upload');

    // 尝试上传超大文件（需要准备测试文件）
    // 应该显示文件大小限制提示
  });
});
```

**测试 2：聊天功能**
```typescript
// 文件：apps/web/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AI 聊天功能', () => {
  test('应该能够发送消息并获得回复', async ({ page }) => {
    await page.goto('/chat');

    // 等待聊天界面加载
    await expect(page.locator('.chat-container')).toBeVisible();

    // 输入消息
    const input = page.locator('textarea[placeholder*="输入"]');
    await input.fill('你好，请介绍一下你自己');

    // 发送消息
    await page.click('button:has-text("发送")');

    // 验证用户消息显示
    await expect(page.locator('.message.user')).toContainText('你好');

    // 等待 AI 回复（最多 30 秒）
    await expect(page.locator('.message.assistant')).toBeVisible({ timeout: 30000 });
  });

  test('应该保持对话历史', async ({ page }) => {
    await page.goto('/chat');

    // 发送第一条消息
    await page.locator('textarea').fill('消息 1');
    await page.click('button:has-text("发送")');
    await expect(page.locator('.message.assistant')).toBeVisible();

    // 发送第二条消息
    await page.locator('textarea').fill('消息 2');
    await page.click('button:has-text("发送")');

    // 验证两条消息都存在
    const messages = page.locator('.message.user');
    await expect(messages).toHaveCount(2);
  });
});
```

**测试 3：文档查看器**
```typescript
// 文件：apps/web/e2e/document-viewer.spec.ts
import { test, expect } from '@playwright/test';

test.describe('文档查看器', () => {
  test('应该能够查看上传的文档', async ({ page }) => {
    // 先上传一个文档
    await page.goto('/upload');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('e2e/fixtures/test.pdf');
    await page.click('button:has-text("上传")');

    // 等待上传完成并跳转到聊天页面
    await page.waitForURL(/\/chat\?fileId=/);

    // 验证文档查看器显示
    await expect(page.locator('.document-viewer')).toBeVisible();

    // 验证文档内容加载
    await expect(page.locator('iframe, object, embed')).toBeVisible();
  });

  test('应该能够切换文档显示/隐藏', async ({ page }) => {
    await page.goto('/chat?fileId=test-id&filename=test.pdf');

    // 点击隐藏按钮
    await page.click('button:has-text("隐藏文档")');
    await expect(page.locator('.document-viewer')).not.toBeVisible();

    // 点击显示按钮
    await page.click('button:has-text("显示文档")');
    await expect(page.locator('.document-viewer')).toBeVisible();
  });
});
```

**测试 4：设置页面**
```typescript
// 文件：apps/web/e2e/settings.spec.ts
import { test, expect } from '@playwright/test';

test.describe('设置页面', () => {
  test('应该能够查看和修改设置', async ({ page }) => {
    await page.goto('/settings');

    // 验证设置项显示
    await expect(page.locator('h2:has-text("API 设置")')).toBeVisible();
    await expect(page.locator('h2:has-text("存储设置")')).toBeVisible();

    // 修改设置
    const apiUrlInput = page.locator('input[name="apiUrl"]');
    await apiUrlInput.fill('http://localhost:4000');

    // 保存设置
    await page.click('button:has-text("保存")');

    // 验证保存成功提示
    await expect(page.locator('.success')).toBeVisible();
  });

  test('应该能够清空所有数据', async ({ page }) => {
    await page.goto('/settings');

    // 点击清空数据按钮
    await page.click('button:has-text("清空所有数据")');

    // 确认对话框
    page.on('dialog', dialog => dialog.accept());

    // 验证清空成功
    await expect(page.locator('.success')).toContainText('已清空');
  });
});
```

**测试 5：导航和路由**
```typescript
// 文件：apps/web/e2e/navigation.spec.ts
import { test, expect } from '@playwright/test';

test.describe('导航功能', () => {
  test('应该能够在各页面间导航', async ({ page }) => {
    await page.goto('/');

    // 点击"上传文档"
    await page.click('a:has-text("上传文档")');
    await expect(page).toHaveURL('/upload');

    // 点击"AI 对话"
    await page.click('a:has-text("AI 对话")');
    await expect(page).toHaveURL(/\/chat/);

    // 点击"设置"
    await page.click('a:has-text("设置")');
    await expect(page).toHaveURL('/settings');
  });
});
```

#### Step 2.3.5：创建测试 fixtures
```bash
mkdir -p apps/web/e2e/fixtures
# 准备测试文件：
# - test.pdf (小型 PDF 文件)
# - test.exe (用于验证文件类型检查)
# - large-file.pdf (用于验证文件大小限制)
```

#### Step 2.3.6：更新 `package.json` 添加测试脚本
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug"
  }
}
```

**验证命令**：
```bash
cd apps/web
npm run test:e2e
# 目标：至少 5 个测试通过
```

---

### 任务 2.4：提升后端测试覆盖率（60% → 80%）

**当前状态**：42.87% 覆盖率

**执行步骤**：

#### Step 2.4.1：识别未覆盖的代码
```bash
cd apps/api
npm test -- --coverage
# 查看覆盖率报告：coverage/lcov-report/index.html
```

#### Step 2.4.2：补充 Service 层测试

**优先补充的文件**：
1. `chat.service.spec.ts` - 增加以下测试：
   - ✅ DeepSeek API 调用成功
   - ✅ DeepSeek API 调用失败（Fallback）
   - ✅ 对话历史加载
   - ✅ 文档上下文集成
   - ✅ 提示等级计算
   - ✅ 对话删除

2. `upload.service.spec.ts` - 增加以下测试：
   - ✅ 文件类型黑名单验证
   - ✅ 魔数检测
   - ✅ 文件名清理（路径遍历防护）
   - ✅ GCS 上传成功/失败
   - ✅ 本地存储 Fallback

3. `analytics.service.spec.ts` - 增加以下测试：
   - ✅ 活跃用户统计
   - ✅ 事件统计
   - ✅ API 错误率计算
   - ✅ 成本估算（OCR + DeepSeek）
   - ✅ 用户留存率

#### Step 2.4.3：补充 Controller 层测试

**示例：chat.controller.spec.ts**
```typescript
describe('ChatController', () => {
  it('POST /chat - 应该成功处理聊天请求', async () => {
    const dto: ChatRequestDto = {
      message: '你好',
      userId: 'user-1',
    };

    const response = await request(app.getHttpServer())
      .post('/chat')
      .send(dto)
      .expect(201);

    expect(response.body).toHaveProperty('reply');
    expect(response.body).toHaveProperty('hintLevel');
    expect(response.body).toHaveProperty('conversationId');
  });

  it('POST /chat - 应该验证请求体', async () => {
    await request(app.getHttpServer())
      .post('/chat')
      .send({})
      .expect(400);
  });

  it('GET /conversations - 应该返回对话列表', async () => {
    const response = await request(app.getHttpServer())
      .get('/conversations')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

#### Step 2.4.4：补充边界情况测试

**关键测试场景**：
- 空输入处理
- 超大输入处理（文件大小、消息长度）
- 并发请求处理
- 数据库连接失败
- 外部 API 超时
- 无效的 fileId/conversationId

**验证命令**：
```bash
cd apps/api
npm test -- --coverage
# 目标：覆盖率 > 80%
```

---

### 任务 2.5：拆分大型组件

**问题**：
- `apps/web/app/settings/page.tsx` - 321 行
- `apps/web/app/upload/page.tsx` - 282 行

**执行步骤**：

#### Step 2.5.1：拆分 `settings/page.tsx`

**创建子组件**：

```typescript
// 文件：apps/web/app/settings/components/ApiSettings.tsx
export function ApiSettings() {
  // API 设置相关逻辑
}

// 文件：apps/web/app/settings/components/StorageSettings.tsx
export function StorageSettings() {
  // 存储设置相关逻辑
}

// 文件：apps/web/app/settings/components/DangerZone.tsx
export function DangerZone() {
  // 危险操作（清空数据等）
}
```

**提取自定义 hooks**：

```typescript
// 文件：apps/web/app/settings/hooks/useSettings.ts
export function useSettings() {
  const [config, setConfig] = useState(ConfigStorage.getConfig());

  const saveConfig = (newConfig: Config) => {
    ConfigStorage.setConfig(newConfig);
    setConfig(newConfig);
  };

  return { config, saveConfig };
}

// 文件：apps/web/app/settings/hooks/useStorageInfo.ts
export function useStorageInfo() {
  const [info, setInfo] = useState(StorageUtils.getStorageInfo());

  const refresh = () => {
    setInfo(StorageUtils.getStorageInfo());
  };

  return { info, refresh };
}
```

**重构后的 `settings/page.tsx`**：
```typescript
'use client'

import { ApiSettings } from './components/ApiSettings'
import { StorageSettings } from './components/StorageSettings'
import { DangerZone } from './components/DangerZone'

export default function SettingsPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">设置</h1>

      <div className="space-y-6">
        <ApiSettings />
        <StorageSettings />
        <DangerZone />
      </div>
    </div>
  )
}
```

#### Step 2.5.2：拆分 `upload/page.tsx`

**创建子组件**：

```typescript
// 文件：apps/web/app/upload/components/FileSelector.tsx
export function FileSelector({ onFileSelect }: Props) {
  // 文件选择逻辑
}

// 文件：apps/web/app/upload/components/FilePreview.tsx
export function FilePreview({ file }: Props) {
  // 文件预览
}

// 文件：apps/web/app/upload/components/UploadProgress.tsx
export function UploadProgress({ progress }: Props) {
  // 上传进度条
}

// 文件：apps/web/app/upload/components/UploadHistory.tsx
export function UploadHistory() {
  // 上传历史记录
}
```

**提取自定义 hooks**：

```typescript
// 文件：apps/web/app/upload/hooks/useFileUpload.ts
export function useFileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (selectedFile: File) => {
    // ... 上传逻辑
  };

  return { file, setFile, uploading, progress, error, uploadFile };
}

// 文件：apps/web/app/upload/hooks/useUploadHistory.ts
export function useUploadHistory() {
  const [history, setHistory] = useState(UploadStorage.getHistory());

  const refresh = () => {
    setHistory(UploadStorage.getHistory());
  };

  return { history, refresh };
}
```

**重构后的 `upload/page.tsx`**：
```typescript
'use client'

import { FileSelector } from './components/FileSelector'
import { FilePreview } from './components/FilePreview'
import { UploadProgress } from './components/UploadProgress'
import { UploadHistory } from './components/UploadHistory'
import { useFileUpload } from './hooks/useFileUpload'

export default function UploadPage() {
  const { file, setFile, uploading, progress, uploadFile } = useFileUpload();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">上传文档</h1>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <FileSelector onFileSelect={setFile} />
          {file && <FilePreview file={file} />}
          {uploading && <UploadProgress progress={progress} />}
        </div>

        <div>
          <UploadHistory />
        </div>
      </div>
    </div>
  )
}
```

**验证命令**：
```bash
cd apps/web
npm run build
# 确保没有类型错误和构建错误
```

---

## P2：性能与安全优化（预计 1 周）

### 任务 3.1：强化安全配置

#### Step 3.1.1：添加 Helmet 中间件
```bash
cd apps/api
npm install helmet
```

```typescript
// 文件：apps/api/src/main.ts
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 添加 Helmet 安全头
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));

  // ...
}
```

#### Step 3.1.2：强化 CORS 配置
```typescript
// 文件：apps/api/src/main.ts

app.enableCors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### Step 3.1.3：添加 Rate Limiting（已配置，但需验证）
```typescript
// 文件：apps/api/src/main.ts

import { ThrottlerGuard } from '@nestjs/throttler';

// 在 AppModule 中全局启用
providers: [
  {
    provide: APP_GUARD,
    useClass: ThrottlerGuard,
  },
],
```

#### Step 3.1.4：添加日志脱敏
```typescript
// 文件：apps/api/src/common/utils/log-sanitizer.ts（新建）

export function sanitizeLog(data: any): any {
  const SENSITIVE_FIELDS = [
    'password',
    'apiKey',
    'token',
    'secret',
    'authorization',
    'DEEPSEEK_API_KEY',
    'GOOGLE_CLOUD_KEY',
  ];

  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key in sanitized) {
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLog(sanitized[key]);
    }
  }

  return sanitized;
}
```

```typescript
// 在 ChatService、UploadService 等使用
this.logger.log('info', 'Processing request', sanitizeLog({
  context: 'ChatService',
  userId,
  // ... 其他数据
}));
```

---

### 任务 3.2：性能优化

#### Step 3.2.1：添加分页功能
```typescript
// 文件：apps/api/src/chat/dto/get-conversations.dto.ts（新建）

import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class GetConversationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  userId?: string;
}
```

```typescript
// 文件：apps/api/src/chat/chat.service.ts
// 更新 getConversations 方法

async getConversations(dto: GetConversationsDto): Promise<{
  data: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const { page = 1, limit = 20, userId } = dto;
  const skip = (page - 1) * limit;

  const [conversations, total] = await Promise.all([
    this.prisma.conversation.findMany({
      where: userId ? { userId } : undefined,
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.conversation.count({
      where: userId ? { userId } : undefined,
    }),
  ]);

  return {
    data: conversations.map(/* ... */),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

#### Step 3.2.2：优化文档上下文截断
```typescript
// 文件：apps/api/src/common/utils/text-truncate.ts（新建）

/**
 * 智能截断文档内容（保留完整句子）
 */
export function truncateDocument(text: string, maxLength: number = 4000): string {
  if (text.length <= maxLength) {
    return text;
  }

  // 截断到最大长度
  let truncated = text.slice(0, maxLength);

  // 尝试在句子边界截断（中文句号、英文句号、问号、感叹号）
  const sentenceEndings = /[。.!?！？]/g;
  const matches = [...truncated.matchAll(sentenceEndings)];

  if (matches.length > 0) {
    const lastMatch = matches[matches.length - 1];
    truncated = text.slice(0, lastMatch.index! + 1);
  }

  return truncated;
}
```

```typescript
// 在 ChatService 中使用
import { truncateDocument } from '../common/utils/text-truncate';

messages.push({
  role: 'system',
  content: `以下是用户上传的文档内容：\n\n${truncateDocument(documentContext, 4000)}`,
});
```

#### Step 3.2.3：前端添加虚拟滚动（react-window）
```bash
cd apps/web
npm install react-window
npm install -D @types/react-window
```

```typescript
// 文件：apps/web/app/chat/components/MessageList.tsx
// 为长消息列表添加虚拟滚动

import { FixedSizeList as List } from 'react-window';

export function MessageList({ messages }: Props) {
  const Row = ({ index, style }: any) => (
    <div style={style}>
      <MessageBubble message={messages[index]} />
    </div>
  );

  return (
    <List
      height={600}
      itemCount={messages.length}
      itemSize={100}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

---

## P3：长期增强（下个版本）

### 任务 4.1：添加 Docker 支持

#### Step 4.1.1：创建 Dockerfile

**后端 Dockerfile**：
```dockerfile
# 文件：apps/api/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 生成 Prisma Client
RUN cd apps/api && npx prisma generate

# 构建
RUN cd apps/api && pnpm build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma

EXPOSE 4000

CMD ["node", "dist/main.js"]
```

**前端 Dockerfile**：
```dockerfile
# 文件：apps/web/Dockerfile

FROM node:20-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/contracts/package.json ./packages/contracts/

RUN pnpm install --frozen-lockfile

COPY . .

RUN cd apps/web && pnpm build

FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY --from=builder /app/apps/web/.next ./.next
COPY --from=builder /app/apps/web/public ./public
COPY --from=builder /app/apps/web/package.json ./
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["pnpm", "start"]
```

#### Step 4.1.2：创建 docker-compose.yml
```yaml
# 文件：docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: study_oasis
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/study_oasis
      DEEPSEEK_API_KEY: ${DEEPSEEK_API_KEY}
      GOOGLE_CLOUD_PROJECT_ID: ${GOOGLE_CLOUD_PROJECT_ID}
      GCS_BUCKET_NAME: ${GCS_BUCKET_NAME}
    depends_on:
      - postgres
    volumes:
      - ./apps/api/google-cloud-key.json:/app/google-cloud-key.json:ro

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:4000
    depends_on:
      - api

volumes:
  postgres_data:
```

#### Step 4.1.3：添加 `.dockerignore`
```
# 文件：.dockerignore

node_modules
dist
.next
coverage
.env
.env.local
*.log
.git
.DS_Store
*.old.ts
```

---

### 任务 4.2：添加 CI/CD 配置（GitHub Actions）

```yaml
# 文件：.github/workflows/ci.yml

name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Run backend tests
        run: cd apps/api && pnpm test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./apps/api/coverage/lcov.info

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: cd apps/web && npx playwright install --with-deps

      - name: Run E2E tests
        run: cd apps/web && pnpm test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/web/playwright-report/

  build:
    runs-on: ubuntu-latest
    needs: [test-backend, test-frontend]
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install pnpm
        run: npm install -g pnpm

      - name: Install dependencies
        run: pnpm install

      - name: Build backend
        run: cd apps/api && pnpm build

      - name: Build frontend
        run: cd apps/web && pnpm build
```

---

## 验收标准

### P0（关键）- 必须全部通过
- [ ] 所有单元测试通过（0 failed, 104 passed）
- [ ] 没有 `.old.ts` 备份文件
- [ ] `google-cloud-key.json` 已添加到 `.gitignore`
- [ ] 数据库迁移文件已整理到 `docs/database/`

### P1（重要）- 至少完成 80%
- [ ] 文档已重组到 `docs/` 目录
- [ ] 类型定义已统一到 `packages/contracts`
- [ ] 前端 E2E 测试至少 5 个通过
- [ ] 后端测试覆盖率 > 60%
- [ ] `settings/page.tsx` 和 `upload/page.tsx` 已拆分

### P2（优化）- 至少完成 50%
- [ ] Helmet 已配置
- [ ] CORS 已强化
- [ ] 分页功能已实现
- [ ] 日志脱敏已实现
- [ ] 虚拟滚动已实现

### P3（增强）- 可选
- [ ] Docker 配置已添加
- [ ] CI/CD 已配置

---

## 执行顺序建议

### Week 1（P0 + P1 部分）
**Day 1-2**：
1. 修复 13 个失败测试（4 小时）
2. 删除备份文件（30 分钟）
3. 保护敏感文件（30 分钟）

**Day 3-4**：
4. 重组文档结构（3 小时）
5. 统一类型定义（2 小时）

**Day 5**：
6. 配置 Playwright（1 小时）
7. 编写前 2 个 E2E 测试（3 小时）

### Week 2（P1 完成）
**Day 1-2**：
8. 编写剩余 3 个 E2E 测试（6 小时）
9. 补充后端测试（覆盖率提升到 60%）（6 小时）

**Day 3-5**：
10. 拆分 `settings/page.tsx`（4 小时）
11. 拆分 `upload/page.tsx`（4 小时）
12. 验证所有 P1 任务（2 小时）

### Week 3-4（P2 + P3）
**Day 1-2**：
13. 强化安全配置（6 小时）

**Day 3-4**：
14. 性能优化（6 小时）

**Day 5**（可选）：
15. Docker 配置（4 小时）
16. CI/CD 配置（4 小时）

---

## 注意事项

1. **不要同时修改多个文件**：每次只重构一个模块，确保测试通过后再继续
2. **保持 Git 提交频繁**：每完成一个小任务就提交（方便回滚）
3. **测试优先**：先写测试，再重构代码
4. **保持向后兼容**：确保重构不会破坏现有功能
5. **代码审查**：重要改动请让其他开发者审查

---

## 常见问题 FAQ

### Q1: 测试失败怎么办？
**A**: 检查 mock providers 是否完整，所有依赖都需要 mock。参考 `chat.service.spec.ts` 的正确配置。

### Q2: 类型定义冲突怎么办？
**A**: 删除本地定义，统一使用 `@study-oasis/contracts`。确保 `tsconfig.json` 正确配置 paths。

### Q3: Docker 构建失败怎么办？
**A**: 检查 `.dockerignore`，确保 `node_modules` 被忽略。清空 Docker 缓存后重试：`docker system prune -a`

### Q4: E2E 测试不稳定怎么办？
**A**: 增加 `timeout`，使用 `page.waitForSelector()` 等待元素加载。避免使用固定的 `sleep()`。

---

## 成功指标

完成所有 P0 和 P1 任务后，项目应达到以下状态：

- ✅ **代码质量评分**：7.2 → 8.5
- ✅ **测试覆盖率**：42.87% → 80%
- ✅ **前端 E2E 测试**：0 → 5+
- ✅ **文档组织**：40 个散落文件 → 结构化目录
- ✅ **组件大小**：321 行 → < 150 行
- ✅ **生产就绪度**：90% → 95%

---

## 联系方式

如有疑问，请查阅：
- [快速开始指南](docs/guides/QUICK_START_GUIDE.md)
- [架构文档](docs/architecture/)
- [开发指南](docs/development/)

或提交 Issue 到 GitHub 仓库。

---

**最后更新**：2025-11-01
**版本**：v1.0
**维护者**：Study Oasis Team
