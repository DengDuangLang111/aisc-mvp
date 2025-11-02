# Phase 3.5 快速参考卡片

> **打印此页或保存为书签，随时查看进度**

---

## 📊 当前状态

| 指标 | 当前 | 目标 | 进度 |
|------|------|------|------|
| 测试通过率 | 87.5% (91/104) | 100% | ⬜⬜⬜⬜⬜ 0% |
| 测试覆盖率 | 42.87% | > 60% | ⬜⬜⬜⬜⬜ 0% |
| 代码质量 | 7.2/10 | 8.5/10 | ⬜⬜⬜⬜⬜ 0% |
| 备份文件 | 3 个 | 0 个 | ⬜⬜⬜⬜⬜ 0% |
| 根目录文档 | 40+ 个 | < 5 个 | ⬜⬜⬜⬜⬜ 0% |
| 组件大小 | 321 行 | < 150 行 | ⬜⬜⬜⬜⬜ 0% |

---

## ✅ 今日任务清单 (Day 1)

### 上午 (4h)
- [ ] 修复 `upload.controller.spec.ts` (1h)
- [ ] 修复 `upload.service.spec.ts` (1h)
- [ ] 修复 `chat.controller.spec.ts` (1h)
- [ ] 修复 `chat.service.spec.ts` (1h)

### 下午 (4h)
- [ ] 修复 `vision.controller.spec.ts` (1h)
- [ ] 修复 `vision.service.spec.ts` (1h)
- [ ] 修复 `analytics` 测试 (1h)
- [ ] 运行完整测试 `pnpm test` (1h)

---

## 🚀 常用命令

### 测试
```bash
cd apps/api
pnpm test                    # 运行所有测试
pnpm test -- --coverage      # 运行测试 + 覆盖率
pnpm test upload            # 只测试 upload 模块
```

### 构建
```bash
cd apps/api && pnpm build    # 后端构建
cd apps/web && pnpm build    # 前端构建
```

### 检查
```bash
find . -name "*.old.ts"      # 查找备份文件
git status                   # Git 状态
wc -l apps/web/app/*/page.tsx  # 检查组件行数
```

---

## 📝 快速修复模板

### Mock 模板 1: VisionService
```typescript
const mockVisionService = {
  analyzeImage: jest.fn().mockResolvedValue({
    fullText: 'Test OCR text',
    confidence: 0.95,
    language: 'en',
  }),
  processOcr: jest.fn(),
  getOcrResult: jest.fn(),
};

// 在 providers 中添加:
{
  provide: VisionService,
  useValue: mockVisionService,
}
```

### Mock 模板 2: AnalyticsService
```typescript
const mockAnalyticsService = {
  trackEvent: jest.fn().mockResolvedValue(undefined),
  getActiveUsers: jest.fn(),
  getEventStats: jest.fn(),
};

// 在 providers 中添加:
{
  provide: AnalyticsService,
  useValue: mockAnalyticsService,
}
```

### Mock 模板 3: GcsService
```typescript
const mockGcsService = {
  uploadFile: jest.fn().mockResolvedValue('gs://bucket/file.pdf'),
  getSignedUrl: jest.fn().mockResolvedValue('https://storage.googleapis.com/...'),
  deleteFile: jest.fn().mockResolvedValue(true),
};

// 在 providers 中添加:
{
  provide: GcsService,
  useValue: mockGcsService,
}
```

---

## 📅 5 天进度追踪

### Day 1: 修复测试 ⬜
- [ ] 13 个失败测试全部修复
- [ ] `pnpm test` → 104/104 passed

### Day 2: 清理+安全+类型 ⬜
- [ ] 删除 `.old.ts` 文件
- [ ] 保护 `google-cloud-key.json`
- [ ] 统一类型定义到 `contracts`

### Day 3: 拆分组件 ⬜
- [ ] `settings/page.tsx` < 150 行
- [ ] `upload/page.tsx` < 150 行

### Day 4: 测试+文档 ⬜
- [ ] 前端功能测试通过
- [ ] 创建完成报告

### Day 5: 验收 ⬜
- [ ] 所有检查清单通过
- [ ] 准备进入 Phase 4

---

## 🎯 验收检查（每日完成时填写）

### 测试相关
- [ ] `pnpm test` → 104/104 passed
- [ ] 测试覆盖率 > 60%
- [ ] 无 mock 错误

### 代码清理
- [ ] `find . -name "*.old.ts"` → 空
- [ ] 数据库文件在 `docs/database/`
- [ ] `.gitignore` 已更新

### 安全
- [ ] `google-cloud-key.json` 在 `.gitignore`
- [ ] 敏感文件不在 Git 历史
- [ ] README 有安全提醒

### 类型定义
- [ ] `packages/contracts` 完整
- [ ] 无重复 `.types.ts` 文件
- [ ] `pnpm build` 成功

### 文档
- [ ] `docs/` 结构创建
- [ ] 根目录 README < 100 行
- [ ] 所有文档已分类

### 组件
- [ ] `settings/page.tsx` < 150 行
- [ ] `upload/page.tsx` < 150 行
- [ ] 子组件已创建

---

## 🆘 遇到问题时

### 问题 1: 测试一直失败
**检查**:
- [ ] Mock providers 是否完整？
- [ ] Mock 方法返回值类型是否正确？
- [ ] 是否有异步操作未 await？

**解决**: 参考 `chat.service.spec.ts` 的正确配置

### 问题 2: 构建失败
**检查**:
- [ ] `pnpm install` 是否成功？
- [ ] 类型导入路径是否正确？
- [ ] `tsconfig.json` 是否配置了 paths？

**解决**: 删除 `node_modules` 和 `dist` 后重新安装

### 问题 3: Git 提交被拒绝
**检查**:
- [ ] 是否包含大文件？
- [ ] 是否包含敏感文件？
- [ ] `.gitignore` 是否配置正确？

**解决**: 使用 `git rm --cached` 移除敏感文件

---

## 📞 快速链接

- [Phase 3.5 详细计划](./PHASE_3.5_EXECUTION_SUMMARY.md)
- [完整开发路线图](./DEVELOPMENT_EXECUTION_PLAN.md)
- [重构计划](./REFACTORING_PLAN.md)
- [测试清单](./TESTING_TODO.md)

---

## 💡 每日提醒

> "不要跳过 Phase 3.5！代码质量问题会累积成技术债务，影响后续所有开发。"

> "每完成一个任务就提交 Git，小步快跑，方便回滚。"

> "遇到问题先查文档，再问 AI，最后搜索。"

---

**打印日期**: ___________  
**完成日期**: ___________  
**代码质量评分**: _____ / 10

---

## 📈 进度可视化

```
Phase 3.5 完成度: [          ] 0%

Day 1: [          ] 0/8 任务
Day 2: [          ] 0/4 任务
Day 3: [          ] 0/2 任务
Day 4: [          ] 0/2 任务
Day 5: [          ] 0/1 任务

总进度: 0/17 任务完成
```

---

**版本**: v1.0  
**最后更新**: 2025-11-02
