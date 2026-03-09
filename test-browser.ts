#!/usr/bin/env bun
import { chromium } from 'playwright';

async function testBrowser() {
  console.log('🧪 测试浏览器控制...');
  
  const browser = await chromium.launch({
    headless: true,
    slowMo: 100,
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
  
  // 截图保存当前状态
  await page.screenshot({ path: '/home/z/my-project/download/chat-z-ai-initial.png', fullPage: true });
  console.log('📸 初始截图已保存');
  
  // 等待页面加载
  await page.waitForTimeout(3000);
  
  // 打印页面标题
  const title = await page.title();
  console.log(`📄 页面标题: ${title}`);
  
  // 打印当前URL
  console.log(`🔗 当前URL: ${page.url()}`);
  
  // 查找所有可能的登录相关元素
  console.log('\n🔍 查找页面元素...');
  
  // 查找所有按钮
  const buttons = await page.$$('button');
  console.log(`找到 ${buttons.length} 个按钮`);
  for (let i = 0; i < Math.min(buttons.length, 10); i++) {
    const text = await buttons[i].textContent();
    console.log(`  按钮 ${i + 1}: ${text?.trim().substring(0, 50)}`);
  }
  
  // 查找所有输入框
  const inputs = await page.$$('input, textarea');
  console.log(`找到 ${inputs.length} 个输入框`);
  for (let i = 0; i < inputs.length; i++) {
    const type = await inputs[i].getAttribute('type');
    const placeholder = await inputs[i].getAttribute('placeholder');
    const name = await inputs[i].getAttribute('name');
    console.log(`  输入框 ${i + 1}: type=${type}, placeholder=${placeholder}, name=${name}`);
  }
  
  // 查找所有链接
  const links = await page.$$('a');
  console.log(`找到 ${links.length} 个链接`);
  for (let i = 0; i < Math.min(links.length, 10); i++) {
    const text = await links[i].textContent();
    const href = await links[i].getAttribute('href');
    console.log(`  链接 ${i + 1}: ${text?.trim().substring(0, 30)} -> ${href}`);
  }
  
  // 再次截图
  await page.screenshot({ path: '/home/z/my-project/download/chat-z-ai-loaded.png', fullPage: true });
  console.log('📸 加载后截图已保存');
  
  await browser.close();
  console.log('✅ 测试完成');
}

testBrowser().catch(console.error);
