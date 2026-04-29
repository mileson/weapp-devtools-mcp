# WeApp DevTools MCP

> 面向 AI 编程助手的微信小程序开发者工具 MCP 服务，默认更注重隐私与数据最小化。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-111827)](https://modelcontextprotocol.io/)

[English](README.md)

WeApp DevTools MCP 将 MCP 客户端连接到本机微信开发者工具自动化端口。AI 助手可以导航小程序页面、检查元素、读取日志、截图，同时默认关闭容易泄露数据的路径。

## 功能特性

- 通过本机微信开发者工具自动化能力控制小程序。
- 支持导航、点击、输入、元素检查、页面/组件数据读取、截图。
- 默认脱敏 token、ticket、cookie、session、openid、手机号、邮箱和本机 home 路径。
- 截图默认保存到本地临时文件，不直接进入对话上下文。
- 默认阻断高风险 `wx` 调用，包括网络、登录、支付、定位、剪贴板、存储和文件 API。
- 通过 npm `overrides` 固定存在漏洞的传递依赖版本。
- 兼容支持 stdio MCP server 的客户端。

## 快速开始

### 前置条件

- Node.js 18 或更高版本。
- 微信开发者工具。
- 可在开发者工具中打开的小程序项目。
- 在开发者工具安全设置中开启：
  - HTTP 调试
  - 自动化测试

### 启动开发者工具自动化

macOS:

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli auto \
  --project /path/to/your/project \
  --auto-port 9420
```

Windows:

```cmd
"C:\Program Files (x86)\Tencent\微信web开发者工具\cli.bat" auto --project C:\path\to\your\project --auto-port 9420
```

### 配置 MCP 客户端

直接从 GitHub 使用：

```json
{
  "mcpServers": {
    "weapp-dev": {
      "command": "npx",
      "args": ["-y", "github:Mileson/weapp-devtools-mcp"],
      "env": {
        "WEAPP_WS_ENDPOINT": "ws://localhost:9420"
      }
    }
  }
}
```

本地开发：

```bash
git clone https://github.com/Mileson/weapp-devtools-mcp.git
cd weapp-devtools-mcp
npm ci
npm run build
WEAPP_WS_ENDPOINT=ws://localhost:9420 node dist/index.js
```

## 工具列表

应用工具：

- `mp_ensureConnection`：确认自动化会话和当前页面。
- `mp_navigate`：支持 `navigateTo`、`redirectTo`、`reLaunch`、`switchTab`、`navigateBack`。
- `mp_screenshot`：截图，默认保存到本地临时文件。
- `mp_callWx`：调用允许的小程序 `wx` 方法。
- `mp_getLogs`：读取捕获到的控制台日志。
- `mp_currentPage`：查看当前路由、参数、尺寸、滚动位置和可选页面数据。
- `mp_listProjects`：从本机开发者工具数据中列出最近项目。
- `mp_setDefaultProject`：保存默认本地项目路径。

页面工具：

- `page_getElement`、`page_getElements`、`page_waitElement`、`page_waitTimeout`
- `page_getData`、`page_setData`、`page_callMethod`

元素工具：

- `element_tap`、`element_input`、`element_callMethod`
- `element_getData`、`element_setData`
- `element_getInnerElement`、`element_getInnerElements`
- `element_getWxml`、`element_getStyles`
- `element_scrollTo`、`element_getAttributes`、`element_getBoundingClientRect`

## 隐私默认值

为了减少数据进入对话上下文的机会，服务默认：

- 脱敏文本和 JSON 输出。
- `element_input` 不回显输入值。
- 截图保存到本地文件，除非显式允许内联图片。
- 阻断高风险 `wx` 调用，除非显式允许。
- 开发者工具启动日志会隐藏账号和 ticket 参数。
- 本地 MCP 配置文件使用 `0600` 权限写入。

完整说明见 [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md)。

## 环境变量

连接相关：

- `WEAPP_WS_ENDPOINT`：已运行的开发者工具自动化 WebSocket 地址，推荐 `ws://localhost:9420`。
- `WEAPP_AUTOMATOR_MODE`：`connect` 或 `launch`。
- `WEAPP_PROJECT_PATH`：小程序项目路径。
- `WECHAT_DEVTOOLS_CLI_PATH`：开发者工具 CLI 路径。
- `WEAPP_DEVTOOLS_PORT`：自动化端口。
- `WEAPP_AUTOLAUNCH`：设为 `true` 后自动启动开发者工具。
- `WEAPP_DEVTOOLS_TIMEOUT`、`WEAPP_LAUNCH_TIMEOUT`、`WEAPP_CONNECT_TIMEOUT`：超时控制。

隐私相关：

- `WEAPP_ALLOW_INLINE_SCREENSHOT=true`：允许截图直接返回到对话。
- `WEAPP_ALLOW_HIGH_RISK_WX=true`：允许高风险 `wx` 调用。
- `WEAPP_ALLOW_SENSITIVE_OUTPUT=true`：关闭输出脱敏。
- `WEAPP_MASK_INPUT_VALUES=false`：允许 `element_input` 回显输入值。
- `WEAPP_MAX_OUTPUT_CHARS`、`WEAPP_MAX_STRING_CHARS`、`WEAPP_MAX_ARRAY_ITEMS`、`WEAPP_MAX_OBJECT_KEYS`：输出大小限制。

## 项目结构

```text
src/
  config.ts             环境变量与单次调用配置
  index.ts              MCP 服务入口
  security.ts           脱敏、输出限制和高风险方法策略
  weappClient.ts        开发者工具自动化会话管理
  tools/                MCP 工具定义
docs/
  SECURITY_MODEL.md     隐私与安全模型
  releases/             发布说明
```

## 开发

```bash
npm ci
npm run build
npm audit --omit=dev
```

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 安全

如发现疑似安全问题，请不要发公开 issue。见 [SECURITY.md](SECURITY.md)。

## 许可证

MIT。见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 作者

- X: [Mileson07](https://x.com/Mileson07)
- 小红书: [超级峰](https://xhslink.com/m/4LnJ9aB1f97)
- 抖音: [超级峰](https://v.douyin.com/rH645q7trd8/)
