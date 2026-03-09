#!/usr/bin/env bun
import { chromium } from 'playwright';

async function testLoginComplete() {
  console.log('🧪 完整测试登录流程...');
  
  const browser = await chromium.launch({
    headless: true,
    slowMo: 500,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN'
  });

  const page = await context.newPage();
  
  // 监听网络请求
  page.on('response', async (response) => {
    if (response.url().includes('/api/') || response.url().includes('login') || response.url().includes('auth')) {
      console.log(`📡 API请求: ${response.url()} - 状态: ${response.status()}`);
      try {
        const text = await response.text();
        if (text && text.length < 500) {
          console.log(`   响应: ${text}`);
        }
      } catch (e) {}
    }
  });
  
  console.log('🌐 导航到 chat.z.ai...');
  await page.goto('https://chat.z.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // 点击登录按钮
  console.log('🔍 点击登录按钮...');
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
  console.log('📝 输入邮箱...');
  const emailInput = await page.$('input[type="email"]');
  if (emailInput) {
    await emailInput.click();
    await page.waitForTimeout(300);
    await emailInput.fill('zhudongshan@gmail.com');
    await page.waitForTimeout(300);
  }
  
  // 输入密码
  console.log('📝 输入密码...');
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.click();
    await page.waitForTimeout(300);
    await passwordInput.fill('dongshan');
    await page.waitForTimeout(300);
  }
  
  await page.screenshot({ path: '/home/z/my-project/download/login-filled.png' });
  
  // 点击登录按钮（在弹窗中）
  console.log('🔘 点击登录按钮...');
  const submitButtons = await page.$$('button');
  for (const btn of submitButtons) {
    const text = await btn.textContent();
    const className = await btn.getAttribute('class');
    // 查找主登录按钮
    if (text?.trim() === '登录' && className?.includes('primary')) {
      console.log('找到主登录按钮');
      await btn.click();
      break;
    }
  }
  
  // 等待更长时间
  console.log('⏳ 等待登录响应 (15秒)...');
  await page.waitForTimeout(15000);
  
  console.log(`🔗 当前URL: ${page.url()}`);
  await page.screenshot({ path: '/home/z/my-project/download/login-result.png' });
  
  // 检查是否有验证码或其他元素
  console.log('\n🔍 检查页面状态...');
  
  // 查找验证码相关元素
  const captchaSelectors = [
    'iframe[src*="captcha"]',
    '.captcha',
    '#captcha',
    '[class*="captcha"]',
    '[id*="captcha"]',
    '.verify',
    '.verification'
  ];
  
  for (const selector of captchaSelectors) {
    const captcha = await page.$(selector);
    if (captcha) {
      console.log(`⚠️ 找到验证码元素: ${selector}`);
    }
  }
  
  // 查找错误消息
  const errorElements = await page.$$('[class*="error"], [class*="alert"], [class*="message"], [class*="toast"]');
  for (const el of errorElements) {
    const text = await el.textContent();
    if (text && text.trim().length > 0 && text.trim().length < 200) {
      console.log(`⚠️ 消息: ${text.trim()}`);
    }
  }
  
  // 检查是否登录成功
  const currentUrl = page.url();
  if (currentUrl.includes('/chat') || currentUrl === 'https://chat.z.ai/' || !currentUrl.includes('/auth')) {
    console.log('✅ 可能已登录成功');
    
    // 查找聊天输入框
    const chatInput = await page.$('textarea, div[contenteditable="true"]');
    if (chatInput) {
      console.log('✅ 找到聊天输入框');
      
      // 测试发送消息
      console.log('\n📤 测试发送消息...');
      await chatInput.click();
      await chatInput.fill('你好，这是一个测试消息');
      await page.waitForTimeout(1000);
      
      // 查找发送按钮
      const sendBtns = await page.$$('button');
      for (const btn of sendBtns) {
        const ariaLabel = await btn.getAttribute('aria-label');
        const text = await btn.textContent();
        if (ariaLabel?.includes('发送') || ariaLabel?.includes('Send') || text?.includes('发送')) {
          await btn.click();
          console.log('✅ 消息已发送');
          break;
        }
      }
      
      // 或者按Enter
      await page.keyboard.press('Enter');
      
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/home/z/my-project/download/chat-result.png' });
    }
  } else {
    console.log('❌ 登录可能失败，仍在认证页面');
    
    // 打印所有按钮
    const allButtons = await page.$$('button');
    console.log('\n所有按钮:');
    for (const btn of allButtons) {
      const text = await btn.textContent();
      console.log(`  - ${text?.trim()}`);
    }
  }
  
  await browser.close();
  console.log('\n✅ 测试完成');
}

testLoginComplete().catch(console.error);
