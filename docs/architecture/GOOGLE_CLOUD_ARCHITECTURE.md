# Google Cloud 全栈架构方案

## 🏗️ 完整架构设计

使用 **Google Cloud** 全家桶可以获得最佳的服务集成和统一管理体验。

```
┌────────────────────────────────────────────────────────────┐
│                      全球用户                               │
└──────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────────────────────┐
│           Cloud CDN + Cloud Load Balancing                 │
│  - 全球边缘节点缓存                                         │
│  - 自动 DDoS 防护                                          │
│  - HTTPS 自动证书                                          │
└──────────────────────┬─────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌──────────────────┐       ┌──────────────────┐
│  Cloud Run       │       │  Firebase Hosting│
│  (后端 API)       │       │  (前端静态资源)   │
│  - NestJS        │       │  - Next.js       │
│  - 自动扩展 0-N   │       │  - 全球 CDN      │
│  - 按请求付费     │       │  - 10GB 免费     │
└────────┬─────────┘       └──────────────────┘
         │
         ├─────────────┬─────────────┬─────────────┐
         ▼             ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐
│ Cloud SQL   │ │ Cloud       │ │ Cloud    │ │ Cloud    │
│ (PostgreSQL)│ │ Storage     │ │ Vision   │ │ Secret   │
│             │ │             │ │ API      │ │ Manager  │
│ - 用户数据   │ │ - 文件存储  │ │ - OCR    │ │ - API Key│
│ - 会话历史   │ │ - 文档备份  │ │ - 文本   │ │ - 密钥   │
│ - OCR 结果   │ │ - 全球复制  │ │   提取   │ │   管理   │
└─────────────┘ └─────────────┘ └──────────┘ └──────────┘
         │
         ▼
┌─────────────┐
│ Memorystore │
│ (Redis)     │
│ - 缓存层     │
│ - Session   │
└─────────────┘
```

---

## 🎯 核心服务选择

### 1. **Cloud Run** - 后端 API 托管
**作用**: 运行 NestJS 后端服务

**优势**:
- ✅ **全托管**: 无需管理服务器
- ✅ **自动扩展**: 0 到 1000+ 实例自动伸缩
- ✅ **按请求付费**: 没有流量时 $0 成本
- ✅ **内置 HTTPS**: 自动 SSL 证书
- ✅ **快速部署**: `gcloud run deploy` 一键部署

**定价**:
```
免费额度（每月）:
- 200万请求
- 360,000 GB-秒 CPU
- 180,000 vCPU-秒

超出后:
- $0.00002400/请求
- $0.00001800/GB-秒内存
```

**预估成本** (1000 活跃用户):
- 月请求: ~50万 → **免费**
- 超出部分: ~$5/月

---

### 2. **Cloud SQL (PostgreSQL)** - 数据库
**作用**: 存储用户数据、会话历史、OCR 结果

**优势**:
- ✅ **全托管**: 自动备份、补丁、监控
- ✅ **高可用**: 99.95% SLA
- ✅ **自动扩展**: 存储自动增长
- ✅ **全球复制**: 跨区域只读副本

**定价**:
```
db-f1-micro (共享 CPU, 0.6GB 内存):
- $7.67/月 (适合开发测试)

db-g1-small (共享 CPU, 1.7GB 内存):
- $25.58/月 (适合小规模生产)

db-custom-2-7680 (2 vCPU, 7.5GB 内存):
- $97.74/月 (适合大规模生产)
```

**推荐配置** (MVP 阶段):
- **db-f1-micro**: 开发测试免费试用
- **db-g1-small**: 正式上线后升级

---

### 3. **Cloud Storage** - 文件存储
**作用**: 存储用户上传的文档、OCR 结果文件

**优势**:
- ✅ **无限容量**: 无需担心存储空间
- ✅ **全球 CDN**: 自动缓存到边缘节点
- ✅ **版本控制**: 文件历史版本管理
- ✅ **生命周期管理**: 自动归档/删除过期文件

**定价**:
```
Standard 存储类:
- $0.020/GB/月
- 上传: 免费
- 下载: $0.12/GB (前 1GB 免费)

Nearline 存储类 (30天后自动归档):
- $0.010/GB/月
```

**预估成本** (10GB 文件):
- Standard: $0.20/月
- Nearline: $0.10/月

---

### 4. **Cloud Vision API** - OCR 服务
**作用**: 从图片/PDF 中提取文本

