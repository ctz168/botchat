#!/usr/bin/env bun
import { BrowserController } from './browser-controller';

async function testBridge() {
  console.log('🧪 测试桥接服务核心功能...\n');
  
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
    
    if (!loginSuccess) {
      console.log('❌ 登录失败');
      return;
    }
    
    // 激活Agent模式
    await controller.activateAgentMode();
    
    // 查找输入框
    const inputFound = await controller.findInputBox();
    if (!inputFound) {
      console.log('❌ 未找到输入框');
      return;
    }
    
    // 发送测试消息
    console.log('\n📤 发送测试消息...');
    await controller.sendMessage('你好，请简单介绍一下你自己');
    
    // 等待响应
    console.log('\n⏳ 等待AI响应...');
    const response = await controller.waitForResponse(60000);
    
    console.log('\n📝 AI响应:');
    console.log('─'.repeat(50));
    console.log(response || '(无响应)');
    console.log('─'.repeat(50));
    
    // 截图
    await controller.takeScreenshot('/home/z/my-project/download/bridge-test-result.png');
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await controller.close();
  }
}

testBridge().catch(console.error);
