# Bot Bridge Service

Telegram Bot 桥接服务 - 连接 Telegram 和 chat.z.ai

## 功能特性

- ✅ 自动登录 chat.z.ai（支持邮箱密码登录和Google账号登录）
- ✅ 自动激活 Agent 模式
- ✅ Telegram Bot 双向消息转发
- ✅ 会话持久化（无需重复登录）
- ✅ 消息队列处理（支持多用户并发）
- ✅ 自动重连机制

## 系统要求

- Node.js 18+ 或 Bun
- Linux/macOS/Windows

## 快速开始

### 1. 克隆仓库

```bash
git clone https://github.com/ctz168/botchat.git
cd botchat
```

### 2. 安装依赖

```bash
bun install
```

### 3. 安装浏览器

```bash
bunx playwright install chromium
```

### 4. 配置环境变量

复制配置文件模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写您的配置：

```env
# chat.z.ai 登录邮箱
CHAT_EMAIL=your-email@example.com

# chat.z.ai 登录密码
CHAT_PASSWORD=your-password

# Telegram Bot Token（从 @BotFather 获取）
TELEGRAM_TOKEN=your-telegram-bot-token

# 是否使用无头模式
HEADLESS=true
```

### 5. 运行服务

```bash
bun run start
```

或者使用开发模式（自动重启）：

```bash
bun run dev
```

## Telegram 命令

在 Telegram 中向您的 Bot 发送以下命令：

| 命令 | 说明 |
|------|------|
| `/start` | 启动服务并显示帮助信息 |
| `/status` | 查看服务状态 |
| `/clear` | 清除对话历史 |

## 项目结构

```
botchat/
├── index.ts              # 入口文件
├── bridge-service.ts     # 桥接服务主逻辑
├── browser-controller.ts # 浏览器控制模块
├── telegram-bot.ts       # Telegram Bot 服务
├── test-service.ts       # 测试脚本
├── package.json          # 项目配置
├── .env.example          # 环境变量模板
└── README.md             # 说明文档
```

## 技术栈

- [Bun](https://bun.sh/) - JavaScript 运行时
- [Playwright](https://playwright.dev/) - 浏览器自动化
- [Telegraf](https://telegraf.js.org/) - Telegram Bot 框架

## 工作原理

1. **浏览器控制**: 使用 Playwright 启动 Chromium 浏览器，自动登录 chat.z.ai
2. **消息监听**: Telegram Bot 监听用户消息
3. **消息转发**: 将 Telegram 消息发送到 chat.z.ai，获取 AI 响应
4. **响应返回**: 将 AI 响应返回给 Telegram 用户

## 故障排除

### 登录问题

如果登录失败：
1. 检查邮箱和密码是否正确
2. 设置 `HEADLESS=false` 查看浏览器操作过程
3. 查看 `download/` 目录下的截图

### Telegram Bot 问题

1. 确保 Bot Token 正确
2. 确保已向 Bot 发送 `/start` 命令
3. 检查 Bot 是否被 Telegram 封禁

### 响应超时

如果响应超时：
1. 检查网络连接
2. 增加 `waitForResponse` 的超时时间
3. 查看 `download/` 目录下的截图确认页面状态

## 开发指南

### 运行测试

```bash
bun run test-service.ts
```

### 调试模式

设置环境变量启用详细日志：

```bash
DEBUG=true bun run start
```

## 注意事项

- 请勿在公共环境中暴露您的登录凭据
- 建议使用专用的 Telegram Bot Token
- 浏览器数据存储在 `browser-data/` 目录中

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
