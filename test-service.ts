#!/usr/bin/env bun
import { BrowserController } from './browser-controller';

async function testService() {
  console.log('🧪 测试Bot桥接服务核心功能...\n');
  
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
      await controller.sendMessage('你好，请简单回复一句话');
      
      // 等待响应
      console.log('\n⏳ 等待AI响应...');
      const response = await controller.waitForResponse(60000);
      
      console.log('\n📝 AI响应:');
      console.log('─'.repeat(50));
      console.log(response || '(无响应)');
      console.log('─'.repeat(50));
      
      // 截图
      await controller.takeScreenshot('/home/z/my-project/download/test-result.png');
    }
    
    console.log('\n✅ 测试完成！');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await controller.close();
  }
}

testService().catch(console.error);
