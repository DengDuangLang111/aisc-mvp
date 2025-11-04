# Frontend Docker 使用指南

本文档说明如何使用 Docker 构建和运行前端应用（Next.js）。

## 📦 构建镜像

### 基本构建

```bash
cd apps/web
./build-docker.sh
```

### 带版本号构建

```bash
./build-docker.sh v1.0.0
```

### 构建并推送到镜像仓库

```bash
# 设置镜像仓库地址
export DOCKER_REGISTRY=your-registry.com

# 构建并推送
./build-docker.sh v1.0.0 --push
```

## 🚀 运行容器

### 开发模式

```bash
./run-docker.sh dev
```

### 生产模式

```bash
./run-docker.sh prod
```

## 📝 手动运行

### 基本运行

```bash
docker run -p 3001:3001 \
  --env-file .env \
  study-oasis-frontend:latest
```

### 连接后端 API

```bash
docker run -p 3001:3001 \
  -e NEXT_PUBLIC_API_URL=http://localhost:3000 \
  study-oasis-frontend:latest
```

### 后台运行

```bash
docker run -d \
  --name study-oasis-frontend \
  -p 3001:3001 \
  --env-file .env \
  --restart unless-stopped \
  study-oasis-frontend:latest
```

## 🔧 管理容器

### 查看日志

```bash
# 实时查看
docker logs -f study-oasis-frontend

# 查看最后100行
docker logs --tail 100 study-oasis-frontend
```

### 进入容器

```bash
docker exec -it study-oasis-frontend sh
```

### 停止容器

```bash
docker stop study-oasis-frontend
```

### 重启容器

```bash
docker restart study-oasis-frontend
```

### 删除容器

```bash
docker rm -f study-oasis-frontend
```

## 🏥 健康检查

容器内置健康检查：

```bash
# 手动检查
curl http://localhost:3001

# 查看 Docker 健康状态
docker inspect --format='{{.State.Health.Status}}' study-oasis-frontend
```

## 🔧 Next.js 配置

### Standalone 输出模式

在 `next.config.ts` 中已配置：

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',  // 启用独立输出
  images: {
    unoptimized: true,   // 禁用图片优化
  },
};
```

这将创建一个最小化的独立应用，包含：
- 必要的 Node.js 依赖
- 编译后的应用代码
- 静态资源

## 📋 环境变量

### 必需的环境变量

```env
# API 地址（客户端访问）
NEXT_PUBLIC_API_URL=http://localhost:3000

# 应用配置
NODE_ENV=production
PORT=3001
```

### 构建时环境变量

这些变量在构建时被注入到代码中：

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_APP_NAME=Study Oasis
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 运行时环境变量

这些变量在运行时可以更改：

```env
PORT=3001
HOSTNAME=0.0.0.0
```

## 🎯 最佳实践

### 1. 优化构建大小

Dockerfile 已使用多阶段构建：
- `deps`: 安装依赖
- `builder`: 构建应用
- `runner`: 运行应用（最小化）

### 2. 使用 .dockerignore

排除不必要的文件：
- `node_modules`
- `.next`
- 测试文件
- 开发工具配置

### 3. 静态资产

静态文件（public/）会被复制到最终镜像中：

```
/app/apps/web/public/
```

### 4. 环境特定构建

```bash
# 开发环境
docker build --target builder ...

# 生产环境（默认）
docker build ...
```

## 🔍 故障排查

### 构建失败

```bash
# 清除构建缓存
docker builder prune

# 无缓存构建
docker build --no-cache -f apps/web/Dockerfile -t study-oasis-frontend:latest .
```

### 运行时错误

```bash
# 查看详细日志
docker logs study-oasis-frontend

# 检查环境变量
docker exec study-oasis-frontend env | grep NEXT
```

### 网络问题

```bash
# 连接到同一网络的后端
docker network create study-oasis-network
docker network connect study-oasis-network study-oasis-backend
docker network connect study-oasis-network study-oasis-frontend

# 使用内部 DNS
-e NEXT_PUBLIC_API_URL=http://study-oasis-backend:3000
```

## 🔐 安全建议

1. ✅ 使用非 root 用户（已配置 nextjs:nodejs）
2. ✅ 使用 dumb-init 处理信号（已配置）
3. ✅ 多阶段构建减少攻击面（已配置）
4. ✅ .dockerignore 减少镜像大小（已配置）
5. ⚠️ 不要在客户端暴露敏感 API 密钥
6. ⚠️ 使用 NEXT_PUBLIC_ 前缀标记客户端变量
7. ⚠️ 定期更新依赖和基础镜像

## 📚 相关文档

- [Next.js Docker 官方文档](https://nextjs.org/docs/deployment#docker-image)
- [Docker Compose 配置](../../docker-compose.yml)
- [后端 Docker 配置](../api/DOCKER.md)
