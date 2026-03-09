#!/usr/bin/env bun
import { chromium } from 'playwright';

async function testLogin() {
  console.log('🧪 测试登录流程...');
  
  const browser = await chromium.launch({
    headless: true,
    slowMo: 200,
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
  
  console.log('🌐 导航到 chat.z.ai...');
  await page.goto('https://chat.z.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // 截图初始状态
  await page.screenshot({ path: '/home/z/my-project/download/step1-initial.png' });
  console.log('📸 步骤1: 初始页面截图');
  
  // 查找并点击登录按钮
  console.log('🔍 查找登录按钮...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text?.includes('登录')) {
      console.log('✅ 找到登录按钮，点击...');
      await btn.click();
      break;
    }
  }
  
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/home/z/my-project/download/step2-login-modal.png' });
  console.log('📸 步骤2: 登录弹窗截图');
  
  // 查找邮箱输入框
  console.log('🔍 查找邮箱输入框...');
  const emailSelectors = [
    'input[type="email"]',
    'input[name="email"]',
    'input[placeholder*="邮箱"]',
    'input[placeholder*="email"]',
    'input[placeholder*="Email"]'
  ];
  
  let emailInput: any = null;
  for (const selector of emailSelectors) {
    emailInput = await page.$(selector);
    if (emailInput) {
      console.log(`✅ 找到邮箱输入框: ${selector}`);
      break;
    }
  }
  
  // 如果没找到，尝试查找所有输入框
  if (!emailInput) {
    const allInputs = await page.$$('input');
    console.log(`找到 ${allInputs.length} 个输入框`);
    for (let i = 0; i < allInputs.length; i++) {
      const type = await allInputs[i].getAttribute('type');
      const placeholder = await allInputs[i].getAttribute('placeholder');
      const name = await allInputs[i].getAttribute('name');
      console.log(`  输入框 ${i + 1}: type=${type}, placeholder=${placeholder}, name=${name}`);
    }
    
    // 尝试使用第一个文本输入框
    for (const input of allInputs) {
      const type = await input.getAttribute('type');
      if (type === 'text' || type === 'email' || !type) {
        emailInput = input;
        console.log('使用第一个文本输入框作为邮箱输入');
        break;
      }
    }
  }
  
  if (emailInput) {
    console.log('📝 输入邮箱...');
    await emailInput.click();
    await page.waitForTimeout(500);
    await emailInput.fill('zhudongshan@gmail.com');
    await page.waitForTimeout(500);
  } else {
    console.log('❌ 未找到邮箱输入框');
  }
  
  // 查找密码输入框
  console.log('🔍 查找密码输入框...');
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    console.log('✅ 找到密码输入框');
    await passwordInput.click();
    await page.waitForTimeout(500);
    await passwordInput.fill('dongshan');
    await page.waitForTimeout(500);
  } else {
    console.log('❌ 未找到密码输入框');
  }
  
  await page.screenshot({ path: '/home/z/my-project/download/step3-filled.png' });
  console.log('📸 步骤3: 填写后截图');
  
  // 查找并点击提交按钮
  console.log('🔍 查找提交按钮...');
  const submitButtons = await page.$$('button');
  for (const btn of submitButtons) {
    const text = await btn.textContent();
    const type = await btn.getAttribute('type');
    if (text?.includes('登录') || text?.includes('Login') || type === 'submit') {
      console.log(`✅ 找到提交按钮: ${text}`);
      await btn.click();
      break;
    }
  }
  
  // 等待登录完成
  console.log('⏳ 等待登录完成...');
  await page.waitForTimeout(8000);
  
  await page.screenshot({ path: '/home/z/my-project/download/step4-after-login.png' });
  console.log('📸 步骤4: 登录后截图');
  
  // 检查当前URL
  console.log(`🔗 当前URL: ${page.url()}`);
  
  // 查找Agent模式相关元素
  console.log('\n🔍 查找Agent模式元素...');
  const allButtons = await page.$$('button');
  for (const btn of allButtons) {
    const text = await btn.textContent();
    if (text && (text.toLowerCase().includes('agent') || text.includes('智能体'))) {
      console.log(`找到Agent相关按钮: ${text}`);
    }
  }
  
  // 查找输入框
  console.log('\n🔍 查找聊天输入框...');
  const chatInput = await page.$('textarea, div[contenteditable="true"]');
  if (chatInput) {
    console.log('✅ 找到聊天输入框');
    const placeholder = await chatInput.getAttribute('placeholder');
    console.log(`  placeholder: ${placeholder}`);
  }
  
  await browser.close();
  console.log('✅ 测试完成');
}

testLogin().catch(console.error);
