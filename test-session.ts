#!/usr/bin/env bun
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

const USER_DATA_DIR = '/home/z/my-project/bot-bridge/browser-data';

async function testWithSession() {
  console.log('🧪 测试会话持久化登录...');
  
  // 确保目录存在
  if (!existsSync(USER_DATA_DIR)) {
    mkdirSync(USER_DATA_DIR, { recursive: true });
  }
  
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    slowMo: 300,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    ],
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    ignoreHTTPSErrors: true
  });

  const pages = browser.pages();
  const page = pages.length > 0 ? pages[0] : await browser.newPage();
  
  // 监听网络请求
  page.on('response', async (response) => {
    if (response.url().includes('/api/') && !response.url().includes('analytics')) {
      console.log(`📡 API: ${response.url().split('?')[0]} - ${response.status()}`);
    }
  });
  
  console.log('🌐 导航到 chat.z.ai...');
  await page.goto('https://chat.z.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  console.log(`🔗 当前URL: ${page.url()}`);
  await page.screenshot({ path: '/home/z/my-project/download/session-check.png' });
  
  // 检查是否已登录
  const currentUrl = page.url();
  if (currentUrl.includes('/auth')) {
    console.log('⚠️ 需要登录...');
    
    // 点击登录按钮
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text?.includes('登录') && !text?.includes('注册')) {
        await btn.click();
        break;
      }
    }
    
    await page.waitForTimeout(2000);
    
    // 输入邮箱
    const emailInput = await page.$('input[type="email"]');
    if (emailInput) {
      await emailInput.click();
      await emailInput.fill('zhudongshan@gmail.com');
    }
    
    // 输入密码
    const passwordInput = await page.$('input[type="password"]');
    if (passwordInput) {
      await passwordInput.click();
      await passwordInput.fill('dongshan');
    }
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: '/home/z/my-project/download/session-filled.png' });
    
    // 点击登录
    const submitButtons = await page.$$('button');
    for (const btn of submitButtons) {
      const text = await btn.textContent();
      if (text?.trim() === '登录') {
        await btn.click();
        break;
      }
    }
    
    console.log('⏳ 等待登录响应...');
    await page.waitForTimeout(10000);
    
    // 检查验证码
    const captcha = await page.$('.captcha, [class*="captcha"], iframe[src*="captcha"]');
    if (captcha) {
      console.log('⚠️ 检测到验证码！');
      await page.screenshot({ path: '/home/z/my-project/download/captcha-detected.png' });
      console.log('📸 验证码截图已保存，需要人工处理');
    }
    
    console.log(`🔗 登录后URL: ${page.url()}`);
    await page.screenshot({ path: '/home/z/my-project/download/session-after-login.png' });
  } else {
    console.log('✅ 已登录或无需登录');
    
    // 查找聊天输入框
    const chatInput = await page.$('textarea, div[contenteditable="true"]');
    if (chatInput) {
      console.log('✅ 找到聊天输入框');
      
      // 测试发送消息
      console.log('\n📤 测试发送消息...');
      await chatInput.click();
      await chatInput.fill('你好，这是一个测试消息');
      await page.waitForTimeout(1000);
      
      // 按Enter发送
      await page.keyboard.press('Enter');
      console.log('✅ 消息已发送');
      
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/home/z/my-project/download/chat-test.png' });
    }
  }
  
  // 保存会话状态
  await page.context().storageState({ path: `${USER_DATA_DIR}/state.json` });
  console.log('💾 会话状态已保存');
  
  await browser.close();
  console.log('✅ 测试完成');
}

testWithSession().catch(console.error);
