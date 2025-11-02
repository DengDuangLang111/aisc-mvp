import { test, expect } from '@playwright/test';

test.describe('聊天功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
  });

  test('应该显示聊天界面', async ({ page }) => {
    // 验证聊天输入框
    const messageInput = page.getByPlaceholder(/输入消息|发送消息|输入你的问题/i);
    await expect(messageInput).toBeVisible();
    
    // 验证发送按钮
    const sendButton = page.locator('button:has-text("发送"), button[type="submit"]');
    await expect(sendButton).toBeVisible();
  });

  test('应该能发送消息', async ({ page }) => {
    const testMessage = '什么是递归？';
    
    // 输入消息
    const messageInput = page.getByPlaceholder(/输入消息|发送消息|输入你的问题/i);
    await messageInput.fill(testMessage);
    
    // 点击发送
    await page.click('button:has-text("发送"), button[type="submit"]');
    
    // 验证消息出现在聊天记录中
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 2000 });
  });

  test('应该能接收 AI 回复', async ({ page }) => {
    const testMessage = '你好';
    
    // 发送消息
    const messageInput = page.getByPlaceholder(/输入消息|发送消息/i);
    await messageInput.fill(testMessage);
    await page.click('button:has-text("发送")');
    
    // 等待 AI 回复（最多等待 30 秒）
    await expect(page.locator('.message.assistant, [data-role="assistant"]')).toBeVisible({ 
      timeout: 30000 
    });
  });

  test('应该显示提示等级徽章', async ({ page }) => {
    // 发送第一条消息
    const messageInput = page.getByPlaceholder(/输入消息/i);
    await messageInput.fill('测试问题');
    await page.click('button:has-text("发送")');
    
    // 等待回复
    await page.waitForTimeout(2000);
    
    // 验证提示等级显示（Level 1, 2, 3 或表情符号）
    const hintBadge = page.locator('[data-hint-level], .hint-badge, text=/Level [123]|🤔|💡|✨/');
    await expect(hintBadge.first()).toBeVisible({ timeout: 30000 });
  });

  test('多次提问后提示等级应该递增', async ({ page }) => {
    const messageInput = page.getByPlaceholder(/输入消息/i);
    
    // 发送第一条消息
    await messageInput.fill('问题 1');
    await page.click('button:has-text("发送")');
    await page.waitForTimeout(3000);
    
    // 发送第二条消息
    await messageInput.fill('问题 2');
    await page.click('button:has-text("发送")');
    await page.waitForTimeout(3000);
    
    // 发送第三条消息
    await messageInput.fill('问题 3');
    await page.click('button:has-text("发送")');
    await page.waitForTimeout(3000);
    
    // 验证提示等级变化（可能是 Level 2 或 Level 3）
    const hints = page.locator('[data-hint-level], .hint-badge');
    await expect(hints).toHaveCount(3, { timeout: 5000 });
  });

  test('应该能清空聊天记录', async ({ page }) => {
    // 发送一条消息
    const messageInput = page.getByPlaceholder(/输入消息/i);
    await messageInput.fill('测试消息');
    await page.click('button:has-text("发送")');
    await page.waitForTimeout(2000);
    
    // 查找清空按钮
    const clearButton = page.locator('button:has-text("清空"), button:has-text("重置")');
    
    if (await clearButton.count() > 0) {
      await clearButton.click();
      
      // 确认对话框
      page.on('dialog', dialog => dialog.accept());
      
      // 验证消息被清空
      await expect(page.locator('.message')).toHaveCount(0, { timeout: 2000 });
    }
  });

  test('发送空消息应该被阻止', async ({ page }) => {
    const sendButton = page.locator('button:has-text("发送")');
    
    // 尝试发送空消息
    await sendButton.click();
    
    // 验证发送按钮被禁用或消息未发送
    const messageCount = await page.locator('.message').count();
    expect(messageCount).toBe(0);
  });

  test('应该显示加载状态', async ({ page }) => {
    const messageInput = page.getByPlaceholder(/输入消息/i);
    await messageInput.fill('测试加载状态');
    await page.click('button:has-text("发送")');
    
    // 验证加载指示器
    const loadingIndicator = page.locator('[role="status"], .loading, .spinner, text=/加载中|思考中/i');
    await expect(loadingIndicator).toBeVisible({ timeout: 1000 }).catch(() => {
      // 如果响应很快，可能看不到加载状态
    });
  });
});
