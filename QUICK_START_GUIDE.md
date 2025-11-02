# 🚀 快速启动指南 - Study Oasis 新功能

**创建日期**：2025-11-02  
**版本**：1.0  
**状态**：✅ 可用

---

## 🎯 系统现状

### ✅ 已完成
- ✅ 对话界面（支持连续对话）
- ✅ 对话列表管理
- ✅ 文档管理界面
- ✅ 用户仪表盘
- ✅ 错误处理和重试机制
- ✅ 移动端适配

### ⏳ 待完成（Phase 2）
- ⏳ 文件上传流程
- ⏳ 流式响应（打字机效果）
- ⏳ 搜索功能
- ⏳ 导出功能

### 🔴 未实现（用户认证前）
- 用户认证系统

---

## 🔌 系统启动

### 前提条件
- Node.js 18+ 已安装
- 后端 API 配置正确
- 数据库连接正常

### 启动后端

```bash
# 进入后端目录
cd /Users/knight/study_oasis_simple/apps/api

# 安装依赖（如需）
npm install

# 启动开发服务器
npm run start

# 预期输出
# [Nest] 11/02/2025, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 11/02/2025, 10:00:02 AM     LOG [InstanceLoader] AppModule dependencies initialized
# [Nest] 11/02/2025, 10:00:03 AM     LOG [NestApplication] Nest application successfully started on port 4001
```

### 启动前端

```bash
# 进入前端目录
cd /Users/knight/study_oasis_simple/apps/web

# 安装依赖（如需）
npm install

# 启动开发服务器
npm run dev

# 预期输出
# > study-oasis@1.0.0 dev
# > next dev -p 3000
# ▲ Next.js 16.0.0
# - ready started server on 0.0.0.0:3000, url: http://localhost:3000
```

### 验证系统

```bash
# 运行验证脚本
bash /Users/knight/study_oasis_simple/verify-system.sh

# 预期输出
# ✅ 后端服务运行正常
# ✅ 前端服务运行正常
# ✅ page.tsx 存在
# ✅ /chat 端点正常
```

---

## 🌐 访问新功能

### 主要页面

#### 1. 对话页面（主功能）
**URL**：http://localhost:3000/chat  
**功能**：
- 与 AI 助手对话
- 连续多轮对话（支持历史记录）
- 显示 Hint Level 提示等级
- 支持文件上传（预留）

**快速测试**：
```bash
1. 打开 http://localhost:3000/chat
2. 输入问题：「请教我一个数学概念」
3. 查看 AI 回复
4. 继续提问：「能再详细解释一下吗？」
5. 验证 AI 能记住之前的对话
```

---

#### 2. 对话列表页面
**URL**：http://localhost:3000/chat/conversations  
**功能**：
- 查看所有对话历史
- 按时间排序
- 显示对话预览
- 快速返回对话
- 删除不需要的对话

**快速测试**：
```bash
1. 打开 http://localhost:3000/chat/conversations
2. 查看之前创建的对话
3. 点击任意对话返回继续聊天
4. 点击「+ 新建对话」创建新对话
```

---

#### 3. 文档管理页面
**URL**：http://localhost:3000/documents  
**功能**：
- 查看所有上传的文档
- 显示 OCR 处理状态
- 查看识别结果
- 从文档开始对话
- 删除文档

**快速测试**：
```bash
1. 打开 http://localhost:3000/documents
2. 查看上传的文档列表
3. 点击文档查看详细信息
4. 检查 OCR 状态
```

**注**：需要先完成 Task 4（文件上传）后才能看到文档列表。

---

#### 4. 用户仪表盘（Analytics）
**URL**：http://localhost:3000/dashboard  
**功能**：
- 查看学习统计
- API 使用成本
- Token 消耗统计
- 快速访问链接
- 使用建议

**快速测试**：
```bash
1. 打开 http://localhost:3000/dashboard
2. 查看统计卡片
3. 点击快速访问链接导航
4. 阅读使用建议
```

---

## 💡 功能演示

### 场景 1：单个对话

```
用户：打开 /chat
系统：显示空的对话界面

用户：输入「请解释一下光合作用」
系统：显示用户消息 + AI 回复 + Hint Level 1 徽章

用户：输入「为什么需要光？」
系统：显示之前的对话 + 新的用户消息 + AI 回复

✅ 对话上下文保持完整，AI 理解前后文
```

### 场景 2：多个对话管理

```
用户：打开 /chat/conversations
系统：显示以前创建的所有对话

用户：点击某个对话
系统：返回 /chat 并加载该对话历史

用户：清空对话或删除对话
系统：对话被移除或重置

✅ 可以管理多个独立的对话
```

### 场景 3：仪表盘

```
用户：打开 /dashboard
系统：显示统计信息
- 总消息数：显示用户发送的所有消息数
- 上传文档：显示上传的文档数
- 使用 Tokens：显示 API 消耗的 tokens
- 预估成本：显示基于 token 数计算的成本

用户：点击快速访问链接
系统：导航到对应的页面

✅ 可以掌握学习统计和系统使用情况
```

---

## 🔧 配置和自定义

### 环境变量

