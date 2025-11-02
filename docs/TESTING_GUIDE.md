# 测试指南

本文档说明如何运行和编写测试。

## 测试覆盖率概览

### 后端测试（API）

| 模块 | 覆盖率 | 测试数 | 状态 |
|------|--------|--------|------|
| analytics | 92.30% | 12 | ✅ |
| analytics.middleware | 100% | 6 | ✅ |
| chat | 86.15% | 13 | ✅ |
| chat.service | 91.17% | 13 | ✅ |
| vision.service | 88.49% | 10 | ✅ |
| upload.controller | 92.85% | 7 | ✅ |
| upload.service | 81.50% | 17 | ✅ |
| **总计** | **78.00%** | **227** | ✅ |

### 前端测试（Web）

| 组件 | 测试数 | 状态 |
|------|--------|------|
| ChatHeader | 10 | ✅ |
| ChatError | 3 | ✅ |
| UploadForm | 9 | ✅ |
| UploadHistory | 9 | ✅ |
| UploadTips | 3 | ✅ |
| **总计** | **34** | ✅ |

---

## 运行测试

### 后端测试

```bash
# 进入 API 目录
cd apps/api

# 运行所有测试
pnpm test

# 运行测试并显示覆盖率
pnpm test:cov

# 运行特定测试文件
pnpm test upload.service.spec.ts

# 运行特定测试套件
pnpm test -- -t "ChatService"

# 监听模式（开发时使用）
pnpm test:watch
```

### 前端测试

```bash
# 进入 Web 目录
cd apps/web

# 运行所有测试
pnpm test

# 运行测试并显示覆盖率
pnpm test:coverage

# 运行特定组件测试
pnpm test ChatHeader

# 监听模式
pnpm test:watch
```

---

## 测试类型

### 1. 单元测试（Unit Tests）

测试单个函数、方法或组件。

**后端示例** (`apps/api/src/analytics/analytics.service.spec.ts`):

```typescript
describe('AnalyticsService', () => {
  it('should calculate average response time correctly', async () => {
    const result = await analyticsService.getApiStats(24);
    expect(result.averageResponseTime).toBeGreaterThan(0);
  });
});
```

**前端示例** (`apps/web/app/chat/components/ChatHeader.test.tsx`):

```typescript
describe('ChatHeader', () => {
  it('should display message count when messages exist', () => {
    render(<ChatHeader messageCount={5} />);
    expect(screen.getByText('(5 条消息)')).toBeInTheDocument();
  });
});
```

### 2. 集成测试（Integration Tests）

测试多个模块的协作。

**示例**:

```typescript
describe('Upload Flow', () => {
  it('should upload file and save to database', async () => {
    const file = createMockFile();
    const result = await uploadService.saveFile(file);
    
    // 验证 GCS 调用
    expect(gcsService.uploadFile).toHaveBeenCalled();
    
    // 验证数据库记录
    const doc = await prisma.document.findUnique({
      where: { id: result.documentId }
    });
    expect(doc).toBeDefined();
  });
});
```

### 3. E2E 测试（End-to-End Tests）

测试完整的用户流程。

**计划中** - 使用 Playwright:

```typescript
test('user can upload file and chat', async ({ page }) => {
  await page.goto('/upload');
  await page.setInputFiles('input[type="file"]', 'test.pdf');
  await page.click('button:has-text("上传文件")');
  await page.click('button:has-text("开始对话学习")');
  
  await expect(page).toHaveURL(/\/chat/);
});
```

---

## 编写测试

### 后端测试模板

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        // 添加依赖的 mock
      ],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('yourMethod', () => {
    it('should do something', async () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = await service.yourMethod(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    it('should throw error on invalid input', async () => {
      await expect(service.yourMethod(null))
        .rejects.toThrow(BadRequestException);
    });
  });
});
```

### 前端测试模板

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { YourComponent } from './YourComponent';

describe('YourComponent', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<YourComponent onClick={mockOnClick} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should call onClick when button clicked', () => {
    render(<YourComponent onClick={mockOnClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should not render when condition is false', () => {
    render(<YourComponent show={false} />);
    expect(screen.queryByTestId('component')).not.toBeInTheDocument();
  });
});
```

---

## 最佳实践

### 1. 测试命名

- **Describe**: 使用组件/服务名
- **It**: 使用 "should + 动词" 格式
- **清晰**: 测试名应该描述行为

```typescript
✅ Good:
it('should return user when valid ID provided')
it('should throw NotFoundException when user not found')

❌ Bad:
it('test 1')
it('works')
```

### 2. AAA 模式

使用 Arrange-Act-Assert 模式：

```typescript
it('should calculate total correctly', () => {
  // Arrange - 准备测试数据
  const items = [10, 20, 30];
  
  // Act - 执行被测试的代码
  const total = calculateTotal(items);
  
  // Assert - 验证结果
  expect(total).toBe(60);
});
```

### 3. Mock 外部依赖

```typescript
// Mock API 调用
jest.mock('../lib/api-client', () => ({
  ApiClient: {
    uploadFile: jest.fn().mockResolvedValue({ id: 'test-id' })
  }
}));

// Mock 数据库
const mockPrisma = {
  user: {
    findUnique: jest.fn().mockResolvedValue({ id: 1, name: 'Test' })
  }
};
```

### 4. 清理状态

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### 5. 测试边界情况

```typescript
describe('calculateDiscount', () => {
  it('should handle zero price', () => {
    expect(calculateDiscount(0, 10)).toBe(0);
  });

  it('should handle 100% discount', () => {
    expect(calculateDiscount(100, 100)).toBe(0);
  });

  it('should throw on negative price', () => {
    expect(() => calculateDiscount(-10, 10)).toThrow();
  });
});
```

---

## 持续集成（CI）

### GitHub Actions 配置

`.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run API tests
        run: |
          cd apps/api
          pnpm test:cov
      
      - name: Run Web tests
        run: |
          cd apps/web
          pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

---

## 故障排查

### 常见问题

#### 1. "Cannot find module" 错误

```bash
# 重新安装依赖
pnpm install

# 清除 Jest 缓存
pnpm test --clearCache
```

#### 2. Mock 不工作

确保 mock 在 import 之前：

```typescript
// ✅ Good
jest.mock('./service');
import { Service } from './service';

// ❌ Bad
import { Service } from './service';
jest.mock('./service');
```

#### 3. 异步测试超时

增加超时时间：

```typescript
it('should complete long operation', async () => {
  // ...
}, 10000); // 10 秒超时
```

#### 4. 前端测试找不到 DOM 元素

使用 `screen.debug()` 查看当前 DOM：

```typescript
render(<MyComponent />);
screen.debug(); // 打印当前 DOM
```

---

## 测试覆盖率目标

### 当前目标

- **后端**: 78% → 80% ✅ 接近目标
- **前端**: 新组件 100% ✅ 已完成

### 长期目标

- **整体**: 90%+
- **关键路径**: 100%（支付、认证、数据库操作）
- **E2E**: 覆盖主要用户流程

---

## 参考资源

### 官方文档
- [Jest](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)

### 内部文档
- [前端组件文档](./FRONTEND_REFACTORING.md)
- [API 文档](./API_DOCUMENTATION.md)

---

## 贡献测试

1. 为新功能添加测试
2. 保持测试覆盖率 > 75%
3. 所有测试必须通过才能合并 PR
4. 更新此文档（如有新测试模式）

---

最后更新：2025-11-02
