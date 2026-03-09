#!/usr/bin/env bun
import { chromium } from 'playwright';

async function testLoginDetailed() {
  console.log('🧪 详细测试登录流程...');
  
  const browser = await chromium.launch({
    headless: true,
    slowMo: 300,
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
  
  // 点击登录按钮
  console.log('🔍 点击登录按钮...');
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await btn.textContent();
    if (text?.includes('登录')) {
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
    await emailInput.fill('zhudongshan@gmail.com');
  }
  
  // 输入密码
  console.log('📝 输入密码...');
  const passwordInput = await page.$('input[type="password"]');
  if (passwordInput) {
    await passwordInput.click();
    await passwordInput.fill('dongshan');
  }
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/z/my-project/download/login-before-submit.png' });
  
  // 点击登录
  console.log('🔘 点击登录按钮...');
  const submitButtons = await page.$$('button');
  for (const btn of submitButtons) {
    const text = await btn.textContent();
    if (text?.includes('登录')) {
      await btn.click();
      break;
    }
  }
  
  // 等待并检查结果
  console.log('⏳ 等待登录响应...');
  await page.waitForTimeout(5000);
  
  console.log(`🔗 当前URL: ${page.url()}`);
  await page.screenshot({ path: '/home/z/my-project/download/login-after-submit.png' });
  
  // 打印页面内容
  const pageContent = await page.textContent('body');
  console.log('\n📄 页面主要内容:');
  console.log(pageContent?.substring(0, 2000));
  
  // 查找所有可见元素
  console.log('\n🔍 查找所有可见元素...');
  const allInputs = await page.$$('input');
  console.log(`输入框数量: ${allInputs.length}`);
  for (let i = 0; i < allInputs.length; i++) {
    const type = await allInputs[i].getAttribute('type');
    const placeholder = await allInputs[i].getAttribute('placeholder');
    const name = await allInputs[i].getAttribute('name');
    const value = await allInputs[i].inputValue();
    console.log(`  输入框 ${i + 1}: type=${type}, placeholder=${placeholder}, name=${name}, value=${value?.substring(0, 20)}`);
  }
  
  const allButtons = await page.$$('button');
  console.log(`\n按钮数量: ${allButtons.length}`);
  for (let i = 0; i < allButtons.length; i++) {
    const text = await allButtons[i].textContent();
    const disabled = await allButtons[i].isDisabled();
    console.log(`  按钮 ${i + 1}: ${text?.trim().substring(0, 30)}, disabled=${disabled}`);
  }
  
  // 查找错误消息
  console.log('\n🔍 查找错误消息...');
  const errorSelectors = ['.error', '.alert', '.message', '[role="alert"]', '.toast'];
  for (const selector of errorSelectors) {
    const elements = await page.$$(selector);
    for (const el of elements) {
      const text = await el.textContent();
      if (text && text.trim().length > 0) {
        console.log(`  错误消息 (${selector}): ${text.trim()}`);
      }
    }
  }
  
  await browser.close();
  console.log('\n✅ 测试完成');
}

testLoginDetailed().catch(console.error);
