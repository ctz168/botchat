#!/usr/bin/env bun
import { chromium } from 'playwright';

async function analyzeLoginPage() {
  console.log('🔍 分析 chat.z.ai 登录页面...\n');
  
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
    locale: 'zh-CN'
  });

  const page = await context.newPage();
  
  try {
    // 导航到登录页面
    console.log('🌐 导航到 chat.z.ai...');
    await page.goto('https://chat.z.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(3000);
    
    console.log(`🔗 当前URL: ${page.url()}`);
    
    // 截图
    await page.screenshot({ path: '/home/z/my-project/download/analyze-homepage.png', fullPage: true });
    console.log('📸 首页截图已保存');
    
    // 分析页面HTML结构
    const pageContent = await page.content();
    console.log('\n📋 页面标题:', await page.title());
    
    // 查找所有按钮
    console.log('\n🔘 查找所有按钮:');
    const buttons = await page.$$('button');
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      const className = await buttons[i].getAttribute('class');
      console.log(`  按钮 ${i + 1}: "${text?.trim()}" - class="${className?.substring(0, 50)}..."`);
    }
    
    // 查找登录链接
    console.log('\n🔗 查找登录链接:');
    const links = await page.$$('a');
    for (let i = 0; i < links.length; i++) {
      const text = await links[i].textContent();
      const href = await links[i].getAttribute('href');
      if (text?.includes('登录') || text?.includes('Login') || href?.includes('login') || href?.includes('auth')) {
        console.log(`  链接: "${text?.trim()}" -> ${href}`);
      }
    }
    
    // 检查是否有登录按钮
    const loginButton = await page.$('button:has-text("登录"), a:has-text("登录"), [class*="login"]');
    if (loginButton) {
      console.log('\n✅ 找到登录按钮，点击...');
      await loginButton.click();
      await page.waitForTimeout(3000);
      
      console.log(`🔗 点击后URL: ${page.url()}`);
      await page.screenshot({ path: '/home/z/my-project/download/analyze-login-page.png', fullPage: true });
      console.log('📸 登录页面截图已保存');
      
      // 分析登录页面的输入框
      console.log('\n📝 分析登录页面输入框:');
      const inputs = await page.$$('input');
      for (let i = 0; i < inputs.length; i++) {
        const type = await inputs[i].getAttribute('type');
        const name = await inputs[i].getAttribute('name');
        const placeholder = await inputs[i].getAttribute('placeholder');
        const id = await inputs[i].getAttribute('id');
        console.log(`  输入框 ${i + 1}: type=${type}, name=${name}, placeholder="${placeholder}", id=${id}`);
      }
      
      // 查找第三方登录按钮
      console.log('\n🔐 查找第三方登录选项:');
      const thirdPartyButtons = await page.$$('button, a, div[role="button"]');
      for (const btn of thirdPartyButtons) {
        const text = await btn.textContent();
        const className = await btn.getAttribute('class');
        if (text?.toLowerCase().includes('google') || 
            text?.toLowerCase().includes('谷歌') ||
            text?.toLowerCase().includes('github') ||
            text?.toLowerCase().includes('微信') ||
            className?.toLowerCase().includes('google') ||
            className?.toLowerCase().includes('github')) {
          console.log(`  找到: "${text?.trim()}" - class="${className?.substring(0, 50)}"`);
        }
      }
      
      // 查找Google登录按钮
      console.log('\n🔍 详细查找Google登录按钮:');
      const googleSelectors = [
        'button:has-text("Google")',
        'button:has-text("谷歌")',
        '[class*="google"]',
        '[data-provider="google"]',
        'svg[class*="google"]',
        'img[alt*="Google"]',
        'img[src*="google"]'
      ];
      
      for (const selector of googleSelectors) {
        const elements = await page.$$(selector);
        if (elements.length > 0) {
          console.log(`  找到 ${elements.length} 个元素: ${selector}`);
          for (const el of elements) {
            const tagName = await el.evaluate(e => e.tagName);
            const className = await el.getAttribute('class');
            console.log(`    - ${tagName}: class="${className?.substring(0, 50)}"`);
          }
        }
      }
    }
    
    // 保存完整HTML用于分析
    await page.content().then(content => {
      require('fs').writeFileSync('/home/z/my-project/download/login-page.html', content);
      console.log('\n📄 页面HTML已保存到 login-page.html');
    });
    
  } catch (error) {
    console.error('❌ 分析失败:', error);
  } finally {
    await browser.close();
  }
}

analyzeLoginPage().catch(console.error);
