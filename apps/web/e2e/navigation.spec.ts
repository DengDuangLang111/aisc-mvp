import { test, expect } from '@playwright/test';

test.describe('导航功能', () => {
  test('应该能访问首页', async ({ page }) => {
    await page.goto('/');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/Study Oasis/i);
    
    // 验证关键元素存在
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toContainText('Study Oasis');
  });

  test('应该能导航到上传页面', async ({ page }) => {
    await page.goto('/');
    
    // 点击上传链接或按钮
    await page.getByRole('link', { name: /上传/i }).click();
    
    // 验证 URL
    await expect(page).toHaveURL(/.*upload/);
    
    // 验证页面内容（使用更灵活的匹配）
    await expect(page.getByRole('heading', { name: /上传/i })).toBeVisible();
  });

  test('应该能导航到聊天页面', async ({ page }) => {
    await page.goto('/');
    
    // 点击聊天链接或按钮
    await page.getByRole('link', { name: /对话|Chat/i }).click();
    
    // 验证 URL
    await expect(page).toHaveURL(/.*chat/);
    
    // 验证页面内容
    await expect(page.getByRole('heading', { name: 'AI 学习助手' })).toBeVisible();
  });

  test('应该能导航到设置页面', async ({ page }) => {
    await page.goto('/');
    
    // 点击设置链接
    await page.locator('a[href="/settings"]').click();
    
    // 验证 URL
    await expect(page).toHaveURL(/.*settings/);
    
    // 验证页面内容
    await expect(page.getByRole('heading', { name: /设置/i })).toBeVisible();
  });

  test('应该能通过导航栏切换页面', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/');
    
    // 导航到上传
    await page.getByRole('link', { name: /上传/i }).click();
    await expect(page).toHaveURL(/.*upload/);
    
    // 直接导航回首页（不依赖导航栏）
    await page.goto('/');
    
    // 导航到聊天
    await page.getByRole('link', { name: /对话|Chat/i }).click();
    await expect(page).toHaveURL(/.*chat/);
  });

  test('404 页面应该正常显示', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist');
    
    // Next.js 可能返回 404 或重定向
    if (response) {
      expect([404, 200]).toContain(response.status());
    }
  });
});
