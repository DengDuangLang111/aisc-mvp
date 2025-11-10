# 云存储迁移方案

> [!NOTE]
> 2025-11-10 更新：生产环境已经全面切换到 Google Cloud Storage，并使用 `gcsPath` 字段记录对象路径。下文保留 AWS S3 方案供历史参考或多云容灾之用。

## 📦 方案对比

### 方案 A: AWS S3 (推荐)
**优势**:
- ✅ 全球最成熟的对象存储服务
- ✅ 99.999999999% (11个9) 数据持久性
- ✅ 支持版本控制、生命周期管理
- ✅ 集成 CloudFront CDN 加速访问
- ✅ 按使用量付费，前 5GB 免费

**定价** (US East):
- 存储: $0.023/GB/月
- PUT 请求: $0.005/1000 次
- GET 请求: $0.0004/1000 次
- **预估**: 1000 个文件 (10GB) ≈ $0.5/月

**集成代码**:
```typescript
// apps/api/src/storage/s3.service.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

@Injectable()
export class S3Service {
  private s3Client: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.s3Client = new S3Client({
      region: config.get('AWS_REGION'),
      credentials: {
        accessKeyId: config.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.get('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.get('AWS_S3_BUCKET');
  }

  async uploadFile(
    file: Express.Multer.File,
    key: string,
  ): Promise<{ url: string; key: string }> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // 设置为私有，通过预签名 URL 访问
      ACL: 'private',
    });

    await this.s3Client.send(command);

    // 生成 7 天有效的下载链接
    const url = await getSignedUrl(
      this.s3Client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 604800 } // 7 days
    );

    return { url, key };
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }
}
```

**修改 UploadService**:
```typescript
// apps/api/src/upload/upload.service.ts
@Injectable()
export class UploadService {
  constructor(
    private s3Service: S3Service,  // 注入 S3 服务
    private prisma: PrismaService,
  ) {}

  async saveFile(file: Express.Multer.File): Promise<UploadResult> {
    // 1. 验证文件（保持现有逻辑）
    await this.validateFileType(file);
    const sanitizedFilename = this.sanitizeFilename(file.originalname);
    const uniqueId = uuidv4();
    const key = `uploads/${uniqueId}/${sanitizedFilename}`;

    // 2. 上传到 S3（替换本地存储）
    const { url } = await this.s3Service.uploadFile(file, key);

    // 3. 保存元信息到数据库
    const document = await this.prisma.document.create({
      data: {
        id: uniqueId,
        filename: sanitizedFilename,
        gcsPath: key,  // 复用 gcsPath 字段存储对象路径
        mimeType: file.mimetype,
        size: file.size,
      },
    });

    return {
      id: uniqueId,
      filename: sanitizedFilename,
      url,  // 预签名 URL
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async getFileUrl(fileId: string): Promise<string> {
    const document = await this.prisma.document.findUnique({
      where: { id: fileId },
    });

    if (!document) {
      throw new NotFoundException('文件不存在');
    }

    // 生成新的预签名 URL（1小时有效）
    return this.s3Service.getSignedUrl(document.gcsPath, 3600);
  }
}
```

**环境变量** (`.env`):
```bash
# AWS S3 配置
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=study-oasis-uploads
```

**安装依赖**:
```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

### 方案 B: 阿里云 OSS
**优势**:
- ✅ 国内访问速度快
- ✅ 中文文档和支持
- ✅ 价格比 AWS 便宜 30-40%

**定价**:
- 存储: ¥0.12/GB/月
- PUT 请求: ¥0.01/万次
- GET 请求: ¥0.01/万次
- **预估**: 1000 个文件 (10GB) ≈ ¥1.5/月

**集成代码**:
```typescript
import OSS from 'ali-oss';

@Injectable()
export class OssService {
  private client: OSS;

  constructor(private config: ConfigService) {
    this.client = new OSS({
      region: config.get('OSS_REGION'),
      accessKeyId: config.get('OSS_ACCESS_KEY_ID'),
      accessKeySecret: config.get('OSS_ACCESS_KEY_SECRET'),
      bucket: config.get('OSS_BUCKET'),
    });
  }