**优势**:
- ✅ **最高准确率**: 英文 98-99%, 多语言 90-95%
- ✅ **结构化输出**: 返回坐标、置信度、表格结构
- ✅ **无需训练**: 开箱即用
- ✅ **与存储集成**: 直接读取 Cloud Storage 文件

**定价**:
```
Document Text Detection:
- 前 1,000 页/月: 免费
- 1,001-5,000,000 页: $1.50/1000 页
- 5,000,001+ 页: $0.60/1000 页
```

**预估成本** (1000 文档/月):
- 前 1000: 免费
- **总计**: $0/月

---

### 5. **Secret Manager** - 密钥管理
**作用**: 安全存储 API Key、数据库密码

**优势**:
- ✅ **安全加密**: 自动加密所有密钥
- ✅ **版本控制**: 密钥轮换历史
- ✅ **IAM 集成**: 精细权限控制

**定价**:
```
- 前 6 个密钥: 免费
- 超出: $0.06/密钥/月
- 访问: $0.03/10,000 次
```

**预估成本**: ~$0/月 (免费额度够用)

---

### 6. **Firebase Hosting** (可选) - 前端托管
**作用**: 托管 Next.js 静态资源

**优势**:
- ✅ **全球 CDN**: 自动分发到 200+ 节点
- ✅ **免费额度**: 10GB 存储 + 360MB/天流量
- ✅ **自动 HTTPS**: 免费 SSL 证书

**定价**:
```
Spark Plan (免费):
- 10GB 存储
- 360MB/天流量

Blaze Plan (按量付费):
- $0.026/GB 存储
- $0.15/GB 流量
```

---

### 7. **Memorystore (Redis)** (可选) - 缓存
**作用**: 缓存热数据、Session 管理

**定价**:
```
Basic (单实例):
- 1GB 内存: $48.84/月
- 5GB 内存: $244.20/月

Standard (高可用):
- 1GB 内存: $71.28/月
```

**推荐**: MVP 阶段可以跳过，使用内存缓存即可。

---

## 💰 总成本预估

### 方案 A: 最小化成本 (开发/测试)

| 服务 | 配置 | 月费 |
|------|------|------|
| Cloud Run | 免费额度内 | $0 |
| Cloud SQL | db-f1-micro | $7.67 |
| Cloud Storage | 10GB Standard | $0.20 |
| Cloud Vision | 1000 文档/月 | $0 |
| Secret Manager | 6 个密钥 | $0 |
| Firebase Hosting | 免费额度内 | $0 |
| **总计** | - | **$7.87/月** |

### 方案 B: 生产环境 (1000 活跃用户)

| 服务 | 配置 | 月费 |
|------|------|------|
| Cloud Run | 50万请求/月 | $5 |
| Cloud SQL | db-g1-small | $25.58 |
| Cloud Storage | 50GB Standard | $1.00 |
| Cloud Vision | 5000 文档/月 | $6.00 |
| Secret Manager | 10 个密钥 | $0.24 |
| Firebase Hosting | 5GB 流量/月 | $0.75 |
| DeepSeek API | 100万 tokens | $10 |
| **总计** | - | **$48.57/月** |

### 方案 C: 大规模生产 (10000 活跃用户)

| 服务 | 配置 | 月费 |
|------|------|------|
| Cloud Run | 500万请求/月 | $50 |
| Cloud SQL | db-custom-2-7680 + 副本 | $195.48 |
| Cloud Storage | 500GB Standard | $10.00 |
| Cloud Vision | 50000 文档/月 | $73.50 |
| Memorystore Redis | 5GB Standard | $244.20 |
| Firebase Hosting | 50GB 流量/月 | $7.50 |
| DeepSeek API | 1000万 tokens | $100 |
| **总计** | - | **$680.68/月** |

---

## 🚀 实施步骤

### Step 1: 创建 Google Cloud 项目

```bash
# 1. 安装 Google Cloud SDK
# macOS
brew install --cask google-cloud-sdk

# 或访问: https://cloud.google.com/sdk/docs/install

# 2. 初始化
gcloud init

# 3. 创建项目
gcloud projects create study-oasis-prod --name="Study Oasis"

# 4. 设置默认项目
gcloud config set project study-oasis-prod

# 5. 启用计费（必须）
# 访问: https://console.cloud.google.com/billing

# 6. 启用所需 API
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  storage.googleapis.com \
  vision.googleapis.com \
  secretmanager.googleapis.com \
  cloudresourcemanager.googleapis.com
```

