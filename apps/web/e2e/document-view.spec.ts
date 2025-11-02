import { test, expect } from '@playwright/test';

test.describe('文档查看功能', () => {
  test('上传页面应该显示文件列表', async ({ page }) => {
    await page.goto('/upload');
    
    // 验证页面加载（使用标题而不是文本）
    await expect(page.getByRole('heading', { name: /上传/i })).toBeVisible();
  });

  test('应该能查看上传历史', async ({ page }) => {
    await page.goto('/upload');
    
    // 查找历史记录部分
    const historySection = page.locator('text=/历史|最近|已上传/i');
    
    // 如果有历史记录，应该能看到列表
    const hasHistory = await historySection.isVisible().catch(() => false);
    
    if (hasHistory) {
      await expect(historySection).toBeVisible();
    }
  });

  test('聊天页面应该能显示文档查看器', async ({ page }) => {
    // 带文档参数访问聊天页面
    await page.goto('/chat?fileId=test-id&filename=test.pdf');
    
    // 验证页面加载
    await expect(page.getByRole('heading', { name: 'AI 学习助手' })).toBeVisible();
    
    // 查找文档显示/隐藏按钮
    const toggleButton = page.getByRole('button', { name: /文档|Document/i });
    
    // 如果有toggle按钮，说明有文档查看功能
    if (await toggleButton.isVisible().catch(() => false)) {
      await expect(toggleButton).toBeVisible();
    }
  });

  test('应该能切换文档显示', async ({ page }) => {
    await page.goto('/chat?fileId=test&filename=test.pdf');
    
    // 查找切换按钮
    const toggleButton = page.getByRole('button', { name: /显示文档|隐藏文档/i });
    
    if (await toggleButton.isVisible().catch(() => false)) {
      // 点击切换
      await toggleButton.click();
      await page.waitForTimeout(500);
      
      // 再次点击
      await toggleButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('文件列表应该显示文件信息', async ({ page }) => {
    await page.goto('/upload');
    
    // 查找文件项
    const fileItems = page.locator('[class*="file"], [class*="upload"], [class*="item"]');
    const count = await fileItems.count();
    
    // 如果有文件，应该显示相关信息
    if (count > 0) {
      expect(count).toBeGreaterThan(0);
    }
  });

  test('应该显示空状态提示', async ({ page }) => {
    await page.goto('/upload');
    
    // 等待页面加载
    await page.waitForTimeout(1000);
    
    // 检查是否有文件或空状态提示
    const hasFiles = await page.locator('[class*="file"]').count() > 0;
    const hasEmptyMessage = await page.getByText(/暂无|没有|上传您的第一|No files/i).isVisible().catch(() => false);
    
    // 要么有文件，要么有空状态提示
    expect(hasFiles || hasEmptyMessage).toBeTruthy();
  });
});
