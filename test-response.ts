#!/usr/bin/env bun
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

const USER_DATA_DIR = '/home/z/my-project/bot-bridge/browser-data';

async function testResponse() {
  console.log('🧪 测试响应获取...\n');
  
  if (!existsSync(USER_DATA_DIR)) {
    mkdirSync(USER_DATA_DIR, { recursive: true });
  }
  
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    slowMo: 100,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ],
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN'
  });

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();
  
  console.log('🌐 导航到 chat.z.ai...');
  await page.goto('https://chat.z.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);
  
  // 点击Agent模式
  console.log('🤖 激活Agent模式...');
  const agentBtn = await page.$('button:has-text("Agent")');
  if (agentBtn) {
    await agentBtn.click();
    await page.waitForTimeout(2000);
  }
  
  // 发送测试消息
  console.log('📤 发送测试消息...');
  const inputBox = await page.$('textarea');
  if (inputBox) {
    await inputBox.click();
    await inputBox.fill('你好');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
  }
  
  // 等待响应
  console.log('⏳ 等待响应 (20秒)...');
  await page.waitForTimeout(20000);
  
  // 截图
  await page.screenshot({ path: '/home/z/my-project/download/response-test.png', fullPage: true });
  console.log('📸 截图已保存');
  
  // 获取响应
  console.log('\n📊 分析响应...');
  
  // 查找.chat-assistant
  const assistantMessages = await page.$$('.chat-assistant');
  console.log(`找到 ${assistantMessages.length} 个 .chat-assistant 元素`);
  
  if (assistantMessages.length > 0) {
    const lastAssistant = assistantMessages[assistantMessages.length - 1];
    
    // 获取完整HTML
    const html = await lastAssistant.innerHTML();
    console.log('\n最后一个 .chat-assistant 的HTML:');
    console.log(html.substring(0, 500));
    
    // 获取文本内容
    const text = await lastAssistant.textContent();
    console.log('\n文本内容:');
    console.log(text?.substring(0, 500));
    
    // 查找 .markdown-prose
    const proseElement = await lastAssistant.$('.markdown-prose');
    if (proseElement) {
      const proseText = await proseElement.textContent();
      console.log('\n.markdown-prose 内容:');
      console.log(proseText?.substring(0, 500));
    }
    
    // 查找所有子元素
    const children = await lastAssistant.$$('> *');
    console.log(`\n子元素数量: ${children.length}`);
    for (let i = 0; i < children.length; i++) {
      const className = await children[i].getAttribute('class');
      const text = await children[i].textContent();
      console.log(`  ${i + 1}. class="${className?.substring(0, 50)}"`);
      console.log(`     text: ${text?.substring(0, 100)}...`);
    }
  }
  
  await context.close();
  console.log('\n✅ 测试完成');
}

testResponse().catch(console.error);