---

### Step 2: 创建 Cloud SQL 数据库

```bash
# 1. 创建 PostgreSQL 实例
gcloud sql instances create study-oasis-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1 \
  --root-password=YOUR_SECURE_PASSWORD \
  --backup-start-time=03:00 \
  --enable-bin-log

# 2. 创建数据库
gcloud sql databases create studyoasis \
  --instance=study-oasis-db

# 3. 创建数据库用户
gcloud sql users create api-user \
  --instance=study-oasis-db \
  --password=YOUR_API_USER_PASSWORD

# 4. 获取连接字符串
gcloud sql instances describe study-oasis-db \
  --format='value(connectionName)'
# 输出: study-oasis-prod:us-central1:study-oasis-db

# 5. 连接字符串（用于 Prisma）
# postgresql://api-user:PASSWORD@/studyoasis?host=/cloudsql/study-oasis-prod:us-central1:study-oasis-db
```

**本地开发连接**:
```bash
# 启动 Cloud SQL Proxy
cloud_sql_proxy -instances=study-oasis-prod:us-central1:study-oasis-db=tcp:5432

# 然后使用标准 PostgreSQL 连接
# postgresql://api-user:PASSWORD@localhost:5432/studyoasis
```

---

### Step 3: 创建 Cloud Storage Bucket

```bash
# 1. 创建 Bucket
gsutil mb -p study-oasis-prod \
  -c STANDARD \
  -l us-central1 \
  gs://study-oasis-uploads

# 2. 设置 CORS（允许前端直传）
cat > cors.json <<EOF
[
  {
    "origin": ["https://yourdomain.com", "http://localhost:3000"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "responseHeader": ["Content-Type"],
    "maxAgeSeconds": 3600
  }
]
EOF

gsutil cors set cors.json gs://study-oasis-uploads

# 3. 设置生命周期规则（30 天后删除临时文件）
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "matchesPrefix": ["temp/"]
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json gs://study-oasis-uploads

# 4. 设置为私有（通过预签名 URL 访问）
gsutil iam ch allUsers:objectViewer gs://study-oasis-uploads -d
```

---

### Step 4: 配置 Secret Manager

```bash
# 1. 存储数据库密码
echo -n "YOUR_DB_PASSWORD" | \
  gcloud secrets create db-password --data-file=-

# 2. 存储 DeepSeek API Key
echo -n "YOUR_DEEPSEEK_KEY" | \
  gcloud secrets create deepseek-api-key --data-file=-

# 3. 授权 Cloud Run 访问密钥
gcloud secrets add-iam-policy-binding db-password \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding deepseek-api-key \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 4. 查看密钥
gcloud secrets versions access latest --secret="db-password"
```

---

### Step 5: 准备后端代码

#### 5.1 配置 Prisma 连接 Cloud SQL

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// 表结构（与之前设计相同）
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
  
  documents     Document[]
  conversations Conversation[]
}

model Document {
  id          String   @id @default(uuid())
  userId      String?
  filename    String
  gcsPath     String   // gs://bucket/path
  mimeType    String
  size        Int
  uploadedAt  DateTime @default(now())
  
  user          User?         @relation(fields: [userId], references: [id])
  ocrResult     OcrResult?
  conversations Conversation[]
  
  @@index([userId])
}

model OcrResult {
  id             String   @id @default(uuid())
  documentId     String   @unique
  fullText       String   @db.Text
  structuredData Json
  language       String
  confidence     Float
  pageCount      Int?
  extractedAt    DateTime @default(now())
  
  document Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
}

model Conversation {
  id         String   @id @default(uuid())
  userId     String?
  documentId String?
  title      String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  
  user     User?     @relation(fields: [userId], references: [id])
  document Document? @relation(fields: [documentId], references: [id])
  messages Message[]
  
  @@index([userId])
  @@index([documentId])
}

