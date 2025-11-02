# 云数据库迁移方案

## 📊 方案对比

### 方案 A: Supabase (推荐初创项目)
**优势**:
- ✅ 免费套餐: 500MB 数据库 + 1GB 文件存储 + 5万月活
- ✅ 托管 PostgreSQL (自动备份、扩展)
- ✅ 内置实时订阅和认证系统
- ✅ 提供 RESTful API 和 GraphQL
- ✅ 自动生成 API 文档

**定价**:
- 免费版: $0/月
- Pro 版: $25/月 (8GB 数据库 + 100GB 存储)
- **预估**: 前期免费足够，扩展到 1000 用户约 $25/月

**快速开始**:
```bash
# 1. 注册 Supabase: https://supabase.com
# 2. 创建项目: study-oasis
# 3. 获取数据库连接字符串
```

**环境变量**:
```bash
# .env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
SUPABASE_URL="https://[PROJECT].supabase.co"
SUPABASE_ANON_KEY="your_anon_key"
```

**Prisma 配置**:
```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

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
  s3Key       String   // AWS S3 / OSS 存储路径
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
  structuredData Json     // Google Vision 返回的完整数据
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
  role           String   // 'user' | 'assistant' | 'system'
  content        String   @db.Text
  hintLevel      Int?
  modelUsed      String?  // 'deepseek-chat'
  tokensUsed     Int?
  timestamp      DateTime @default(now())
  
  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  @@index([conversationId])
}
```

**安装和初始化**:
```bash
# 安装 Prisma
pnpm add prisma @prisma/client

# 初始化
npx prisma init

# 创建迁移
npx prisma migrate dev --name init

# 生成客户端
npx prisma generate

# 可视化数据库
npx prisma studio
```

---

### 方案 B: PlanetScale (MySQL)
**优势**:
- ✅ 免费套餐: 5GB 存储 + 1B 行读取/月
- ✅ 自动扩展，无需维护
- ✅ 分支管理（像 Git 一样管理数据库）
- ✅ 内置连接池

**定价**:
- Hobby: $0/月
- Scaler: $39/月
- **预估**: 前期免费，扩展后 $39/月

---

### 方案 C: Railway (全栈托管平台)
**优势**:
- ✅ 同时托管数据库 + API 服务器
- ✅ 自动部署（连接 GitHub 自动 CI/CD）
- ✅ 免费套餐: $5 额度/月

**定价**:
- Developer: $5 额度/月（足够测试）
- Team: $20/月起
- **预估**: 开发阶段免费，生产环境 $20-50/月

---

### 方案 D: 自建云数据库（AWS RDS / 阿里云 RDS）
**优势**:
- ✅ 完全控制
- ✅ 支持所有高级特性

**劣势**:
- ❌ 成本高（最低 $15/月）
- ❌ 需要自己维护和备份

---

## 🎯 推荐方案

| 阶段 | 推荐方案 | 理由 |
|------|---------|------|
| **MVP 开发** | Supabase 免费版 | 0 成本，功能完整 |
| **小规模上线** | Supabase Pro ($25) | 自动备份，性能稳定 |
| **大规模生产** | AWS RDS / Aurora | 企业级可靠性 |

---

## 🚀 实施步骤（以 Supabase 为例）

### Step 1: 创建 Supabase 项目

1. 访问 https://supabase.com/dashboard
2. 点击 "New Project"
3. 填写信息:
   - Name: `study-oasis`
   - Database Password: 设置强密码
   - Region: 选择离用户最近的区域
4. 等待初始化完成 (~2分钟)

### Step 2: 配置 Prisma

```bash
# 安装依赖
cd apps/api
pnpm add prisma @prisma/client
pnpm add -D prisma
```

创建 `prisma/schema.prisma` (已在上面提供)

### Step 3: 配置环境变量

```bash
# apps/api/.env
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT].supabase.co:5432/postgres"
```

### Step 4: 运行迁移

```bash
# 创建并执行迁移
npx prisma migrate dev --name init

# 如果出错，可以先 reset
npx prisma migrate reset
```

### Step 5: 创建 Prisma Service

```typescript
// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

```typescript
// apps/api/src/prisma/prisma.module.ts
import { Module, Global } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### Step 6: 在 AppModule 中导入

```typescript
// apps/api/src/app.module.ts
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,  // 添加这行
    UploadModule,
    ChatModule,
    HealthModule,
  ],
  // ...
})
export class AppModule {}
```

### Step 7: 使用 Prisma

