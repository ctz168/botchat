#!/usr/bin/env bun
import { BridgeService } from './bridge-service';

// 配置信息
const config = {
  email: process.env.CHAT_EMAIL || 'zhudongshan@gmail.com',
  password: process.env.CHAT_PASSWORD || 'dongshan',
  telegramToken: process.env.TELEGRAM_TOKEN || '8681780085:AAG8Rf04IxRHw0RLow-u6_NzE-eaOH6GUgU',
  headless: process.env.HEADLESS !== 'false' // 默认使用headless模式
};

console.log('\n' + '='.repeat(60));
console.log('🤖 Bot桥接服务 - Telegram ↔ chat.z.ai');
console.log('='.repeat(60));
console.log(`📧 登录邮箱: ${config.email}`);
console.log(`🔑 Telegram Token: ${config.telegramToken.substring(0, 15)}...`);
console.log(`🖥️ 无头模式: ${config.headless ? '是' : '否'}`);
console.log('='.repeat(60) + '\n');

const bridge = new BridgeService(config);

// 处理进程信号
process.on('SIGINT', async () => {
  console.log('\n🛑 收到终止信号，正在关闭...');
  await bridge.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 收到终止信号，正在关闭...');
  await bridge.stop();
  process.exit(0);
});

// 处理未捕获的错误
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的错误:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise拒绝:', reason);
});

// 启动服务
bridge.start().catch((error) => {
  console.error('❌ 启动失败:', error);
  process.exit(1);
});