model Message {
  id             String   @id @default(uuid())
  conversationId String
  role           String
  content        String   @db.Text
  hintLevel      Int?
  modelUsed      String?
  tokensUsed     Int?
  timestamp      DateTime @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
}
```

#### 5.2 创建 Cloud Storage Service

```typescript
// apps/api/src/storage/gcs.service.ts
import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class GcsService {
  private storage: Storage;
  private bucketName = 'study-oasis-uploads';

  constructor() {
    this.storage = new Storage({
      // Cloud Run 会自动使用服务账号认证
      // 本地开发需要设置 GOOGLE_APPLICATION_CREDENTIALS
    });
  }

  /**
   * 上传文件到 GCS
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'uploads',
  ): Promise<{ gcsPath: string; publicUrl: string }> {
    const filename = `${folder}/${uuidv4()}-${file.originalname}`;
    const bucket = this.storage.bucket(this.bucketName);
    const blob = bucket.file(filename);

    await blob.save(file.buffer, {
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    const gcsPath = `gs://${this.bucketName}/${filename}`;

    // 生成签名 URL（7 天有效）
    const [signedUrl] = await blob.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return {
      gcsPath,
      publicUrl: signedUrl,
    };
  }

  /**
   * 生成下载签名 URL
   */
  async getSignedUrl(gcsPath: string, expiresInHours = 1): Promise<string> {
    const filename = gcsPath.replace(`gs://${this.bucketName}/`, '');
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(filename);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresInHours * 60 * 60 * 1000,
    });

    return signedUrl;
  }

  /**
   * 删除文件
   */
  async deleteFile(gcsPath: string): Promise<void> {
    const filename = gcsPath.replace(`gs://${this.bucketName}/`, '');
    await this.storage.bucket(this.bucketName).file(filename).delete();
  }

  /**
   * 检查文件是否存在
   */
  async fileExists(gcsPath: string): Promise<boolean> {
    const filename = gcsPath.replace(`gs://${this.bucketName}/`, '');
    const [exists] = await this.storage
      .bucket(this.bucketName)
      .file(filename)
      .exists();
    return exists;
  }
}
```

#### 5.3 创建 Cloud Vision Service

```typescript
// apps/api/src/ocr/vision.service.ts
import { Injectable } from '@nestjs/common';
import vision from '@google-cloud/vision';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisionService {
  private client: vision.ImageAnnotatorClient;

  constructor(private prisma: PrismaService) {
    this.client = new vision.ImageAnnotatorClient();
  }

  /**
   * 从 GCS 文件提取文本
   */
  async extractTextFromGcs(gcsPath: string, documentId: string) {
    // 1. 调用 Vision API
    const [result] = await this.client.documentTextDetection(gcsPath);

    const fullText = result.fullTextAnnotation?.text || '';
    const language =
      result.fullTextAnnotation?.pages?.[0]?.property?.detectedLanguages?.[0]
        ?.languageCode || 'unknown';

    // 2. 计算平均置信度
    const confidences =
      result.fullTextAnnotation?.pages
        ?.flatMap((page) => page.blocks)
        ?.map((block) => block.confidence || 0) || [];

    const confidence =
      confidences.length > 0
        ? confidences.reduce((a, b) => a + b) / confidences.length
        : 0;

    // 3. 保存到数据库
    const ocrResult = await this.prisma.ocrResult.create({
      data: {
        documentId,
        fullText,
        structuredData: result.fullTextAnnotation || {},
        language,
        confidence,
        pageCount: result.fullTextAnnotation?.pages?.length || 1,
      },
    });

    return ocrResult;
  }

  /**
   * 从内存 Buffer 提取文本（用于实时预览）
   */
  async extractTextFromBuffer(buffer: Buffer): Promise<string> {
    const [result] = await this.client.documentTextDetection({
      image: { content: buffer },
    });

    return result.fullTextAnnotation?.text || '';
  }
}
```

#### 5.4 修改 UploadService

```typescript
// apps/api/src/upload/upload.service.ts
import { Injectable } from '@nestjs/common';
import { GcsService } from '../storage/gcs.service';
import { VisionService } from '../ocr/vision.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(
    private gcs: GcsService,
    private vision: VisionService,
    private prisma: PrismaService,
  ) {}

  async uploadFile(file: Express.Multer.File, userId?: string) {
    // 1. 上传到 GCS
    const { gcsPath, publicUrl } = await this.gcs.uploadFile(file);

    // 2. 保存元信息到数据库
    const document = await this.prisma.document.create({
      data: {
        userId,
        filename: file.originalname,
        gcsPath,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    // 3. 异步触发 OCR（不阻塞响应）
    if (this.needsOcr(file.mimetype)) {
      this.vision
        .extractTextFromGcs(gcsPath, document.id)
        .catch((err) => console.error('OCR failed:', err));
    }

    return {
      id: document.id,
      filename: document.filename,
      url: publicUrl,
      size: document.size,
      mimetype: document.mimeType,
    };
  }

  private needsOcr(mimetype: string): boolean {
    return ['application/pdf', 'image/png', 'image/jpeg'].includes(mimetype);
  }
}
```

---

### Step 6: 创建 Dockerfile（Cloud Run 部署）

```dockerfile
# apps/api/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# 安装 pnpm
RUN npm install -g pnpm

# 复制依赖文件
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/contracts/package.json ./packages/contracts/

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制源代码
COPY . .

# 生成 Prisma Client
WORKDIR /app/apps/api
RUN pnpm exec prisma generate

# 构建
RUN pnpm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

# 复制必要文件
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/package.json ./

# Cloud Run 使用 PORT 环境变量
ENV PORT=8080
EXPOSE 8080

# 启动前运行迁移
CMD ["sh", "-c", "cd apps/api && npx prisma migrate deploy && cd ../.. && node dist/main.js"]
```

---

### Step 7: 部署到 Cloud Run

```bash
# 1. 构建并推送镜像到 Artifact Registry
gcloud builds submit --tag gcr.io/study-oasis-prod/api

# 2. 部署到 Cloud Run
gcloud run deploy study-oasis-api \
  --image gcr.io/study-oasis-prod/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --add-cloudsql-instances study-oasis-prod:us-central1:study-oasis-db \
  --set-env-vars "NODE_ENV=production" \
  --set-secrets "DATABASE_URL=db-password:latest,DEEPSEEK_API_KEY=deepseek-api-key:latest" \
  --memory 512Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300

# 3. 获取服务 URL
gcloud run services describe study-oasis-api \
  --platform managed \
  --region us-central1 \
  --format 'value(status.url)'
# 输出: https://study-oasis-api-xxxxx-uc.a.run.app
```

**环境变量配置**:
```bash
# Cloud Run 会自动注入这些
DATABASE_URL="postgresql://api-user:PASSWORD@/studyoasis?host=/cloudsql/study-oasis-prod:us-central1:study-oasis-db"
GOOGLE_CLOUD_PROJECT="study-oasis-prod"
BUCKET_NAME="study-oasis-uploads"
```

---

### Step 8: 部署前端到 Firebase Hosting

```bash
# 1. 安装 Firebase CLI
npm install -g firebase-tools

# 2. 登录
firebase login

# 3. 初始化项目
cd apps/web
firebase init hosting

# 选项:
# - Public directory: out
# - Single-page app: Yes
# - Automatic builds: No

# 4. 配置环境变量
# apps/web/.env.production
NEXT_PUBLIC_API_URL=https://study-oasis-api-xxxxx-uc.a.run.app

# 5. 构建
pnpm run build
pnpm run export  # 生成静态文件到 out/

# 6. 部署
firebase deploy --only hosting

# 7. 获取 URL
firebase hosting:sites:list
```

**firebase.json**:
```json
{
  "hosting": {
    "public": "out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*.@(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      }
    ]
  }
}
```

---

## 🔧 本地开发配置

### 1. 安装依赖

```bash
# Google Cloud SDK
pnpm add @google-cloud/storage @google-cloud/vision @google-cloud/secret-manager

# Prisma
pnpm add prisma @prisma/client
```

### 2. 配置本地认证

```bash
# 下载服务账号密钥
gcloud iam service-accounts keys create ~/gcloud-key.json \
  --iam-account=PROJECT_ID@appspot.gserviceaccount.com

# 设置环境变量
export GOOGLE_APPLICATION_CREDENTIALS=~/gcloud-key.json
```

### 3. 启动 Cloud SQL Proxy

```bash
# 终端 1: 启动代理
cloud_sql_proxy -instances=study-oasis-prod:us-central1:study-oasis-db=tcp:5432

# 终端 2: 运行迁移
cd apps/api
npx prisma migrate dev

# 终端 3: 启动开发服务器
pnpm run start:dev
```

---

## 📊 监控和日志

### 1. Cloud Logging

```bash
# 查看 Cloud Run 日志
gcloud logging read "resource.type=cloud_run_revision" \
  --limit 50 \
  --format json

# 实时日志
gcloud logging tail "resource.type=cloud_run_revision"
```

### 2. Cloud Monitoring

```bash
# 创建告警策略
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="API Error Rate" \
  --condition-threshold-value=0.05 \
  --condition-threshold-duration=60s
```

### 3. Cloud Trace（分布式追踪）

```typescript
// apps/api/src/main.ts
import { TraceExporter } from '@google-cloud/opentelemetry-cloud-trace-exporter';
import { registerInstrumentations } from '@opentelemetry/instrumentation';

// 启用 Cloud Trace
const exporter = new TraceExporter();
registerInstrumentations({
  instrumentations: [
    // 自动追踪 HTTP 请求
  ],
});
```

---

## 🔒 安全最佳实践

### 1. IAM 权限最小化

```bash
# Cloud Run 服务账号只授予必要权限
gcloud projects add-iam-policy-binding study-oasis-prod \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding study-oasis-prod \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin" \
  --condition='resource.name.startsWith("projects/_/buckets/study-oasis-uploads")'
```

### 2. VPC Connector（私有网络）

```bash
# 创建 VPC Connector
gcloud compute networks vpc-access connectors create study-oasis-connector \
  --region us-central1 \
  --subnet-project study-oasis-prod \
  --subnet default \
  --min-instances 2 \
  --max-instances 10

# Cloud Run 使用 VPC Connector
gcloud run services update study-oasis-api \
  --vpc-connector study-oasis-connector \
  --vpc-egress private-ranges-only
```

### 3. Cloud Armor（DDoS 防护）

```bash
# 创建安全策略
gcloud compute security-policies create study-oasis-policy \
  --description "DDoS protection"

# 添加规则
gcloud compute security-policies rules create 1000 \
  --security-policy study-oasis-policy \
  --expression "origin.region_code == 'CN'" \
  --action "allow"

# 应用到 Load Balancer
gcloud compute backend-services update study-oasis-backend \
  --security-policy study-oasis-policy
```

---

## 🎯 性能优化

### 1. Cloud CDN

```bash
# 启用 Cloud CDN
gcloud compute backend-services update study-oasis-backend \
  --enable-cdn \
  --cache-mode=CACHE_ALL_STATIC \
  --default-ttl=3600 \
  --max-ttl=86400
```

### 2. Connection Pooling（Prisma）

```typescript
// apps/api/src/prisma/prisma.service.ts
import { PrismaClient } from '@prisma/client';

export class PrismaService extends PrismaClient {
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Cloud SQL 连接池配置
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      },
    });
  }
}
```

### 3. 预热实例

```bash
# 设置最小实例数（避免冷启动）
gcloud run services update study-oasis-api \
  --min-instances 1  # 保持 1 个实例常驻