```typescript
// apps/api/src/upload/upload.service.ts
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UploadService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  async saveFile(file: Express.Multer.File): Promise<UploadResult> {
    // 1. 上传到 S3
    const { url, key } = await this.s3Service.uploadFile(file, key);

    // 2. 保存到数据库
    const document = await this.prisma.document.create({
      data: {
        id: uuidv4(),
        filename: sanitizedFilename,
        s3Key: key,
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return {
      id: document.id,
      filename: document.filename,
      url,
      size: document.size,
      mimetype: document.mimeType,
    };
  }

  async getFileInfo(fileId: string): Promise<FileInfo> {
    const document = await this.prisma.document.findUnique({
      where: { id: fileId },
      include: { ocrResult: true },
    });

    if (!document) {
      throw new NotFoundException('文件不存在');
    }

    // 生成新的预签名 URL
    const url = await this.s3Service.getSignedUrl(document.s3Key);

    return {
      id: document.id,
      filename: document.filename,
      url,
      size: document.size,
      mimetype: document.mimeType,
      uploadedAt: document.uploadedAt,
      ocrStatus: document.ocrResult ? 'completed' : 'pending',
      ocrText: document.ocrResult?.fullText,
    };
  }
}
```

---

## 🔄 数据迁移策略

### 从 localStorage 迁移到数据库

```typescript
// 迁移工具 API
@Controller('migration')
export class MigrationController {
  constructor(private prisma: PrismaService) {}

  @Post('import-conversations')
  async importConversations(@Body() data: { conversations: any[] }) {
    // 前端调用这个接口，批量导入 localStorage 数据
    for (const conv of data.conversations) {
      await this.prisma.conversation.create({
        data: {
          id: conv.id || uuidv4(),
          title: conv.messages[0]?.content.slice(0, 50),
          createdAt: new Date(conv.timestamp || Date.now()),
          messages: {
            create: conv.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
            })),
          },
        },
      });
    }

    return { success: true, count: data.conversations.length };
  }
}
```

**前端迁移脚本**:
```typescript
// apps/web/lib/migration.ts
export async function migrateToCloud() {
  // 1. 读取 localStorage
  const conversations = ChatStorage.getAllSessions();
  
  // 2. 上传到后端
  const response = await fetch('http://localhost:4000/migration/import-conversations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversations }),
  });

  // 3. 清空 localStorage（可选）
  if (response.ok) {
    localStorage.clear();
    console.log('✅ 迁移完成');
  }
}
```

---

## 📊 性能优化

### 1. 连接池配置

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  
  // 连接池配置
  pool_size = 10
  connection_limit = 20
}
```

### 2. 索引优化

```prisma
model Conversation {
  // ...
  
  @@index([userId])        // 查询用户的所有会话
  @@index([documentId])    // 查询文档相关会话
  @@index([createdAt])     // 按时间排序
}

model Message {
  // ...
  
  @@index([conversationId, timestamp])  // 查询会话消息
}
```

### 3. 查询优化

```typescript
// ❌ N+1 查询问题
const conversations = await prisma.conversation.findMany();
for (const conv of conversations) {
  const messages = await prisma.message.findMany({
    where: { conversationId: conv.id },
  });
}

// ✅ 使用 include 预加载
const conversations = await prisma.conversation.findMany({
  include: {
    messages: {
      orderBy: { timestamp: 'asc' },
      take: 10,  // 只加载最近 10 条
    },
  },
});
```

---

## 💰 成本预估

**Supabase 免费版限制**:
- 500MB 数据库存储
- 1GB 文件存储
- 5万月活用户
- 2GB 出站流量

**预估数据量**:
- 1000 用户 × 平均 10 个会话 = 10,000 条会话
- 每个会话 20 条消息 × 500 字符 = ~200MB
- OCR 结果: 1000 文档 × 10KB = ~10MB
- **总计**: ~210MB (免费版够用)

**扩展到 Pro 版时机**:
- 用户数 > 5000
- 数据库 > 500MB
- 需要更高性能

---

## 🛡️ 安全最佳实践

### 1. Row Level Security (RLS)

```sql
-- 在 Supabase SQL 编辑器执行
-- 启用 RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- 用户只能访问自己的数据
CREATE POLICY "Users can only access their own documents"
ON documents
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Users can only access their own conversations"
ON conversations
FOR ALL
USING (auth.uid() = user_id);
```

### 2. 连接字符串保护

```bash
# ❌ 不要暴露在代码中
const DATABASE_URL = "postgresql://postgres:password@..."

# ✅ 使用环境变量
DATABASE_URL="${DATABASE_URL}"
```

### 3. 定期备份

Supabase 自动每日备份（保留 7 天）
手动备份:
```bash
# 使用 pg_dump
pg_dump $DATABASE_URL > backup.sql

# 恢复
psql $DATABASE_URL < backup.sql
```

---

## 🧪 测试清单

- [ ] 连接数据库成功
- [ ] 运行 Prisma 迁移
- [ ] 创建第一条记录
- [ ] 查询数据
- [ ] 测试关联查询 (include)
- [ ] 测试事务
- [ ] 测试并发写入
- [ ] 验证索引性能
- [ ] 测试备份恢复

---

## 📚 参考资料

- [Supabase 官方文档](https://supabase.com/docs)
- [Prisma 官方文档](https://www.prisma.io/docs)
- [PlanetScale 文档](https://planetscale.com/docs)
- [Railway 文档](https://docs.railway.app)
- [PostgreSQL 性能优化](https://wiki.postgresql.org/wiki/Performance_Optimization)
