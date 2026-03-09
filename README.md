# Bot Bridge Service

Telegram Bot 桥接服务 - 连接 Telegram 和 chat.z.ai

## 功能

- 自动登录 chat.z.ai
- 激活 Agent 模式
- Telegram Bot 双向消息转发
- 会话持久化（无需重复登录）

## 安装

```bash
bun install
```

## 配置

复制 `.env.example` 为 `.env` 并填写配置：

```env
CHAT_EMAIL=your-email@example.com
CHAT_PASSWORD=your-password
TELEGRAM_TOKEN=your-telegram-bot-token
HEADLESS=true
```

## 运行

```bash
bun run index.ts
```

## Telegram 命令

- `/start` - 启动服务
- `/status` - 查看状态
- `/clear` - 清除对话

## 项目结构

```
bot-bridge/
├── index.ts              # 入口文件
├── bridge-service.ts     # 桥接服务主逻辑
├── browser-controller.ts # 浏览器控制模块
├── telegram-bot.ts       # Telegram Bot 服务
├── package.json
└── .env.example
```

## 技术栈

- [Bun](https://bun.sh/) - JavaScript 运行时
- [Playwright](https://playwright.dev/) - 浏览器自动化
- [Telegraf](https://telegraf.js.org/) - Telegram Bot 框架