```

---

## 🧪 测试清单

- [ ] Cloud SQL 连接成功
- [ ] 文件上传到 Cloud Storage
- [ ] Cloud Vision OCR 提取文本
- [ ] Secret Manager 读取密钥
- [ ] Cloud Run 部署成功
- [ ] Firebase Hosting 部署成功
- [ ] CORS 配置正确
- [ ] 日志正常输出到 Cloud Logging
- [ ] 监控告警配置
- [ ] 成本预算设置

---

## 💡 与其他方案对比

| 指标 | Google Cloud 全家桶 | AWS 全家桶 | Railway + Supabase |
|------|-------------------|-----------|-------------------|
| **集成度** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **OCR 质量** | ⭐⭐⭐⭐⭐ (Vision API) | ⭐⭐⭐⭐ (Textract) | ❌ 需第三方 |
| **初期成本** | $7-10/月 | $15-20/月 | $0-5/月 |
| **扩展成本** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **部署难度** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐ |
| **学习曲线** | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **中国访问** | ⚠️ 较慢 | ⚠️ 较慢 | ✅ 快 |

---

## 🎯 推荐场景

**选择 Google Cloud 全家桶，如果你**:
- ✅ 需要最好的 OCR 质量（Vision API）
- ✅ 想要统一的生态系统和控制台
- ✅ 计划使用更多 GCP 服务（BigQuery、AI Platform）
- ✅ 主要用户在海外

**不推荐，如果你**:
- ❌ 主要用户在中国大陆（访问慢）
- ❌ 需要极低成本（Railway 更便宜）
- ❌ 不熟悉云计算（Railway 更简单）

---

## 📚 参考资料

- [Cloud Run 文档](https://cloud.google.com/run/docs)
- [Cloud SQL 文档](https://cloud.google.com/sql/docs)
- [Cloud Storage 文档](https://cloud.google.com/storage/docs)
- [Cloud Vision API](https://cloud.google.com/vision/docs)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Prisma + Cloud SQL](https://www.prisma.io/docs/guides/database/using-prisma-with-google-cloud-sql)

---

需要我帮你开始实施某个具体步骤吗？我建议从 **Step 1: 创建 Google Cloud 项目** 开始！
