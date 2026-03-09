#!/usr/bin/env bun
import { chromium } from 'playwright';

async function analyzeResponsePage() {
  console.log('🔍 分析chat.z.ai响应页面结构...\n');
  
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    storageState: '/home/z/my-project/botchat/browser-data/state.json'
  });

  const page = await context.newPage();
  
  try {
    // 导航到chat.z.ai
    console.log('🌐 导航到 chat.z.ai...');
    await page.goto('https://chat.z.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    // 激活Agent模式
    const agentBtn = await page.$('button:has-text("Agent")');
    if (agentBtn) {
      await agentBtn.click();
      await page.waitForTimeout(1500);
    }
    
    // 发送测试消息
    console.log('📤 发送测试消息...');
    const inputBox = await page.$('textarea');
    if (inputBox) {
      await inputBox.click();
      await inputBox.fill('你好');
      await page.keyboard.press('Enter');
    }
    
    // 等待并分析响应
    console.log('⏳ 等待响应...');
    await page.waitForTimeout(5000);
    
    // 分析发送按钮状态
    console.log('\n📊 分析发送按钮状态:');
    const sendBtn = await page.$('.sendMessageButton');
    if (sendBtn) {
      const className = await sendBtn.getAttribute('class');
      const isDisabled = await sendBtn.getAttribute('disabled');
      console.log(`  发送按钮class: ${className}`);
      console.log(`  发送按钮disabled: ${isDisabled}`);
    }
    
    // 查找所有按钮
    console.log('\n📊 所有按钮状态:');
    const buttons = await page.$$('button');
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const text = await buttons[i].textContent();
      const className = await buttons[i].getAttribute('class');
      const isDisabled = await buttons[i].isDisabled();
      if (text && (text.includes('发送') || text.includes('停止') || text.includes('Stop'))) {
        console.log(`  按钮: "${text?.trim().substring(0, 30)}" - disabled: ${isDisabled} - class: ${className?.substring(0, 50)}`);
      }
    }
    
    // 继续等待响应完成
    console.log('\n⏳ 继续等待响应完成...');
    await page.waitForTimeout(15000);
    
    // 再次分析发送按钮状态
    console.log('\n📊 响应完成后发送按钮状态:');
    const sendBtn2 = await page.$('.sendMessageButton');
    if (sendBtn2) {
      const className = await sendBtn2.getAttribute('class');
      const isDisabled = await sendBtn2.isDisabled();
      console.log(`  发送按钮class: ${className}`);
      console.log(`  发送按钮disabled: ${isDisabled}`);
    }
    
    // 截图
    await page.screenshot({ path: '/home/z/my-project/download/response-analysis.png', fullPage: true });
    console.log('\n📸 截图已保存');
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    await browser.close();
  }
}

analyzeResponsePage().catch(console.error);
