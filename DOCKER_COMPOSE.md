# Docker Compose 使用指南

本文档说明如何使用 Docker Compose 一键启动整个应用栈。

## 📦 包含的服务

### 生产环境 (`docker-compose.yml`)
- **postgres**: PostgreSQL 16 数据库
- **redis**: Redis 7 缓存
- **api**: NestJS 后端 API
- **web**: Next.js 前端应用
- **nginx**: Nginx 反向代理（可选）

### 开发环境 (`docker-compose.dev.yml`)
- **postgres**: PostgreSQL 16 数据库
- **redis**: Redis 7 缓存
- **adminer**: 数据库管理界面
- **redis-commander**: Redis 管理界面

## 🚀 快速开始

### 1. 准备环境变量

```bash
# 复制环境变量示例
cp .env.example .env

# 编辑环境变量
vim .env
```

必需的环境变量：
- `POSTGRES_PASSWORD`: 数据库密码
- `JWT_SECRET`: JWT 密钥
- `OPENAI_API_KEY`: OpenAI API 密钥
- `GOOGLE_CLOUD_PROJECT`: Google Cloud 项目 ID
- `GCS_BUCKET_NAME`: Google Cloud Storage 桶名

### 2. 启动服务

#### 开发环境（仅数据库和工具）

```bash
# 启动数据库和管理工具
docker-compose -f docker-compose.dev.yml up -d

# 查看服务状态
docker-compose -f docker-compose.dev.yml ps
```

访问管理界面：
- Adminer (数据库): http://localhost:8080
- Redis Commander: http://localhost:8081

然后在本地运行应用：
```bash
# 终端1：启动后端
cd apps/api && pnpm run start:dev

# 终端2：启动前端
cd apps/web && pnpm run dev
```

#### 生产环境（完整栈）

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 或者分步执行
docker-compose build
docker-compose up -d
```

### 3. 查看服务状态

```bash
# 查看运行中的容器
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f api
docker-compose logs -f web
```

## 🔧 常用命令

### 启动和停止

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose stop

# 停止并删除容器
docker-compose down

# 停止并删除容器、卷、网络
docker-compose down -v
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart api
docker-compose restart web
```

### 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 实时跟踪日志
docker-compose logs -f

# 查看最后100行
docker-compose logs --tail=100

# 查看特定服务
docker-compose logs -f api web
```

### 执行命令

```bash
# 在 API 容器中执行命令
docker-compose exec api sh
docker-compose exec api pnpm run migration:run

# 在数据库容器中执行命令
docker-compose exec postgres psql -U postgres -d study_oasis
```

### 扩展服务

```bash
# 运行多个 API 实例
docker-compose up -d --scale api=3

# 需要配合 nginx 负载均衡
```

## 🏥 健康检查

### 检查服务健康状态

```bash
# 查看所有服务健康状态
docker-compose ps

# 检查 API 健康端点
curl http://localhost:3000/health

# 检查前端
curl http://localhost:3001

# 检查数据库
docker-compose exec postgres pg_isready -U postgres

# 检查 Redis
docker-compose exec redis redis-cli ping
```

## 📊 监控和管理

### 查看资源使用

```bash
# 查看所有容器资源使用
docker stats

# 查看特定容器
docker stats study-oasis-api study-oasis-web
```

### 数据库管理

```bash
# 备份数据库
docker-compose exec -T postgres pg_dump -U postgres study_oasis > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U postgres study_oasis < backup.sql

# 访问数据库
docker-compose exec postgres psql -U postgres -d study_oasis
```

### Redis 管理

```bash
# 连接到 Redis
docker-compose exec redis redis-cli

# 查看所有键
docker-compose exec redis redis-cli KEYS '*'

# 清空缓存
docker-compose exec redis redis-cli FLUSHALL
```

## 🔐 Nginx 反向代理（可选）

### 启用 Nginx

```bash
# 使用 production profile 启动
docker-compose --profile production up -d
```

### 配置 SSL

1. 将 SSL 证书放到 `nginx/ssl/` 目录：
   ```bash
   mkdir -p nginx/ssl
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

2. 修改 `nginx/nginx.conf` 中的 `server_name`

3. 重启 Nginx：
   ```bash
   docker-compose restart nginx
   ```

## 🔍 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查配置文件
docker-compose config

# 重新构建
docker-compose build --no-cache
docker-compose up -d
```

### 端口冲突

```bash
# 检查端口占用
lsof -i :3000
lsof -i :3001
lsof -i :5432

# 修改 docker-compose.yml 中的端口映射
```

### 网络问题

```bash
# 查看网络
docker network ls
docker network inspect study-oasis-network

# 重建网络
docker-compose down
docker network prune
docker-compose up -d
```

### 数据持久化

```bash
# 查看卷
docker volume ls

# 查看卷详情
docker volume inspect study_oasis_simple_postgres_data

# 备份卷
docker run --rm -v study_oasis_simple_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz /data
```

## 🎯 最佳实践

### 1. 环境分离

```bash
# 开发环境
docker-compose -f docker-compose.dev.yml up -d

# 生产环境
docker-compose -f docker-compose.yml up -d
```

### 2. 使用 .env 文件

为不同环境使用不同的 .env 文件：
- `.env` - 生产环境
- `.env.dev` - 开发环境
- `.env.staging` - 测试环境

```bash
docker-compose --env-file .env.dev up -d
```

### 3. 日志管理

配置日志驱动和限制：

```yaml
services:
  api:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 4. 资源限制

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### 5. 定期维护

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的卷
docker volume prune

# 清理所有未使用资源
docker system prune -a
```

## 📚 相关文档

- [后端 Docker 配置](apps/api/DOCKER.md)
- [前端 Docker 配置](apps/web/DOCKER.md)
- [环境变量配置](.env.example)
- [Nginx 配置](nginx/nginx.conf)
