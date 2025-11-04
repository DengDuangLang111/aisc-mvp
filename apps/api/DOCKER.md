# Backend Docker 使用指南

本文档说明如何使用 Docker 构建和运行后端应用。

## 📦 构建镜像

### 基本构建

```bash
cd apps/api
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

开发模式特点：
- 挂载 `uploads` 目录
- 挂载 Google Cloud 密钥文件
- 使用 `.env` 文件
- 自动重启

### 生产模式

```bash
./run-docker.sh prod
```

生产模式特点：
- 使用 `.env.production` 文件
- 持久化上传目录到 `/var/study-oasis/uploads`
- 自动重启

## 📝 手动运行

### 基本运行

```bash
docker run -p 3000:3000 \
  --env-file .env \
  study-oasis-backend:latest
```

### 带卷挂载

```bash
docker run -p 3000:3000 \
  --env-file .env \
  -v $(pwd)/uploads:/app/apps/api/uploads \
  -v $(pwd)/google-cloud-key.json:/app/apps/api/google-cloud-key.json:ro \
  study-oasis-backend:latest
```

### 后台运行

```bash
docker run -d \
  --name study-oasis-backend \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  study-oasis-backend:latest
```

## 🔧 管理容器

### 查看日志

```bash
# 实时查看
docker logs -f study-oasis-backend

# 查看最后100行
docker logs --tail 100 study-oasis-backend
```

### 进入容器

```bash
docker exec -it study-oasis-backend sh
```

### 停止容器

```bash
docker stop study-oasis-backend
```

### 重启容器

```bash
docker restart study-oasis-backend
```

### 删除容器

```bash
docker rm -f study-oasis-backend
```

## 🏥 健康检查

容器内置健康检查端点：

```bash
# 手动检查
curl http://localhost:3000/health

# 查看 Docker 健康状态
docker inspect --format='{{.State.Health.Status}}' study-oasis-backend
```

健康检查配置：
- 间隔：30秒
- 超时：3秒
- 启动期：40秒
- 重试次数：3次

## 🔍 故障排查

### 查看容器状态

```bash
docker ps -a | grep study-oasis-backend
```

### 查看资源使用

```bash
docker stats study-oasis-backend
```

### 检查网络

```bash
docker network inspect bridge
```

### 重新构建镜像（无缓存）

```bash
docker build --no-cache -f apps/api/Dockerfile -t study-oasis-backend:latest .
```

## 📋 环境变量

必需的环境变量（在 `.env` 文件中配置）：

```env
# 数据库
DATABASE_URL=postgresql://user:password@host:5432/database

# JWT
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Google Cloud
GOOGLE_CLOUD_PROJECT=your-project-id
GCS_BUCKET_NAME=your-bucket-name

# 应用配置
NODE_ENV=production
PORT=3000
```

## 🎯 最佳实践

1. **使用特定版本标签**
   ```bash
   ./build-docker.sh v1.0.0
   ```

2. **使用 Docker Compose**（见 docker-compose.yml）

3. **定期清理未使用的镜像**
   ```bash
   docker image prune -a
   ```

4. **监控容器日志大小**
   ```bash
   # 配置日志驱动
   docker run --log-opt max-size=10m --log-opt max-file=3 ...
   ```

5. **使用 .env 文件管理环境变量**
   - 不要在镜像中硬编码密钥
   - 为不同环境使用不同的 .env 文件

## 🔐 安全建议

1. ✅ 使用非 root 用户运行（已配置）
2. ✅ 使用 dumb-init 处理信号（已配置）
3. ✅ 使用 .dockerignore 减少镜像大小（已配置）
4. ✅ 多阶段构建减少攻击面（已配置）
5. ⚠️ 不要在镜像中包含密钥文件
6. ⚠️ 定期更新基础镜像
7. ⚠️ 扫描镜像漏洞

```bash
# 使用 Trivy 扫描漏洞
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image study-oasis-backend:latest
```

## 📚 相关文档

- [Docker Compose 配置](../../docker-compose.yml)
- [部署指南](../../docs/DEPLOYMENT.md)
- [环境配置](../../docs/ENVIRONMENT.md)
