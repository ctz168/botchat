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
  private conversationContext: Map<number, string[]> = new Map();
  private isProcessing: boolean = false;
  private messageQueue: Array<{chatId: number, text: string, updateMessage: (text: string) => Promise<void>, resolve: () => void}> = [];

  constructor(private config: BridgeConfig) {
    this.browserController = new BrowserController({
      headless: config.headless ?? true,
      slowMo: 100
    });
  }

  async initialize(): Promise<void> {
    console.log('🚀 初始化桥接服务...');
    console.log('='.repeat(50));

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
      console.log('⚠️ 登录可能未完成，尝试继续...');
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
    console.log('='.repeat(50));
    console.log('✅ 桥接服务初始化完成');
  }

  private async handleTelegramMessage(
    chatId: number, 
    text: string, 
    updateMessage: (text: string) => Promise<void>
  ): Promise<string> {
    console.log(`📨 收到Telegram消息 [${chatId}]: ${text.substring(0, 50)}...`);

    if (!this.browserController.isReady()) {
      await updateMessage('⚠️ 浏览器服务未就绪，请稍后重试。');
      return '⚠️ 浏览器服务未就绪，请稍后重试。';
    }

    // 如果正在处理消息，加入队列
    if (this.isProcessing) {
      return new Promise((resolve) => {
        console.log(`📋 消息加入队列，等待处理...`);
        this.messageQueue.push({ chatId, text, updateMessage, resolve: () => resolve('') });
      });
    }

    this.isProcessing = true;

    try {
      // 发送消息到chat.z.ai
      await this.browserController.sendMessage(text);
      
      // 使用流式等待响应
      let finalResponse = '';
      await this.browserController.waitForResponseStream(
        async (partialResponse: string, isComplete: boolean) => {
          // 通过Telegram实时更新消息
          await updateMessage(partialResponse);
          
          if (isComplete) {
            finalResponse = partialResponse;
          }
        },
        180000
      );
      
      // 保存对话上下文
      if (!this.conversationContext.has(chatId)) {
        this.conversationContext.set(chatId, []);
      }
      this.conversationContext.get(chatId)!.push(`User: ${text}`);
      this.conversationContext.get(chatId)!.push(`AI: ${finalResponse}`);
      
      return finalResponse || '⚠️ 未收到有效响应';
    } catch (error) {
      console.error('处理消息失败:', error);
      const errorMsg = `❌ 处理消息时发生错误: ${error instanceof Error ? error.message : '未知错误'}`;
      await updateMessage(errorMsg);
      return errorMsg;
    } finally {
      this.isProcessing = false;
      
      // 处理队列中的下一条消息
      const nextMessage = this.messageQueue.shift();
      if (nextMessage) {
        console.log('📋 处理队列中的下一条消息...');
        this.handleTelegramMessage(
          nextMessage.chatId, 
          nextMessage.text, 
          nextMessage.updateMessage
        ).then(() => nextMessage.resolve());
      }
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
    console.log('📱 请在Telegram中发送消息测试');
    console.log('✨ 支持流式输出，实时显示AI响应！');
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

  // 测试发送消息
  async testSendMessage(message: string): Promise<string> {
    if (!this.browserController.isReady()) {
      throw new Error('浏览器服务未就绪');
    }

    console.log(`🧪 测试发送消息: ${message}`);
    
    await this.browserController.sendMessage(message);
    
    let finalResponse = '';
    await this.browserController.waitForResponseStream(
      async (partialResponse: string, isComplete: boolean) => {
        console.log(`📝 部分响应 (${partialResponse.length} 字符) 完成: ${isComplete}`);
        if (isComplete) {
          finalResponse = partialResponse;
        }
      },
      120000
    );
    
    return finalResponse || '未收到响应';
  }
}
