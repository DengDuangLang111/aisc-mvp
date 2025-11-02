import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E 测试配置
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  
  /* 测试超时 */
  timeout: 30 * 1000,
  
  /* 并行执行测试 */
  fullyParallel: true,
  
  /* CI 环境下失败时重试 */
  retries: process.env.CI ? 2 : 0,
  
  /* 并行 workers 数量 */
  workers: process.env.CI ? 1 : undefined,
  
  /* 测试报告 */
  reporter: 'html',
  
  /* 共享配置 */
  use: {
    /* 基础 URL */
    baseURL: process.env.NEXT_PUBLIC_URL || 'http://localhost:3000',
    
    /* 追踪 */
    trace: 'on-first-retry',
    
    /* 截图 */
    screenshot: 'only-on-failure',
    
    /* 视频 */
    video: 'retain-on-failure',
  },

  /* 浏览器配置 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* 开发服务器（如果需要） */
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
