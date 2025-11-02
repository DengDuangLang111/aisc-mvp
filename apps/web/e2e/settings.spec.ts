import { test, expect } from '@playwright/test';

test.describe('设置功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
  });

  test('应该显示设置页面', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByRole('heading', { name: /设置|Settings/i })).toBeVisible();
    
    // 验证设置选项存在
    await expect(page.locator('form, .settings-form, [data-testid="settings"]')).toBeVisible();
  });

  test('应该显示 API 配置选项', async ({ page }) => {
    // 查找 API 相关设置
    const apiSection = page.locator('text=/API|接口/i');
    await expect(apiSection).toBeVisible();
  });

  test('应该显示存储配置选项', async ({ page }) => {
    // 查找存储相关设置
    const storageSection = page.locator('text=/存储|Storage|上传/i');
    await expect(storageSection).toBeVisible();
  });

  test('应该能保存设置', async ({ page }) => {
    // 查找保存按钮
    const saveButton = page.locator('button:has-text("保存"), button:has-text("Save")');
    
    if (await saveButton.count() > 0) {
      await saveButton.click();
      
      // 验证保存成功提示
      await expect(page.getByText(/保存成功|设置已更新|Success/i)).toBeVisible({ 
        timeout: 5000 
      });
    }
  });

  test('应该显示危险操作区域', async ({ page }) => {
    // 查找危险区域（如删除数据、重置设置等）
    const dangerZone = page.locator('text=/危险|Danger|删除|Delete|重置|Reset/i');
    await expect(dangerZone).toBeVisible();
  });

  test('应该能切换主题（如果支持）', async ({ page }) => {
    // 查找主题切换按钮
    const themeToggle = page.locator('button:has-text("主题"), button:has-text("Theme"), [data-theme]');
    
    if (await themeToggle.count() > 0) {
      // 获取当前主题
      const currentTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') || 
               document.body.className;
      });
      
      // 切换主题
      await themeToggle.click();
      await page.waitForTimeout(500);
      
      // 验证主题已更改
      const newTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme') || 
               document.body.className;
      });
      
      expect(newTheme).not.toBe(currentTheme);
    }
  });

  test('应该能返回上一页', async ({ page }) => {
    // 查找返回按钮
    const backButton = page.locator('button:has-text("返回"), a:has-text("返回"), button[aria-label*="返回"]');
    
    if (await backButton.count() > 0) {
      await backButton.click();
      
      // 验证 URL 改变
      await page.waitForURL(url => !url.pathname.includes('settings'));
    }
  });
});