  async uploadFile(file: Express.Multer.File, key: string) {
    const result = await this.client.put(key, file.buffer);
    
    // 生成带签名的 URL（1小时有效）
    const url = this.client.signatureUrl(key, { expires: 3600 });
    
    return { url, key };
  }
}
```

---

### 方案 C: Google Cloud Storage
**优势**:
- ✅ 与 Google Vision OCR 深度集成
- ✅ 统一账单管理

**定价**:
- 存储: $0.020/GB/月
- 操作请求: $0.05/万次
- **预估**: 1000 个文件 (10GB) ≈ $0.3/月

---

## 📊 方案推荐

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| **海外用户为主** | AWS S3 | 全球节点最多，稳定性最好 |
| **国内用户为主** | 阿里云 OSS | 速度快，价格便宜 |
| **已用 Google OCR** | Google Cloud Storage | 同一生态，集成方便 |

---

## 🔄 迁移步骤

### Phase 1: 创建云存储服务
1. 注册云服务商账号
2. 创建 S3 Bucket / OSS Bucket
3. 配置 CORS 和访问策略
4. 创建 IAM 用户和 Access Key

### Phase 2: 实现 Storage Service
```bash
# 创建新模块
nest g module storage
nest g service storage
```

### Phase 3: 重构 UploadService
- 替换 `fs.writeFile` 为 `s3Service.uploadFile`
- 修改 `getFileUrl` 使用预签名 URL
- 更新数据库字段存储 S3 key

### Phase 4: 数据迁移
```typescript
// 迁移脚本
async function migrateLocalFilesToS3() {
  const files = await fs.readdir('./uploads');
  
  for (const filename of files) {
    const buffer = await fs.readFile(`./uploads/${filename}`);
    const key = `uploads/${filename}`;
    
    await s3Service.uploadFile({
      buffer,
      originalname: filename,
      mimetype: 'application/octet-stream',
    }, key);
    
    console.log(`Migrated: ${filename}`);
  }
}
```

### Phase 5: 验证和监控
- 测试文件上传和下载
- 监控 S3 请求成本
- 设置告警（超出配额、错误率高）

---

## 💰 成本估算

**月度成本预估** (1000 活跃用户):

| 项目 | 用量 | AWS S3 成本 | 阿里云 OSS 成本 |
|------|------|------------|---------------|
| 存储 (50GB) | 50GB | $1.15 | ¥6 |
| 上传请求 | 10万次 | $0.50 | ¥0.10 |
| 下载请求 | 50万次 | $0.20 | ¥0.50 |
| **总计** | - | **$1.85** | **¥6.6** |

**结论**: 云存储成本极低，远低于自建服务器的成本。

---

## 🚀 快速开始

### 1. AWS S3 快速设置

```bash
# 安装 AWS CLI
brew install awscli  # macOS
# 或访问: https://aws.amazon.com/cli/

# 配置凭证
aws configure

# 创建 Bucket
aws s3 mb s3://study-oasis-uploads --region us-east-1

# 设置 CORS
aws s3api put-bucket-cors --bucket study-oasis-uploads --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST"],
    "AllowedHeaders": ["*"]
  }]
}'
```

### 2. 阿里云 OSS 快速设置

访问: https://oss.console.aliyun.com/
1. 创建 Bucket: `study-oasis-uploads`
2. 设置读写权限: **私有**
3. 配置 CORS: 允许所有源访问
4. 创建 AccessKey

---

## ⚠️ 注意事项

1. **安全性**:
   - ❌ 不要直接暴露 Access Key
   - ✅ 使用 IAM 角色（部署在云端时）
   - ✅ 设置 Bucket Policy 限制访问

2. **成本控制**:
   - 设置生命周期规则（30 天后删除临时文件）
   - 启用压缩存储
   - 监控异常流量

3. **性能优化**:
   - 使用 CDN 加速下载
   - 多部分上传大文件 (>5MB)
   - 客户端直传（生成预签名 POST URL）

4. **灾难恢复**:
   - 启用版本控制
   - 跨区域复制
   - 定期备份到另一个 Bucket

---

## 🧪 测试清单

- [ ] 上传文件到 S3
- [ ] 生成预签名 URL 下载
- [ ] 删除文件
- [ ] 处理上传失败（网络错误）
- [ ] 测试不同文件类型
- [ ] 验证 CORS 配置
- [ ] 测试超大文件 (>100MB)
- [ ] 监控成本和请求数

---

## 📚 参考资料

- [AWS S3 官方文档](https://docs.aws.amazon.com/s3/)
- [阿里云 OSS 文档](https://help.aliyun.com/product/31815.html)
- [Google Cloud Storage 文档](https://cloud.google.com/storage/docs)
- [@aws-sdk/client-s3 npm](https://www.npmjs.com/package/@aws-sdk/client-s3)
- [ali-oss npm](https://www.npmjs.com/package/ali-oss)
