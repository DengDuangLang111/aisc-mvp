# API 文档说明

Study Oasis API 使用 **Swagger/OpenAPI** 自动生成交互式 API 文档。

## 📖 访问 API 文档

### 本地开发环境

启动后端服务后，访问：

```
http://localhost:4000/api-docs
```

或备用端口：

```
http://localhost:3001/api-docs
```

### 生产环境

```
https://your-domain.com/api-docs
```

## 🎯 功能特性

### 1. 交互式 API 测试

在 Swagger UI 中可以：
- ✅ 查看所有 API 端点
- ✅ 查看请求/响应格式
- ✅ 直接在浏览器中测试 API
- ✅ 查看示例代码

### 2. API 分组

API 按照功能模块分组：

- **Chat** (`/chat`): 聊天相关接口
  - POST `/chat` - 发送消息
  - GET `/chat/stream` - SSE 流式聊天
  - GET `/chat/conversations` - 获取对话列表
  - GET `/chat/conversations/:id` - 获取对话详情
  - DELETE `/chat/conversations/:id` - 删除对话

- **Upload** (`/upload`): 文件上传接口
  - POST `/upload` - 上传文件
  - GET `/upload/:fileId` - 下载文件
  - GET `/upload/:fileId/ocr` - OCR 识别
  - GET `/upload/documents` - 获取文档列表

- **Analytics** (`/analytics`): 数据分析接口
  - GET `/analytics/active-users` - 活跃用户统计
  - GET `/analytics/event-stats` - 事件统计
  - GET `/analytics/system-usage` - 系统使用情况

- **Health** (`/health`): 健康检查接口
  - GET `/health` - 系统健康状态

## 📝 使用示例

### 1. 测试聊天接口

```bash
# 使用 curl
curl -X POST http://localhost:4000/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "解释一下牛顿第一定律",
    "userId": "test-user",
    "conversationId": null,
    "hintLevel": 1
  }'
```

### 2. 上传文件

```bash
curl -X POST http://localhost:4000/upload \
  -F "file=@/path/to/your/file.pdf" \
  -F "userId=test-user"
```

### 3. 获取活跃用户数

```bash
curl http://localhost:4000/analytics/active-users?minutes=30
```

## 🔧 Swagger 配置

### 在 `main.ts` 中的配置

```typescript
const swaggerConfig = new DocumentBuilder()
  .setTitle('Study Oasis API')
  .setDescription('AI 学习助手 API 文档')
  .setVersion('1.0.0')
  .addTag('chat', '聊天相关接口')
  .addTag('upload', '文件上传接口')
  .addTag('health', '健康检查接口')
  .addServer('http://localhost:4000', '本地开发环境')
  .build();
```

### 自定义选项

```typescript
SwaggerModule.setup('api-docs', app, document, {
  customSiteTitle: 'Study Oasis API Documentation',
  customfavIcon: 'https://nestjs.com/img/logo-small.svg',
  customCss: '.swagger-ui .topbar { display: none }',
  swaggerOptions: {
    persistAuthorization: true,  // 保持授权状态
    docExpansion: 'list',        // 默认展开列表
    filter: true,                // 启用搜索过滤
    showRequestDuration: true,   // 显示请求耗时
  },
});
```

## 📦 导出 OpenAPI 规范

### JSON 格式

访问：
```
http://localhost:4000/api-docs-json
```

或使用命令行：
```bash
curl http://localhost:4000/api-docs-json > openapi.json
```

### YAML 格式

访问：
```
http://localhost:4000/api-docs-yaml
```

或使用命令行：
```bash
curl http://localhost:4000/api-docs-yaml > openapi.yaml
```

## 🎨 装饰器使用示例

### 控制器级别

```typescript
@ApiTags('chat')
@Controller('chat')
export class ChatController {
  // ...
}
```

### 方法级别

```typescript
@Post()
@ApiOperation({ 
  summary: '发送聊天消息', 
  description: '向 AI 助手发送消息并获取回复'
})
@ApiResponse({
  status: 200,
  description: '成功返回 AI 回复',
  type: ChatResponseDto,
})
@ApiBadRequestResponse({
  description: '请求参数错误',
})
async chat(@Body() request: ChatRequestDto): Promise<ChatResponse> {
  return this.chatService.chat(request);
}
```

### DTO 级别

```typescript
export class ChatRequestDto {
  @ApiProperty({
    description: '用户消息内容',
    example: '解释一下牛顿第一定律',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: '用户 ID',
    example: 'user-123',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;
}
```

## 🔐 安全性建议

### 生产环境

在生产环境中，建议：

1. **限制访问**

```typescript
// 只在非生产环境启用
if (process.env.NODE_ENV !== 'production') {
  SwaggerModule.setup('api-docs', app, document);
}
```

2. **添加认证**

```typescript
const swaggerConfig = new DocumentBuilder()
  .addBearerAuth()
  .build();
```

3. **使用 Basic Auth**

```typescript
SwaggerModule.setup('api-docs', app, document, {
  swaggerOptions: {
    authAction: {
      defaultBasicAuth: {
        name: 'basicAuth',
        schema: { type: 'http', scheme: 'basic' },
        value: { username: 'admin', password: 'password' }
      }
    }
  }
});
```

## 📚 相关资源

- [NestJS Swagger 文档](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI 规范](https://swagger.io/specification/)
- [Swagger UI 配置](https://swagger.io/docs/open-source-tools/swagger-ui/usage/configuration/)

## 🔄 更新文档

每次修改 API 后，Swagger 文档会自动更新，无需手动操作。

### 确保文档完整性

1. ✅ 使用 `@ApiTags()` 标记控制器
2. ✅ 使用 `@ApiOperation()` 描述端点
3. ✅ 使用 `@ApiResponse()` 定义响应
4. ✅ 使用 `@ApiProperty()` 描述 DTO 字段
5. ✅ 使用 `@ApiParam()` 描述路径参数
6. ✅ 使用 `@ApiQuery()` 描述查询参数
7. ✅ 使用 `@ApiBody()` 描述请求体

## 🎯 最佳实践

1. **详细的描述**: 为每个端点提供清晰的描述
2. **示例值**: 使用 `example` 属性提供示例
3. **错误响应**: 文档化所有可能的错误状态
4. **分组组织**: 使用标签合理组织 API
5. **版本管理**: 在配置中明确 API 版本

## 🚀 集成到 CI/CD

### 自动生成文档

```yaml
# .github/workflows/api-docs.yml
name: Generate API Docs

on:
  push:
    branches: [ main ]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Generate OpenAPI spec
        run: |
          npm run start:prod &
          sleep 10
          curl http://localhost:4000/api-docs-json > docs/openapi.json
```

### 部署到 GitHub Pages

生成的 `openapi.json` 可以用于：
- Swagger UI 静态部署
- Postman 导入
- 客户端代码生成
- API 测试自动化
