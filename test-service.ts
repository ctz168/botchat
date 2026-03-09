#!/usr/bin/env bun
import { BrowserController } from './browser-controller';

async function testStreaming() {
  console.log('🧪 测试流式响应功能...\n');
  
  const controller = new BrowserController({
    headless: true,
    slowMo: 100
  });
  
  try {
    // 初始化浏览器
    await controller.initialize();
    
    // 导航到chat.z.ai
    await controller.navigateToChatZAI();
    
    // 登录
    const loginSuccess = await controller.login(
      'zhudongshan@gmail.com',
      'dongshan'
    );
    
    console.log(`\n📊 登录结果: ${loginSuccess ? '✅ 成功' : '❌ 失败'}`);
    
    // 激活Agent模式
    await controller.activateAgentMode();
    
    // 查找输入框
    const inputFound = await controller.findInputBox();
    console.log(`📊 输入框: ${inputFound ? '✅ 已找到' : '❌ 未找到'}`);
    
    if (inputFound) {
      // 发送测试消息
      console.log('\n📤 发送测试消息...');
      await controller.sendMessage('你好，请介绍下你自己，用简短的话回复');
      
      // 测试流式响应
      console.log('\n⏳ 测试流式响应...');
      console.log('─'.repeat(50));
      
      let lastLength = 0;
      const finalResponse = await controller.waitForResponseStream(
        async (partialResponse: string, isComplete: boolean) => {
          const newContent = partialResponse.length > lastLength;
          if (newContent || isComplete) {
            lastLength = partialResponse.length;
            process.stdout.write(`\r📝 ${isComplete ? '✅ 完成' : '⏳ 生成中'}: ${partialResponse.length} 字符`);
          }
        },
        120000
      );
      
      console.log('\n' + '─'.repeat(50));
      console.log('\n📝 最终响应:');
      console.log('─'.repeat(50));
      console.log(finalResponse);
      console.log('─'.repeat(50));
      
      // 截图
      await controller.takeScreenshot('/home/z/my-project/download/streaming-test-result.png');
    }
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await controller.close();
  }
}

testStreaming().catch(console.error);
