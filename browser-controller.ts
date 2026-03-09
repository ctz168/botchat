import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { existsSync, mkdirSync } from 'fs';

export interface BrowserControllerConfig {
  headless?: boolean;
  slowMo?: number;
  userDataDir?: string;
}

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
    this.userDataDir = config.userDataDir || '/home/z/my-project/bot-bridge/browser-data';
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
        '--disable-blink-features=AutomationControlled'
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
      // 检查是否已登录
      const currentUrl = this.page.url();
      if (!currentUrl.includes('/auth')) {
        console.log('✅ 已登录（无需重新登录）');
        this.isLoggedIn = true;
        return true;
      }
      
      console.log('🔐 开始登录流程...');
      
      // 点击登录按钮（如果在首页）
      const loginBtn = await this.page.$('button:has-text("登录")');
      if (loginBtn) {
        await loginBtn.click();
        await this.page.waitForTimeout(2000);
      }
      
      // 输入邮箱
      const emailInput = await this.page.$('input[type="email"]');
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
      
      // 点击登录按钮
      const submitButtons = await this.page.$$('button');
      for (const btn of submitButtons) {
        const text = await btn.textContent();
        if (text?.trim() === '登录') {
          console.log('🔘 点击登录按钮');
          await btn.click();
          break;
        }
      }
      
      // 等待登录完成
      await this.page.waitForTimeout(5000);
      
      // 检查是否有验证码
      const captcha = await this.page.$('.captcha, [class*="captcha"], iframe[src*="captcha"]');
      if (captcha) {
        console.log('⚠️ 检测到验证码，需要人工处理');
        await this.page.screenshot({ path: '/home/z/my-project/download/captcha.png' });
        // 等待用户处理验证码
        console.log('⏳ 等待验证码处理（60秒）...');
        await this.page.waitForTimeout(60000);
      }
      
      // 检查登录状态
      const newUrl = this.page.url();
      if (!newUrl.includes('/auth')) {
        console.log('✅ 登录成功');
        this.isLoggedIn = true;
        // 保存会话状态
        await this.context?.storageState({ path: `${this.userDataDir}/state.json` });
        return true;
      }
      
      console.log('⚠️ 登录状态未确认');
      return false;
    } catch (error) {
      console.error('❌ 登录失败:', error);
      return false;
    }
  }

  async activateAgentMode(): Promise<boolean> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      console.log('🤖 正在激活Agent模式...');
      await this.page.waitForTimeout(2000);
      
      // 查找Agent模式按钮或选项
      const allElements = await this.page.$$('button, div[role="button"], span, label, a');
      for (const el of allElements) {
        const text = await el.textContent();
        if (text && (text.toLowerCase().includes('agent') || text.includes('智能体'))) {
          console.log(`🔘 找到Agent相关元素: ${text}`);
          await el.click();
          await this.page.waitForTimeout(1000);
          console.log('✅ Agent模式已激活');
          return true;
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
        'textarea',
        'div[contenteditable="true"]',
        'input[type="text"]'
      ];
      
      for (const selector of selectors) {
        const inputBox = await this.page.$(selector);
        if (inputBox) {
          const placeholder = await inputBox.getAttribute('placeholder');
          console.log(`✅ 找到输入框: ${selector}, placeholder: ${placeholder}`);
          return true;
        }
      }
      
      console.log('⚠️ 未找到输入框');
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
      
      // 点击输入框
      await inputBox.click();
      await this.page.waitForTimeout(300);
      
      // 清空并输入消息
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('a');
      await this.page.keyboard.up('Control');
      await this.page.waitForTimeout(200);
      
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

  async waitForResponse(timeout: number = 120000): Promise<string> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    console.log('⏳ 等待AI响应...');
    
    const startTime = Date.now();
    let lastContent = '';
    let stableCount = 0;
    let lastMessageCount = 0;
    
    // 首先等待新消息出现
    await this.page.waitForTimeout(2000);
    
    while (Date.now() - startTime < timeout) {
      await this.page.waitForTimeout(1500);
      
      try {
        // 使用正确的选择器查找AI响应
        // .chat-assistant 是AI响应的容器
        const assistantMessages = await this.page.$$('.chat-assistant');
        
        if (assistantMessages.length > lastMessageCount) {
          // 有新消息出现
          lastMessageCount = assistantMessages.length;
          console.log(`📝 检测到新消息 (共${lastMessageCount}条)`);
        }
        
        if (assistantMessages.length > 0) {
          // 获取最后一个AI响应
          const lastAssistant = assistantMessages[assistantMessages.length - 1];
          
          // 获取markdown内容
          const proseElement = await lastAssistant.$('.markdown-prose');
          let responseText = '';
          
          if (proseElement) {
            responseText = await proseElement.textContent() || '';
          } else {
            responseText = await lastAssistant.textContent() || '';
          }
          
          responseText = responseText.trim();
          
          // 检查是否还在生成中
          const thinkingBlock = await lastAssistant.$('.thinking-block, [class*="thinking"]');
          const isThinking = thinkingBlock !== null;
          
          if (responseText && responseText.length > 10) {
            if (responseText !== lastContent) {
              lastContent = responseText;
              stableCount = 0;
              console.log(`📝 响应更新中... (${responseText.length} 字符)${isThinking ? ' [思考中...]' : ''}`);
            } else if (!isThinking) {
              stableCount++;
              if (stableCount >= 2) {
                console.log('✅ 响应已稳定');
                this.lastResponse = responseText;
                return this.lastResponse;
              }
            }
          }
        }
      } catch (e) {
        console.log('⚠️ 获取响应时出错，继续等待...');
      }
    }
    
    console.log('⚠️ 等待响应超时，返回最后获取的内容');
    return this.lastResponse || lastContent;
  }

  async getLatestResponse(): Promise<string> {
    if (!this.page) throw new Error('浏览器未初始化');
    
    try {
      // 查找最新的AI响应
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
      await this.context.storageState({ path: `${this.userDataDir}/state.json` });
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