**后端**（`.env` in `/apps/api`）：
```
# 数据库
DATABASE_URL=your_database_url

# 外部 API
DEEPSEEK_API_KEY=your_deepseek_key
GOOGLE_CLOUD_KEY=your_gcloud_key

# 服务配置
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket
API_PORT=4001
```

**前端**（`.env.local` in `/apps/web`）：
```
# API 地址
NEXT_PUBLIC_API_URL=http://localhost:4001
```

---

## 📊 数据存储

### localStorage（前端）
```javascript
// 对话历史存储在 localStorage 中
// 清除方法：
localStorage.clear()

// 或删除特定会话
localStorage.removeItem('chatSession_id')
```

### 数据库（后端）
```
- conversations 表：存储对话记录
- messages 表：存储聊天消息
- documents 表：存储上传的文件
- ocr_results 表：存储 OCR 识别结果
```

---

## 🐛 故障排查

### 问题 1：前端无法连接后端

**症状**：对话页面提示「发送失败」

**解决方案**：
```bash
# 1. 检查后端是否运行
curl http://localhost:4001/health

# 2. 检查环境变量
echo $NEXT_PUBLIC_API_URL

# 3. 检查防火墙
# 确保 4001 端口未被占用
lsof -i :4001

# 4. 重启前端和后端
```

### 问题 2：对话不显示历史消息

**症状**：每条新消息看起来都是独立的对话

**解决方案**：
```bash
# 1. 检查 localStorage 是否启用
# 打开浏览器开发者工具 → Console
# 输入：localStorage.getItem('chatSessions')

# 2. 清除浏览器缓存
# 硬刷新：Cmd + Shift + R (Mac) 或 Ctrl + Shift + R (Windows)

# 3. 检查浏览器隐私设置
# 确保允许 localStorage
```

### 问题 3：文件上传不可用

**症状**：上传按钮不可点击或不存在

**预期**：Task 4 完成后才能使用，目前仅有按钮框架

**解决方案**：等待 Phase 2（预计 2025-11-03）

---

## 📈 性能优化建议

### 前端优化
1. **缓存策略**
   ```
   - 对话列表缓存 5 分钟
   - 文档列表缓存 10 分钟
   ```

2. **图片优化**
   ```
   - 使用 WebP 格式
   - 启用图片懒加载
   ```

3. **代码分割**
   ```
   - 按路由分割
   - 按功能分割
   ```

### 后端优化
1. **数据库索引**
   ```sql
   CREATE INDEX idx_conversations_userid ON conversations(user_id);
   CREATE INDEX idx_messages_conversationid ON messages(conversation_id);
   ```

2. **缓存层**
   ```
   - Redis 缓存 API 结果
   - 缓存 OCR 识别结果
   ```

---

## 🧪 测试命令

### 测试对话功能
```bash
# 发送测试消息
curl -X POST http://localhost:4001/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"hello","conversationHistory":[]}'

# 获取对话列表
curl http://localhost:4001/chat/conversations
```

### 测试文档功能
```bash
# 获取文档列表
curl http://localhost:4001/upload/documents

# 删除文档
curl -X DELETE http://localhost:4001/upload/documents/{id}
```

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| `EXECUTION_COMPLETION_REPORT.md` | Phase 1 完成报告 |
| `PHASE_1_COMPLETION.md` | 详细的完成情况 |
| `TASK_4_IMPLEMENTATION_GUIDE.md` | 文件上传实现指南 |
| `DEVELOPMENT_PROGRESS.md` | 整体开发进度 |
| `QUICK_FIX_GUIDE.md` | 对话上下文快速修复 |

---

## 🎓 开发者注意事项

### 代码风格
- ✅ TypeScript 严格模式
- ✅ React Hooks 优先
- ✅ Tailwind CSS 样式
- ✅ 完整的类型定义

### 最佳实践
- 始终使用 `const` 定义组件
- 在 hooks 中处理副作用
- 提供完整的错误处理
- 编写清晰的注释

### 提交前检查
```bash
# 运行 linter
npm run lint

# 运行测试
npm run test

# 构建检查
npm run build

# 类型检查
npm run type-check
```

---

## 🎯 下一步行动

### 立即可做
- [x] 测试对话功能
- [x] 查看对话列表
- [x] 浏览文档管理
- [x] 查看仪表盘

### 近期计划（Task 4）
- [ ] 实现文件上传
- [ ] 集成 OCR 处理
- [ ] 测试完整流程

### 长期计划（Task 5+）
- [ ] 实现流式响应
- [ ] 添加搜索功能
- [ ] 优化性能

---

## 📞 联系支持

### 问题反馈
1. 检查故障排查部分
2. 查看相关文档
3. 检查日志输出
4. 报告给开发团队

### 功能建议
- 创建 Issue 记录
- 在 PR 中讨论
- 组织评审会议

---

## ✅ 使用清单

在使用系统前，请确保：

- [ ] 已安装 Node.js 18+
- [ ] 后端服务正在运行（Port 4001）
- [ ] 前端服务正在运行（Port 3000）
- [ ] 数据库连接正常
- [ ] 环境变量已配置
- [ ] 浏览器支持 localStorage
- [ ] 网络连接正常

---

**最后更新**：2025-11-02 11:30 UTC+8  
**下次更新**：Phase 2 完成后  
**维护者**：AI Agent  

🎉 **祝你使用愉快！** 🎉
