#!/usr/bin/env bun
import { chromium } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

const USER_DATA_DIR = '/home/z/my-project/bot-bridge/browser-data';

async function analyzePage() {
  console.log('🔍 分析chat.z.ai页面结构...\n');
  
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
  console.log('⏳ 等待响应 (15秒)...');
  await page.waitForTimeout(15000);
  
  // 截图
  await page.screenshot({ path: '/home/z/my-project/download/page-analysis.png', fullPage: true });
  console.log('📸 截图已保存');
  
  // 分析页面结构
  console.log('\n📊 分析页面结构...');
  
  // 获取页面HTML
  const html = await page.content();
  console.log(`页面HTML长度: ${html.length} 字符`);
  
  // 查找所有可能包含响应的元素
  console.log('\n🔍 查找响应元素...');
  
  // 查找所有div
  const allDivs = await page.$$('div');
  console.log(`\n找到 ${allDivs.length} 个div元素`);
  
  // 查找包含文本的div
  const textDivs: { selector: string; text: string; className: string }[] = [];
  for (let i = 0; i < allDivs.length; i++) {
    try {
      const div = allDivs[i];
      const text = await div.textContent();
      const className = await div.getAttribute('class') || '';
      
      if (text && text.trim().length > 20 && text.trim().length < 500) {
        textDivs.push({
          selector: `div:nth-of-type(${i + 1})`,
          text: text.trim().substring(0, 100),
          className: className.substring(0, 50)
        });
      }
    } catch (e) {}
  }
  
  console.log('\n包含文本的div元素:');
  textDivs.slice(-10).forEach((d, i) => {
    console.log(`${i + 1}. class="${d.className}"`);
    console.log(`   text: ${d.text.substring(0, 80)}...`);
  });
  
  // 查找特定class
  const interestingClasses = [
    'message', 'response', 'chat', 'content', 'markdown', 'prose',
    'assistant', 'ai', 'bot', 'reply', 'answer', 'text'
  ];
  
  console.log('\n🔍 查找有趣的class...');
  for (const cls of interestingClasses) {
    const elements = await page.$$(`[class*="${cls}"]`);
    if (elements.length > 0) {
      console.log(`\n找到 ${elements.length} 个包含 "${cls}" 的元素:`);
      for (let i = 0; i < Math.min(elements.length, 3); i++) {
        const text = await elements[i].textContent();
        const className = await elements[i].getAttribute('class');
        console.log(`  ${i + 1}. class="${className?.substring(0, 50)}"`);
        console.log(`     text: ${text?.trim().substring(0, 80)}...`);
      }
    }
  }
  
  // 查找最新的消息
  console.log('\n🔍 查找最新消息...');
  const lastMessages = await page.$$('[class*="message"]:last-child, [class*="chat"]:last-child');
  for (const msg of lastMessages) {
    const text = await msg.textContent();
    const className = await msg.getAttribute('class');
    if (text && text.trim().length > 10) {
      console.log(`class="${className}"`);
      console.log(`text: ${text.trim().substring(0, 200)}`);
    }
  }
  
  await context.close();
  console.log('\n✅ 分析完成');
}

analyzePage().catch(console.error);
