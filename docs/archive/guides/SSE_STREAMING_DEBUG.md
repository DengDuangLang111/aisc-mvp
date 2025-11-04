# SSE 流式响应问题排查记录

## 问题描述
后端 SSE 正常返回流式数据（已验证 curl 可以看到逐字返回），但前端 UI 不能实时显示每个字符，而是等所有 chunks 接收完才一次性显示。

## 已尝试的解决方案

### ❌ 方案1: flushSync 强制同步更新
```typescript
import { flushSync } from 'react-dom';
flushSync(() => {
  setMessages(/* ... */);
});
```
**结果**: 在 Next.js 环境下不生效
**原因**: flushSync 在 Server Components 环境有限制

---

### ❌ 方案2: setTimeout 延迟批处理
```typescript
await new Promise(resolve => {
  setMessages(/* ... */);
  setTimeout(resolve, 0);
});
```
**结果**: 所有 chunks 接收完才批量渲染
**原因**: setTimeout 把所有更新推到宏任务队列，React 批处理了所有更新

---

### ❌ 方案3: Promise.resolve() 微任务
```typescript
setMessages(/* ... */);
await Promise.resolve();
```
**结果**: 只渲染2次（初始 + 最终），中间 chunks 没触发渲染
**原因**: React 18 自动批处理优化，相邻的 setState 被合并

---

### ❌ 方案4: useRef 避免闭包
```typescript
const streamingContentRef = useRef<string>('');
streamingContentRef.current += chunk.token;
setMessages(prev => {
  // 从 ref 读取最新值
  updated[index].content = streamingContentRef.current;
});
```
**结果**: 依然只渲染2次
**控制台日志**:
- ✅ 收到 70+ chunks: `[Stream] Received chunk: 你好 | Total length: 2`
- ❌ 只渲染2次: `[MessageBubble] Rendering with content length: 0` (x2)
**原因**: React 判断 state 没有实质变化（因为批处理），跳过中间渲染

---

## 根本问题分析

### React 18 自动批处理机制
React 18 会自动批处理多个 setState 调用，即使在异步函数中：
- 在同一个事件循环中的多个 setState 会被合并
- React 认为连续更新同一个数组的最后一项 = 没有实质变化
- 优化：只渲染最后一次状态

### 当前代码的问题
```typescript
for await (const chunk of stream) {
  streamingContentRef.current += chunk.token;
  setMessages(prev => {
    // 每次都是修改 prev 数组的最后一项
    // React 看到的是: 同一个位置，不同内容
    // 批处理后: 只保留最后一次更新
    updated[lastIndex] = { content: newContent };
  });
}
```

---

### ❌ 方案5: 强制创建新消息对象
```typescript
setMessages((prev) => {
  const withoutLast = prev.slice(0, -1);
  return [...withoutLast, { role: 'assistant', content: newContent }];
});
```
**结果**: 依然只渲染2次
**原因**: 即使删除再添加，React 批处理依然认为这是同一个更新周期的操作

---

### ❌ 方案7: 分离流式状态
```typescript
const [streamingContent, setStreamingContent] = useState<string>('');
for await (const chunk of stream) {
  fullResponse += chunk.token;
  setStreamingContent(fullResponse);
}
// 在 MessageList 单独渲染
{isStreaming && <MessageBubble message={{content: streamingContent}} />}
```
**结果**: UI 完全不显示流式内容，连调试框都没出现
**控制台日志**:
- ✅ 收到 100+ chunks
- ❌ 没有 `[Stream] Updated streamingContent` 日志
- ❌ 没有渲染任何流式 UI
**原因**: React 18 自动批处理太激进！即使是独立的字符串 state，在 async 循环中的连续 setState 依然被批处理

**关键发现**: React 18 的自动批处理在 `for await` 循环中会批处理所有更新，直到循环结束！

---

### ✅ 方案10: requestAnimationFrame + 节流（成功！）
```typescript
for await (const chunk of stream) {
  fullResponse += chunk.token;
  
  const now = Date.now();
  if (now - lastUpdateTime >= 50) { // 节流50ms
    lastUpdateTime = now;
    const currentContent = fullResponse;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        setStreamingContent(currentContent);
        resolve();
      });
    });
  }
}
```
**结果**: ✅ 成功实现实时流式效果！
**用户反馈**: 
- ✅ 可以看到流式过程
- ⚠️ 前面有空窗期（已修复：立即显示占位符）
- ⚠️ 文字输出太快（已修复：添加50ms节流）
- ✅ 调试框已删除

**成功原因**: 
1. `requestAnimationFrame` 强制每次更新在独立的渲染帧中执行
2. 节流控制更新频率，避免过快
3. 立即值传递 `const currentContent = fullResponse` 避免闭包问题
4. 独立的 `streamingContent` state，不受 messages 数组批处理影响

---

## 下一步尝试方案

### 🔄 方案6: 使用 useReducer
思路: reducer 的 dispatch 机制可能不受批处理影响

### 🔄 方案8: flushSync + 分离状态（正在尝试）
思路: 结合方案1和方案7 - 使用独立的 streamingContent state，但用 flushSync 强制同步刷新
```typescript
import { flushSync } from 'react-dom';
for await (const chunk of stream) {
  fullResponse += chunk.token;
  flushSync(() => {
    setStreamingContent(fullResponse);
  });
}
```
**理论**: flushSync 会强制 React 立即同步刷新 DOM，打破 for await 循环中的批处理

### 🔄 方案9: Web Streams API
思路: 不使用 for await，改用 ReadableStream.getReader() 的事件驱动模式

### 🔄 方案10: 使用第三方库
思路: 使用 use-sse 或类似库，它们已经解决了这个问题
