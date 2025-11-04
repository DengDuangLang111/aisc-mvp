# GitHub Secrets 配置指南

本文档说明如何配置 GitHub Actions 所需的环境变量和密钥。

## 必需的 Secrets

### Codecov（代码覆盖率）
1. 访问 https://codecov.io
2. 连接你的 GitHub 仓库
3. 获取 Upload Token
4. 在 GitHub 仓库设置中添加：
   - 名称：`CODECOV_TOKEN`
   - 值：从 Codecov 获取的 token

### 部署配置（可选）

#### Vercel 部署（前端）
- `VERCEL_TOKEN`: Vercel API token
- `VERCEL_ORG_ID`: Vercel 组织 ID
- `VERCEL_PROJECT_ID`: Vercel 项目 ID

#### 服务器 SSH 部署（后端）
- `SSH_PRIVATE_KEY`: SSH 私钥
- `SSH_HOST`: 服务器地址
- `SSH_USER`: SSH 用户名
- `SSH_PORT`: SSH 端口（默认 22）

#### Docker Hub
- `DOCKER_USERNAME`: Docker Hub 用户名
- `DOCKER_PASSWORD`: Docker Hub 密码或 access token

#### 数据库配置
- `DATABASE_URL`: 生产环境数据库连接字符串
- `DATABASE_URL_STAGING`: Staging 环境数据库连接字符串

## 环境变量

### Staging 环境
在 GitHub 仓库设置中创建 `staging` environment，并配置：
- `NEXT_PUBLIC_API_URL`: Staging API 地址
- `JWT_SECRET`: JWT 密钥
- `OPENAI_API_KEY`: OpenAI API 密钥

### Production 环境
在 GitHub 仓库设置中创建 `production` environment，并配置：
- `NEXT_PUBLIC_API_URL`: 生产 API 地址
- `JWT_SECRET`: JWT 密钥
- `OPENAI_API_KEY`: OpenAI API 密钥

## 配置步骤

1. 打开 GitHub 仓库设置
2. 进入 Settings > Secrets and variables > Actions
3. 点击 "New repository secret" 添加密钥
4. 进入 Settings > Environments 配置环境

## 验证配置

配置完成后，可以通过以下方式验证：

```bash
# 触发 CI workflow
git push origin develop

# 触发 Deploy workflow
git push origin main

# 手动触发 workflow
# 在 GitHub Actions 页面点击 "Run workflow"
```

## 注意事项

- ⚠️ 永远不要将密钥提交到代码库
- ⚠️ 定期轮换密钥和 token
- ⚠️ 为不同环境使用不同的密钥
- ⚠️ 确保 production 环境配置了必要的保护规则
