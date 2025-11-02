import { test, expect } from '@playwright/test';

test.describe('导航功能', () => {
  test('应该能访问首页', async ({ page }) => {
    await page.goto('/');
    
    // 验证页面标题
    await expect(page).toHaveTitle(/Study Oasis/i);
    
    // 验证关键元素存在
    const heading = page.getByRole('heading', { level: 1 });
    await expect(heading).toBeVisible();
  });

  test('应该能导航到上传页面', async ({ page }) => {
    await page.goto('/');
    
    // 点击上传链接或按钮
    await page.click('a[href="/upload"], button:has-text("上传")');
    
    // 验证 URL
    await expect(page).toHaveURL(/.*upload/);
    
    // 验证页面内容
    await expect(page.getByText(/上传文档|选择文件/i)).toBeVisible();
  });

  test('应该能导航到聊天页面', async ({ page }) => {
    await page.goto('/');
    
    // 点击聊天链接或按钮
    await page.click('a[href="/chat"], button:has-text("聊天")');
    
    // 验证 URL
    await expect(page).toHaveURL(/.*chat/);
    
    // 验证页面内容
    await expect(page.getByPlaceholder(/输入消息|发送消息/i)).toBeVisible();
  });

  test('应该能导航到设置页面', async ({ page }) => {
    await page.goto('/');
    
    // 点击设置链接或按钮
    await page.click('a[href="/settings"], button:has-text("设置")');
    
    // 验证 URL
    await expect(page).toHaveURL(/.*settings/);
    
    // 验证页面内容
    await expect(page.getByRole('heading', { name: /设置/i })).toBeVisible();
  });

  test('应该能通过导航栏切换页面', async ({ page }) => {
    // 从首页开始
    await page.goto('/');
    
    // 导航到上传
    await page.click('a[href="/upload"]');
    await expect(page).toHaveURL(/.*upload/);
    
    // 导航到聊天
    await page.click('a[href="/chat"]');
    await expect(page).toHaveURL(/.*chat/);
    
    // 返回首页
    await page.click('a[href="/"]');
    await expect(page).toHaveURL(/^http:\/\/localhost:3000\/?$/);
  });

  test('404 页面应该正常显示', async ({ page }) => {
    const response = await page.goto('/non-existent-page');
    
    // 验证返回 404 状态码
    expect(response?.status()).toBe(404);
    
    // 验证 404 页面内容
    await expect(page.getByText(/404|Not Found|页面不存在/i)).toBeVisible();
  });
});
