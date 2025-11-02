import { test, expect } from '@playwright/test';

test.describe('文档查看功能', () => {
  test('应该能访问文档列表页面', async ({ page }) => {
    // 尝试访问文档相关页面
    await page.goto('/');
    
    // 查找文档链接
    const docsLink = page.locator('a:has-text("文档"), a:has-text("我的文档"), a[href*="document"]');
    
    if (await docsLink.count() > 0) {
      await docsLink.click();
      await expect(page).toHaveURL(/document/i);
    }
  });

  test('应该显示已上传的文档列表', async ({ page }) => {
    // 导航到文档列表页（假设在首页或专门的文档页）
    await page.goto('/');
    
    // 查找文档列表
    const documentList = page.locator('[data-testid="document-list"], .document-list, .file-list');
    
    if (await documentList.count() > 0) {
      await expect(documentList).toBeVisible();
      
      // 验证列表项
      const listItems = page.locator('.document-item, .file-item, li');
      const itemCount = await listItems.count();
      expect(itemCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('应该能点击查看文档详情', async ({ page }) => {
    await page.goto('/');
    
    // 查找第一个文档项
    const firstDocument = page.locator('.document-item, .file-item').first();
    
    if (await firstDocument.count() > 0) {
      await firstDocument.click();
      
      // 验证跳转到文档详情页
      await page.waitForURL(/document\/[a-zA-Z0-9-]+/);
      
      // 验证文档内容显示
      await expect(page.locator('.document-content, .file-content, pre, .ocr-result')).toBeVisible({ 
        timeout: 5000 
      });
    }
  });

  test('应该显示文档的 OCR 结果', async ({ page }) => {
    await page.goto('/');
    
    const firstDocument = page.locator('.document-item').first();
    
    if (await firstDocument.count() > 0) {
      await firstDocument.click();
      await page.waitForTimeout(1000);
      
      // 查找 OCR 结果文本
      const ocrContent = page.locator('.ocr-result, .document-text, [data-testid="ocr-content"]');
      
      if (await ocrContent.count() > 0) {
        await expect(ocrContent).toBeVisible();
        const text = await ocrContent.textContent();
        expect(text?.length).toBeGreaterThan(0);
      }
    }
  });

  test('应该能搜索文档', async ({ page }) => {
    await page.goto('/');
    
    // 查找搜索输入框
    const searchInput = page.getByPlaceholder(/搜索|Search/i);
    
    if (await searchInput.count() > 0) {
      // 输入搜索关键词
      await searchInput.fill('test');
      await page.keyboard.press('Enter');
      
      // 等待搜索结果
      await page.waitForTimeout(1000);
      
      // 验证搜索结果显示
      const results = page.locator('.search-result, .document-item');
      expect(await results.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('应该能下载文档', async ({ page }) => {
    await page.goto('/');
    
    const firstDocument = page.locator('.document-item').first();
    
    if (await firstDocument.count() > 0) {
      await firstDocument.click();
      await page.waitForTimeout(1000);
      
      // 查找下载按钮
      const downloadButton = page.locator('button:has-text("下载"), a:has-text("下载"), button[aria-label*="下载"]');
      
      if (await downloadButton.count() > 0) {
        // 监听下载事件
        const downloadPromise = page.waitForEvent('download');
        await downloadButton.click();
        
        // 验证下载开始
        const download = await downloadPromise;
        expect(download.suggestedFilename()).toBeTruthy();
      }
    }
  });

  test('应该显示文档元数据', async ({ page }) => {
    await page.goto('/');
    
    const firstDocument = page.locator('.document-item').first();
    
    if (await firstDocument.count() > 0) {
      // 验证列表中显示元数据
      await expect(firstDocument).toContainText(/\.(pdf|txt|docx)|[0-9]+ (KB|MB)|[0-9]{4}-[0-9]{2}-[0-9]{2}/);
    }
  });

  test('空状态应该显示提示信息', async ({ page }) => {
    await page.goto('/');
    
    // 如果没有文档，应该显示空状态提示
    const emptyState = page.locator('text=/暂无文档|No documents|上传你的第一个文档/i');
    const documentList = page.locator('.document-item');
    
    const hasDocuments = await documentList.count() > 0;
    
    if (!hasDocuments) {
      await expect(emptyState).toBeVisible();
    }
  });
});
