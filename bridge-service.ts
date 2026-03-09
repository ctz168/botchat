import { BrowserController } from './browser-controller';
import { TelegramBotService } from './telegram-bot';

export interface BridgeConfig {
  email: string;
  password: string;
  telegramToken: string;
  headless?: boolean;
}

export class BridgeService {
  private browserController: BrowserController;
  private telegramBot: TelegramBotService | null = null;
  private isInitialized: boolean = false;
  private pendingResponses: Map<number, (response: string) => void> = new Map();
  private conversationContext: Map<number, string[]> = new Map();

  constructor(private config: BridgeConfig) {
    this.browserController = new BrowserController({
      headless: config.headless ?? true,
      slowMo: 100
    });
  }

  async initialize(): Promise<void> {
    console.log('🚀 初始化桥接服务...');

    // 初始化浏览器
    await this.browserController.initialize();
    
    // 导航到chat.z.ai
    await this.browserController.navigateToChatZAI();
    
    // 登录
    const loginSuccess = await this.browserController.login(
      this.config.email,
      this.config.password
    );
    
    if (!loginSuccess) {
      throw new Error('登录失败');
    }
    
    // 激活Agent模式
    await this.browserController.activateAgentMode();
    
    // 查找输入框
    await this.browserController.findInputBox();
    
    // 初始化Telegram Bot
    this.telegramBot = new TelegramBotService({
      token: this.config.telegramToken,
      onMessage: this.handleTelegramMessage.bind(this)
    });
    
    this.isInitialized = true;
    console.log('✅ 桥接服务初始化完成');
  }

  private async handleTelegramMessage(chatId: number, text: string): Promise<string> {
    console.log(`📨 处理Telegram消息 [${chatId}]: ${text.substring(0, 50)}...`);

    if (!this.browserController.isReady()) {
      return '⚠️ 浏览器服务未就绪，请稍后重试。';
    }

    try {
      // 发送消息到chat.z.ai
      await this.browserController.sendMessage(text);
      
      // 等待响应
      const response = await this.browserController.waitForResponse(120000);
      
      // 保存对话上下文
      if (!this.conversationContext.has(chatId)) {
        this.conversationContext.set(chatId, []);
      }
      this.conversationContext.get(chatId)!.push(`User: ${text}`);
      this.conversationContext.get(chatId)!.push(`AI: ${response}`);
      
      return response || '⚠️ 未收到有效响应';
    } catch (error) {
      console.error('处理消息失败:', error);
      return `❌ 处理消息时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    if (this.telegramBot) {
      await this.telegramBot.start();
    }
    
    console.log('🎉 桥接服务已启动，等待消息...');
  }

  async stop(): Promise<void> {
    if (this.telegramBot) {
      await this.telegramBot.stop();
    }
    await this.browserController.close();
    console.log('👋 桥接服务已停止');
  }

  async testConnection(): Promise<{ browser: boolean; telegram: boolean }> {
    return {
      browser: this.browserController.isReady(),
      telegram: this.telegramBot !== null
    };
  }
}
