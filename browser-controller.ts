import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

export interface BrowserControllerConfig {
  headless?: boolean;
  slowMo?: number;
  userDataDir?: string;
}

export type StreamCallback = (partialResponse: string, isComplete: boolean) => Promise<void>;

export class BrowserController {
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private config: BrowserControllerConfig;
  private isLoggedIn: boolean = false;
  private lastResponse: string = '';
  private userDataDir: string;

  constructor(config: BrowserControllerConfig = {}) {
    this.config = {
      headless: true,
      slowMo: 100,
      ...config
    };
    this.userDataDir = config.userDataDir || '/home/z/my-project/botchat/browser-data';
  }

  async initialize(): Promise<void> {
    console.log('🚀 正在启动浏览器...');
    
    // 确保用户数据目录存在
    if (!existsSync(this.userDataDir)) {
      mkdirSync(this.userDataDir, { recursive: true });
    }
    
    // 使用持久化上下文来保存登录状态
    this.context = await chromium.launchPersistentContext(this.userDataDir, {
      headless: this.config.headless,
      slowMo: this.config.slowMo,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ],
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'zh-CN',
      ignoreHTTPSErrors: true
    });

    const pages = this.context.pages();
    this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
    console.log('✅ 浏览器启动成功');
  }

  async navigateToChatZAI(): Promise<void> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    console.log('🌐 正在导航到 chat.z.ai...');
    await this.page.goto('https://chat.z.ai', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.waitForTimeout(3000);
    console.log('✅ 页面加载完成');
    console.log(`🔗 当前URL: ${this.page.url()}`);
  }

  async login(email: string, password: string): Promise<boolean> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      // 检查是否已登录 - 如果URL不包含auth且能找到聊天输入框，说明已登录
      const currentUrl = this.page.url();
      const chatInput = await this.page.$('textarea, div[contenteditable="true"]');
      
      if (!currentUrl.includes('/auth') && chatInput) {
        console.log('✅ 已登录（无需重新登录）');
        this.isLoggedIn = true;
        return true;
      }

      console.log('🔐 开始登录流程...');
      
      // 如果在首页，点击登录按钮
      if (currentUrl === 'https://chat.z.ai/' || currentUrl === 'https://chat.z.ai') {
        const loginBtn = await this.page.$('button:has-text("登录")');
        if (loginBtn) {
          console.log('🔘 点击登录按钮');
          await loginBtn.click();
          await this.page.waitForTimeout(3000);
        }
      }

      // 检查当前URL是否在登录页面
      console.log(`🔗 当前URL: ${this.page.url()}`);
      
      // 保存登录页面截图
      await this.page.screenshot({ path: '/home/z/my-project/download/login-page.png' });
      console.log('📸 登录页面截图已保存');

      // 尝试Google登录
      const googleLoginSuccess = await this.tryGoogleLogin(email, password);
      if (googleLoginSuccess) {
        this.isLoggedIn = true;
        return true;
      }

      // 如果Google登录失败，尝试邮箱密码登录
      console.log('⚠️ Google登录未成功，尝试邮箱密码登录...');
      const emailLoginSuccess = await this.tryEmailLogin(email, password);
      if (emailLoginSuccess) {
        this.isLoggedIn = true;
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ 登录失败:', error);
      return false;
    }
  }

  private async tryGoogleLogin(email: string, password: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      console.log('🔍 尝试Google账号登录...');
      
      // 查找Google登录按钮
      const googleSelectors = [
        'button.ButtonContinueWithGoogle',
        'button:has-text("Google")',
        '[class*="ButtonContinueWithGoogle"]',
        'button:has(svg) + :text-matches("Google", "i")'
      ];

      let googleBtn: any = null;
      for (const selector of googleSelectors) {
        try {
          googleBtn = await this.page.$(selector);
          if (googleBtn) {
            console.log(`✅ 找到Google登录按钮: ${selector}`);
            break;
          }
        } catch (e) {
          // 继续尝试下一个选择器
        }
      }

      // 如果没找到，尝试遍历所有按钮
      if (!googleBtn) {
        const buttons = await this.page.$$('button');
        for (const btn of buttons) {
          const className = await btn.getAttribute('class');
          if (className && className.toLowerCase().includes('google')) {
            googleBtn = btn;
            console.log('✅ 通过class找到Google登录按钮');
            break;
          }
        }
      }

      if (!googleBtn) {
        console.log('⚠️ 未找到Google登录按钮');
        return false;
      }

      // 点击Google登录按钮
      console.log('🔘 点击Google登录按钮...');
      await googleBtn.click();
      await this.page.waitForTimeout(3000);

      // 检查是否跳转到Google登录页面
      const currentUrl = this.page.url();
      console.log(`🔗 点击后URL: ${currentUrl}`);

      // 等待Google登录页面加载
      await this.page.waitForTimeout(2000);

      // 检查是否有多个页面（Google登录可能在弹窗中）
      const pages = this.context?.pages() || [];
      let googlePage = this.page;
      
      if (pages.length > 1) {
        // 使用最新的页面
        googlePage = pages[pages.length - 1];
        console.log('📱 检测到新窗口，切换到Google登录页面');
      }

      // 截图
      await googlePage.screenshot({ path: '/home/z/my-project/download/google-login.png' });
      console.log('📸 Google登录页面截图已保存');

      // 检查是否在Google登录页面
      if (currentUrl.includes('accounts.google.com') || googlePage.url().includes('accounts.google.com')) {
        console.log('📝 正在填写Google账号信息...');
        
        // 等待邮箱输入框
        await googlePage.waitForSelector('input[type="email"], input[name="identifier"]', { timeout: 10000 });
        
        // 输入邮箱
        const emailInput = await googlePage.$('input[type="email"], input[name="identifier"]');
        if (emailInput) {
          console.log(`📝 输入邮箱: ${email}`);
          await emailInput.click();
          await emailInput.fill(email);
          await googlePage.waitForTimeout(500);
          
          // 点击下一步
          const nextBtn = await googlePage.$('button:has-text("下一步"), button:has-text("Next"), #identifierNext');
          if (nextBtn) {
            console.log('🔘 点击下一步');
            await nextBtn.click();
            await googlePage.waitForTimeout(2000);
          }
        }

        // 等待密码输入框
        await googlePage.waitForSelector('input[type="password"]', { timeout: 10000 });
        
        // 输入密码
        const passwordInput = await googlePage.$('input[type="password"]');
        if (passwordInput) {
          console.log('📝 输入密码');
          await passwordInput.click();
          await passwordInput.fill(password);
          await googlePage.waitForTimeout(500);
          
          // 点击下一步
          const nextBtn = await googlePage.$('button:has-text("下一步"), button:has-text("Next"), #passwordNext');
          if (nextBtn) {
            console.log('🔘 点击登录');
            await nextBtn.click();
          }
        }

        // 等待登录完成
        console.log('⏳ 等待Google登录完成...');
        await googlePage.waitForTimeout(5000);

        // 检查是否需要处理其他验证（如2FA）
        const currentUrl2 = googlePage.url();
        if (currentUrl2.includes('accounts.google.com')) {
          console.log('⚠️ 可能需要额外的验证步骤（2FA/手机验证等）');
          await googlePage.screenshot({ path: '/home/z/my-project/download/google-2fa.png' });
          
          // 等待用户处理验证
          console.log('⏳ 等待用户完成验证（最多60秒）...');
          
          const startTime = Date.now();
          while (Date.now() - startTime < 60000) {
            await googlePage.waitForTimeout(3000);
            const url = googlePage.url();
            if (!url.includes('accounts.google.com')) {
              console.log('✅ Google登录验证完成');
              break;
            }
          }
        }
      }

      // 等待返回chat.z.ai
      await this.page.waitForTimeout(5000);
      
      // 检查是否登录成功
      const finalUrl = this.page.url();
      if (!finalUrl.includes('/auth')) {
        console.log('✅ Google登录成功');
        await this.page.screenshot({ path: '/home/z/my-project/download/login-success.png' });
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Google登录过程出错:', error);
      return false;
    }
  }

  private async tryEmailLogin(email: string, password: string): Promise<boolean> {
    if (!this.page) return false;

    try {
      console.log('📝 尝试邮箱密码登录...');
      
      // 确保在登录页面
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/auth')) {
        const loginBtn = await this.page.$('button:has-text("登录")');
        if (loginBtn) {
          await loginBtn.click();
          await this.page.waitForTimeout(2000);
        }
      }

      // 输入邮箱
      const emailInput = await this.page.$('input[type="email"], input[name="email"]');
      if (emailInput) {
        console.log('📝 输入邮箱...');
        await emailInput.click();
        await emailInput.fill(email);
        await this.page.waitForTimeout(500);
      }
      
      // 输入密码
      const passwordInput = await this.page.$('input[type="password"]');
      if (passwordInput) {
        console.log('📝 输入密码...');
        await passwordInput.click();
        await passwordInput.fill(password);
        await this.page.waitForTimeout(500);
      }
      
      // 处理验证码 - 如果有的话
      const captchaBtn = await this.page.$('#aliyunCaptcha-captcha-left, .aliyunCaptcha-captcha-left');
      if (captchaBtn) {
        console.log('⚠️ 检测到阿里云验证码');
        await captchaBtn.click();
        await this.page.waitForTimeout(3000);
        await this.page.screenshot({ path: '/home/z/my-project/download/captcha-required.png' });
        console.log('⏳ 等待验证码处理（60秒）...');
        await this.page.waitForTimeout(60000);
      }
      
      // 查找并点击提交按钮
      const submitButtons = await this.page.$$('button');
      for (const btn of submitButtons) {
        const text = await btn.textContent();
        if (text?.trim() === '登录' || text?.includes('登录')) {
          console.log('🔘 点击登录按钮');
          await btn.click();
          break;
        }
      }
      
      // 等待登录完成
      await this.page.waitForTimeout(5000);
      
      // 检查登录状态
      const newUrl = this.page.url();
      if (!newUrl.includes('/auth')) {
        console.log('✅ 邮箱登录成功');
        await this.page.screenshot({ path: '/home/z/my-project/download/login-success.png' });
        // 保存会话状态
        await this.context?.storageState({ path: `${this.userDataDir}/state.json` });
        return true;
      }
      
      console.log('⚠️ 登录状态未确认');
      await this.page.screenshot({ path: '/home/z/my-project/download/login-failed.png' });
      return false;
    } catch (error) {
      console.error('❌ 邮箱登录失败:', error);
      return false;
    }
  }

  async activateAgentMode(): Promise<boolean> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log('🤖 正在激活Agent模式...');
      await this.page.waitForTimeout(2000);
      
      // 查找Agent模式按钮
      const agentSelectors = [
        'button:has-text("Agent")',
        '[class*="tabTrigger"]:has-text("Agent")',
        'button:has-text("智能体")'
      ];

      for (const selector of agentSelectors) {
        try {
          const agentBtn = await this.page.$(selector);
          if (agentBtn) {
            const text = await agentBtn.textContent();
            console.log(`🔘 找到Agent按钮: ${text}`);
            await agentBtn.click();
            await this.page.waitForTimeout(1500);
            console.log('✅ Agent模式已激活');
            return true;
          }
        } catch (e) {
          // 继续尝试
        }
      }

      // 尝试遍历所有按钮
      const allButtons = await this.page.$$('button');
      for (const btn of allButtons) {
        const text = await btn.textContent();
        if (text && (text.toLowerCase().includes('agent') || text.includes('智能体'))) {
          // 确保是Agent而不是ChatAgent之类的组合
          if (text.trim() === 'Agent' || text.includes('Agent')) {
            console.log(`🔘 找到Agent相关元素: ${text}`);
            await btn.click();
            await this.page.waitForTimeout(1000);
            console.log('✅ Agent模式已激活');
            return true;
          }
        }
      }
      
      console.log('⚠️ 未找到Agent模式切换，使用默认模式');
      return true;
    } catch (error) {
      console.error('❌ 激活Agent模式失败:', error);
      return false;
    }
  }

  async findInputBox(): Promise<boolean> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log('🔍 正在查找输入框...');
      
      // 查找常见的输入框选择器
      const selectors = [
        'textarea[placeholder*="输入"]',
        'textarea[placeholder*="消息"]',
        'textarea[placeholder*="Message"]',
        'textarea',
        'div[contenteditable="true"]',
        'input[type="text"]'
      ];
      
      for (const selector of selectors) {
        const inputBox = await this.page.$(selector);
        if (inputBox) {
          const placeholder = await inputBox.getAttribute('placeholder');
          const isVisible = await inputBox.isVisible();
          console.log(`✅ 找到输入框: ${selector}, placeholder: ${placeholder}, visible: ${isVisible}`);
          
          if (isVisible) {
            // 点击输入框确保聚焦
            await inputBox.click();
            await this.page.waitForTimeout(300);
            return true;
          }
        }
      }
      
      console.log('⚠️ 未找到可用的输入框');
      return false;
    } catch (error) {
      console.error('❌ 查找输入框失败:', error);
      return false;
    }
  }

  async sendMessage(message: string): Promise<void> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log(`📤 发送消息: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`);
      
      // 查找输入框
      const inputBox = await this.page.$('textarea, div[contenteditable="true"]');
      
      if (!inputBox) {
        throw new Error('未找到输入框');
      }
      
      // 点击输入框确保聚焦
      await inputBox.click();
      await this.page.waitForTimeout(300);
      
      // 清空并输入消息
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.waitForTimeout(200);
      
      // 输入消息
      await inputBox.fill(message);
      await this.page.waitForTimeout(500);
      
      // 按Enter发送
      await this.page.keyboard.press('Enter');
      
      console.log('✅ 消息已发送');
    } catch (error) {
      console.error('❌ 发送消息失败:', error);
      throw error;
    }
  }

  /**
   * 流式等待响应 - 通过回调函数实时返回部分响应
   */
  async waitForResponseStream(
    onPartialResponse: StreamCallback,
    timeout: number = 180000
  ): Promise<string> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    console.log('⏳ 等待AI响应（流式模式）...');
    
    const startTime = Date.now();
    let lastContent = '';
    let lastSentContent = '';
    let lastLength = 0;
    let noChangeCount = 0;
    const minUpdateInterval = 800; // 最小更新间隔（毫秒）
    let lastUpdateTime = 0;
    
    // 首先发送初始状态
    await onPartialResponse('⏳ 正在思考...', false);
    
    // 首先等待新消息出现
    await this.page.waitForTimeout(2000);
    
    while (Date.now() - startTime < timeout) {
      // 检查页面是否还有效
      if (!this.page || this.page.isClosed()) {
        console.log('⚠️ 页面已关闭');
        await onPartialResponse(lastContent || '⚠️ 响应中断', true);
        return this.lastResponse || lastContent;
      }
      
      await this.page.waitForTimeout(500);
      
      try {
        // 查找AI响应
        const responseSelectors = [
          '.chat-assistant .markdown-prose',
          '.chat-assistant',
          '[data-role="assistant"]',
          '.assistant-message',
          '.markdown-prose',
          '.prose'
        ];

        let assistantMessages: any[] = [];
        
        for (const selector of responseSelectors) {
          try {
            const elements = await this.page.$$(selector);
            if (elements.length > 0) {
              assistantMessages = elements;
              break;
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        if (assistantMessages.length > 0) {
          // 获取最后一个AI响应
          const lastAssistant = assistantMessages[assistantMessages.length - 1];
          
          // 获取内容
          let responseText = await lastAssistant.textContent() || '';
          responseText = responseText.trim();
          
          if (responseText && responseText.length > 10) {
            // 检查内容是否有变化
            if (responseText.length !== lastLength) {
              lastLength = responseText.length;
              lastContent = responseText;
              noChangeCount = 0;
              
              // 清理响应文本
              const cleanedContent = this.cleanResponse(responseText);
              
              // 限制更新频率
              const now = Date.now();
              if (now - lastUpdateTime >= minUpdateInterval && cleanedContent !== lastSentContent) {
                lastUpdateTime = now;
                lastSentContent = cleanedContent;
                // 通过回调发送部分响应
                await onPartialResponse(cleanedContent, false);
              }
            } else {
              // 内容长度没有变化
              noChangeCount++;
              if (noChangeCount >= 6) {
                // 连续6次（3秒）长度没有变化，认为响应完成
                console.log('✅ 响应已完成');
                
                // 清理并发送最终响应
                const cleanedResponse = this.cleanResponse(lastContent);
                this.lastResponse = cleanedResponse;
                await onPartialResponse(cleanedResponse, true);
                return this.lastResponse;
              }
            }
          }
        }
      } catch (e) {
        console.log('⚠️ 获取响应时出错，继续等待...');
      }
    }
    
    console.log('⚠️ 等待响应超时');
    const cleanedResponse = this.cleanResponse(lastContent);
    await onPartialResponse(cleanedResponse || '⚠️ 响应超时', true);
    return this.lastResponse || cleanedResponse;
  }

  async waitForResponse(timeout: number = 120000): Promise<string> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    console.log('⏳ 等待AI响应...');
    
    const startTime = Date.now();
    let lastContent = '';
    let lastLength = 0;
    let noChangeCount = 0;
    
    // 首先等待新消息出现
    await this.page.waitForTimeout(2000);
    
    while (Date.now() - startTime < timeout) {
      // 检查页面是否还有效
      if (!this.page || this.page.isClosed()) {
        console.log('⚠️ 页面已关闭');
        return this.lastResponse || lastContent;
      }
      
      await this.page.waitForTimeout(1500);
      
      try {
        // 查找AI响应 - 使用多种选择器
        const responseSelectors = [
          '.chat-assistant .markdown-prose',
          '.chat-assistant',
          '[data-role="assistant"]',
          '.assistant-message',
          '.markdown-prose',
          '.prose',
          '.response-content'
        ];

        let assistantMessages: any[] = [];
        
        for (const selector of responseSelectors) {
          try {
            const elements = await this.page.$$(selector);
            if (elements.length > 0) {
              assistantMessages = elements;
              break;
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }
        
        if (assistantMessages.length > 0) {
          // 获取最后一个AI响应
          const lastAssistant = assistantMessages[assistantMessages.length - 1];
          
          // 获取内容
          let responseText = await lastAssistant.textContent() || '';
          responseText = responseText.trim();
          
          if (responseText && responseText.length > 10) {
            // 检查内容是否有变化
            if (responseText.length !== lastLength) {
              lastLength = responseText.length;
              lastContent = responseText;
              noChangeCount = 0;
              if (Date.now() - startTime > 5000) { // 只在5秒后打印更新日志
                console.log(`📝 响应生成中... (${responseText.length} 字符)`);
              }
            } else {
              // 内容长度没有变化
              noChangeCount++;
              if (noChangeCount >= 4) {
                // 连续4次（6秒）长度没有变化，认为响应完成
                console.log('✅ 响应已完成');
                // 清理响应文本
                const cleanedResponse = this.cleanResponse(responseText);
                this.lastResponse = cleanedResponse;
                return this.lastResponse;
              }
            }
          }
        } else {
          // 没有找到响应，等待
          noChangeCount++;
        }
      } catch (e) {
        console.log('⚠️ 获取响应时出错，继续等待...');
        // 短暂等待后继续
        await this.page.waitForTimeout(500);
      }
    }
    
    console.log('⚠️ 等待响应超时，返回已获取的内容');
    const cleanedResponse = this.cleanResponse(lastContent);
    return this.lastResponse || cleanedResponse;
  }

  private cleanResponse(text: string): string {
    if (!text) return '';
    
    // 移除思考过程标签和内容（如果有的话）
    // 保留实际回复内容
    let cleaned = text;
    
    // 如果包含"思考过程"，尝试提取实际回复
    const thinkingMatch = cleaned.match(/思考过程[\s\S]*?(?:\n\n|\n)([\s\S]+)$/);
    if (thinkingMatch) {
      cleaned = thinkingMatch[1].trim();
    }
    
    return cleaned.trim();
  }

  async getLatestResponse(): Promise<string> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      const responseSelectors = [
        '.markdown',
        '.prose',
        '.response-content',
        '.message-content',
        '[data-role="assistant"]',
        '.assistant-message'
      ];
      
      for (const selector of responseSelectors) {
        const elements = await this.page.$$(selector);
        if (elements.length > 0) {
          const lastElement = elements[elements.length - 1];
          const text = await lastElement.textContent();
          if (text && text.trim().length > 0) {
            return text.trim();
          }
        }
      }
      
      return this.lastResponse;
    } catch (error) {
      console.error('获取响应失败:', error);
      return this.lastResponse;
    }
  }

  async takeScreenshot(filename: string): Promise<void> {
    if (!this.page) throw new Error('浏览器未初始化');
    await this.page.screenshot({ path: filename, fullPage: true });
    console.log(`📸 截图已保存: ${filename}`);
  }

  async close(): Promise<void> {
    if (this.context) {
      // 保存会话状态
      try {
        await this.context.storageState({ path: `${this.userDataDir}/state.json` });
      } catch (e) {
        console.log('⚠️ 保存会话状态失败');
      }
      await this.context.close();
      this.context = null;
      this.page = null;
      console.log('🔒 浏览器已关闭');
    }
  }

  getPage(): Page | null {
    return this.page;
  }

  isReady(): boolean {
    return this.page !== null && this.isLoggedIn;
  }
}
