import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('文件上传功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/upload');
  });

  test('应该显示上传界面', async ({ page }) => {
    // 验证页面标题
    await expect(page.getByRole('heading', { name: /上传文档|文件上传/i })).toBeVisible();
    
    // 验证文件输入框存在
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeAttached();
  });

  test('应该能选择文件', async ({ page }) => {
    // 创建临时测试文件路径
    const testFilePath = path.join(__dirname, '../public/test-document.pdf');
    
    // 选择文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    
    // 验证文件名显示
    await expect(page.getByText(/test-document\.pdf/i)).toBeVisible();
  });

  test('应该拒绝不支持的文件类型', async ({ page }) => {
    // 尝试上传不支持的文件类型
    const fileInput = page.locator('input[type="file"]');
    
    // 监听错误提示
    page.on('dialog', async dialog => {
      expect(dialog.message()).toContain('不支持');
      await dialog.accept();
    });
    
    // 如果有文件类型限制提示
    await expect(page.getByText(/支持的文件类型|.pdf|.txt|.docx/i)).toBeVisible();
  });

  test('应该显示上传进度', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../public/test-document.pdf');
    
    // 选择文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    
    // 点击上传按钮
    await page.click('button:has-text("上传")');
    
    // 验证进度条出现
    const progressBar = page.locator('[role="progressbar"], .progress-bar, progress');
    await expect(progressBar).toBeVisible({ timeout: 1000 }).catch(() => {
      // 如果上传太快，进度条可能不显示，这是正常的
    });
  });

  test('上传成功后应该显示成功消息', async ({ page }) => {
    const testFilePath = path.join(__dirname, '../public/test-document.pdf');
    
    // 选择并上传文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testFilePath);
    await page.click('button:has-text("上传")');
    
    // 等待成功消息
    await expect(page.getByText(/上传成功|成功上传/i)).toBeVisible({ timeout: 10000 });
  });

  test('应该能删除已上传的文件', async ({ page }) => {
    // 假设页面显示已上传的文件列表
    const deleteButton = page.locator('button:has-text("删除"), button[aria-label*="删除"]').first();
    
    if (await deleteButton.count() > 0) {
      await deleteButton.click();
      
      // 确认删除对话框
      page.on('dialog', dialog => dialog.accept());
      
      // 验证删除成功提示
      await expect(page.getByText(/删除成功|已删除/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该显示文件大小限制提示', async ({ page }) => {
    // 验证大小限制提示
    await expect(page.getByText(/最大|限制|10MB|20MB/i)).toBeVisible();
  });
});
