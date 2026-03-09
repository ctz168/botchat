import { Telegraf, Context, Markup } from 'telegraf';
import { message } from 'telegraf/filters';

export interface TelegramBotConfig {
  token: string;
  onMessage: (chatId: number, text: string, updateMessage: (text: string) => Promise<void>) => Promise<string>;
}

export class TelegramBotService {
  private bot: Telegraf;
  private onMessage: (chatId: number, text: string, updateMessage: (text: string) => Promise<void>) => Promise<string>;
  private authorizedChats: Set<number> = new Set();
  private isRunning: boolean = false;

  constructor(config: TelegramBotConfig) {
    this.bot = new Telegraf(config.token);
    this.onMessage = config.onMessage;
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // 启动命令
    this.bot.command('start', async (ctx: Context) => {
      const chatId = ctx.chat?.id;
      if (chatId) {
        this.authorizedChats.add(chatId);
      }
      
      await ctx.reply(
        '🤖 Bot桥接服务已启动！\n\n' +
        '发送任何消息，我将转发到chat.z.ai并返回响应。\n\n' +
        '✨ 支持流式输出，实时显示AI响应！\n\n' +
        '命令列表:\n' +
        '/start - 启动服务\n' +
        '/status - 查看状态\n' +
        '/clear - 清除对话',
        Markup.keyboard([['/status', '/clear']])
          .oneTime()
          .resize()
      );
    });

    // 状态命令
    this.bot.command('status', async (ctx: Context) => {
      const status = this.isRunning ? '✅ 运行中' : '❌ 未运行';
      const chatId = ctx.chat?.id;
      const isAuthorized = chatId && this.authorizedChats.has(chatId);
      
      await ctx.reply(
        `📊 服务状态\n\n` +
        `状态: ${status}\n` +
        `授权: ${isAuthorized ? '✅ 已授权' : '❌ 未授权'}\n` +
        `授权用户数: ${this.authorizedChats.size}`
      );
    });

    // 清除命令
    this.bot.command('clear', async (ctx: Context) => {
      await ctx.reply('🗑️ 对话已清除，开始新对话。');
    });

    // 处理文本消息
    this.bot.on(message('text'), async (ctx: Context) => {
      const chatId = ctx.chat?.id;
      const text = ctx.message?.text;

      if (!chatId || !text) return;

      // 忽略命令
      if (text.startsWith('/')) return;

      // 检查授权
      if (!this.authorizedChats.has(chatId)) {
        this.authorizedChats.add(chatId);
        await ctx.reply('✅ 已自动授权，正在处理您的消息...');
      }

      try {
        // 发送"正在输入"状态
        await ctx.sendChatAction('typing');

        console.log(`📱 Telegram收到消息 [${chatId}]: ${text.substring(0, 50)}...`);

        // 创建一个可编辑的消息
        let messageToDelete: any = null;
        let currentMessageText = '';
        
        // 更新消息的函数
        const updateMessage = async (newText: string) => {
          try {
            // 发送"正在输入"状态
            await ctx.sendChatAction('typing');
            
            if (messageToDelete === null) {
              // 首次发送消息
              messageToDelete = await ctx.reply(newText);
              currentMessageText = newText;
            } else if (newText !== currentMessageText) {
              // 编辑现有消息
              // Telegram消息长度限制
              const textToSend = newText.length > 4000 
                ? newText.substring(0, 4000) + '\n\n... (消息过长，已截断)' 
                : newText;
              
              try {
                await this.bot.telegram.editMessageText(
                  chatId,
                  messageToDelete.message_id,
                  undefined,
                  textToSend
                );
                currentMessageText = newText;
              } catch (editError: any) {
                // 如果消息内容相同，Telegram会报错，忽略
                if (!editError.description?.includes('exactly the same')) {
                  console.log('⚠️ 编辑消息失败，发送新消息');
                  messageToDelete = await ctx.reply(textToSend);
                  currentMessageText = newText;
                }
              }
            }
          } catch (error) {
            console.error('更新消息失败:', error);
          }
        };

        // 调用消息处理回调（带流式更新）
        await this.onMessage(chatId, text, updateMessage);

      } catch (error) {
        console.error('处理Telegram消息失败:', error);
        await ctx.reply('❌ 处理消息时发生错误，请稍后重试。');
      }
    });

    // 错误处理
    this.bot.catch((err: Error, ctx: Context) => {
      console.error('Telegram Bot错误:', err);
    });
  }

  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let remaining = text;

    while (remaining.length > maxLength) {
      // 尝试在句子边界分割
      let splitIndex = maxLength;
      const lastPeriod = remaining.lastIndexOf('。', maxLength);
      const lastNewline = remaining.lastIndexOf('\n', maxLength);
      const lastSpace = remaining.lastIndexOf(' ', maxLength);

      if (lastPeriod > maxLength / 2) {
        splitIndex = lastPeriod + 1;
      } else if (lastNewline > maxLength / 2) {
        splitIndex = lastNewline + 1;
      } else if (lastSpace > maxLength / 2) {
        splitIndex = lastSpace + 1;
      }

      chunks.push(remaining.substring(0, splitIndex).trim());
      remaining = remaining.substring(splitIndex).trim();
    }

    if (remaining.length > 0) {
      chunks.push(remaining);
    }

    return chunks;
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    try {
      const chunks = this.splitMessage(text, 4000);
      for (const chunk of chunks) {
        await this.bot.telegram.sendMessage(chatId, chunk);
      }
    } catch (error) {
      console.error('发送Telegram消息失败:', error);
    }
  }

  async broadcastMessage(text: string): Promise<void> {
    for (const chatId of this.authorizedChats) {
      await this.sendMessage(chatId, text);
    }
  }

  async start(): Promise<void> {
    try {
      await this.bot.launch();
      this.isRunning = true;
      console.log('🤖 Telegram Bot已启动');
    } catch (error) {
      console.error('启动Telegram Bot失败:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.bot.stop();
    this.isRunning = false;
    console.log('🛑 Telegram Bot已停止');
  }
}
