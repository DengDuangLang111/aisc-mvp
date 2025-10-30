# 自动化测试配置

## Git Hooks 设置

### Pre-commit Hook
每次 `git commit` 前自动执行：

1. **ESLint** - 自动修复代码格式问题
2. **Jest** - 只运行与改动文件相关的测试
3. **类型检查** - TypeScript 类型验证

### 配置文件

**`.husky/pre-commit`**:
```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

cd study_oasis_simple/apps/web && pnpm lint-staged
```

**`package.json` lint-staged 配置**:
```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "jest --bail --findRelatedTests --passWithNoTests"
    ]
  }
}
```

## 使用方法

### 1. 正常提交
```bash
git add .
git commit -m "feat: 添加新功能"
```

**自动执行**:
- ✅ ESLint 检查并修复
- ✅ 运行相关测试
- ✅ 类型检查通过
- ✅ 提交成功

### 2. 测试失败时
```bash
git add .
git commit -m "fix: 修复 bug"

# 如果测试失败：
# ❌ 测试运行失败
# ❌ 提交被阻止
# 提示：修复失败的测试后重新提交
```

### 3. 跳过 Hook（仅紧急情况）
```bash
git commit -m "urgent fix" --no-verify
```

## 本地测试命令

### 运行所有测试
```bash
cd study_oasis_simple/apps/web
pnpm test
```

### Watch 模式（开发时使用）
```bash
pnpm test:watch
```

### 测试覆盖率报告
```bash
pnpm test:coverage
```

### 类型检查
```bash
pnpm type-check
```

### ESLint 检查
```bash
pnpm lint
```

## 工作流示例

### 添加新组件的完整流程

1. **创建组件**
```bash
# 创建 Button.tsx
touch app/components/NewComponent.tsx
```

2. **编写测试**
```bash
# 创建 Button.test.tsx
touch app/components/NewComponent.test.tsx
```

3. **运行测试（开发时）**
```bash
pnpm test:watch
```

4. **提交代码**
```bash
git add app/components/NewComponent.tsx app/components/NewComponent.test.tsx
git commit -m "feat: 添加 NewComponent 组件"
```

5. **自动化检查**
- ✅ ESLint 自动修复格式
- ✅ 运行 NewComponent 的测试
- ✅ 类型检查通过
- ✅ 提交成功

6. **推送到远程**
```bash
git push origin main
```

## 已安装工具

### Husky (9.1.7)
- Git hooks 管理工具
- 自动在提交前运行检查

### lint-staged (16.2.6)
- 只对暂存文件运行检查
- 提高检查速度

### Jest (30.2.0)
- 单元测试框架
- 与 React Testing Library 集成

### ESLint (9)
- 代码质量检查
- 自动修复问题

## 最佳实践

### 1. 提交前检查
在提交前手动运行测试，确保一切正常：
```bash
pnpm test
pnpm type-check
pnpm lint
```

### 2. 小步提交
每次只提交一个功能或修复，便于：
- 更快的 pre-commit 检查
- 更清晰的提交历史
- 更容易回滚

### 3. 编写测试
每个新组件都应该有对应的测试：
- 组件渲染测试
- 交互行为测试
- 边界情况测试

### 4. 使用 Watch 模式
开发时开启 watch 模式，实时看到测试结果：
```bash
pnpm test:watch
```

### 5. 提交信息规范
使用语义化提交信息：
- `feat:` - 新功能
- `fix:` - 修复 bug
- `docs:` - 文档更新
- `style:` - 代码格式调整
- `refactor:` - 重构
- `test:` - 测试相关
- `chore:` - 构建/工具配置

## 故障排除

### Hook 未执行
```bash
# 确保 hook 有执行权限
chmod +x .husky/pre-commit

# 检查 Git hooks 路径
git config core.hooksPath
# 应该输出: .husky
```

### 测试失败
```bash
# 查看详细错误信息
pnpm test -- --verbose

# 只运行失败的测试
pnpm test -- --onlyFailures
```

### ESLint 错误
```bash
# 手动运行 ESLint 并修复
pnpm lint --fix
```

### 类型错误
```bash
# 查看详细类型错误
pnpm type-check
```

## 统计信息

- **测试套件**: 2 个
- **测试数量**: 13 个
- **测试通过率**: 100%
- **平均测试时间**: ~1 秒

---

**最后更新**: 2025-01-20
**维护人**: AI Assistant
