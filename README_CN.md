# WeApp DevTools MCP

> 面向 AI 编程助手的微信小程序开发者工具 MCP 服务，默认更注重隐私与数据最小化。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-111827)](https://modelcontextprotocol.io/)

[English](README.md)

WeApp DevTools MCP 将 MCP 客户端连接到本机微信开发者工具自动化端口。AI 助手可以导航小程序页面、检查元素、读取日志、截图、监听网络、mock `wx` API、运行本地调试脚本，并调用本机开发者工具 CLI；全程不需要托管中转服务。

[功能特性](#readme-section-1) · [快速开始](#readme-section-2) · [环境变量](#readme-section-3) · [工具列表](#readme-section-4) · [技术栈](#readme-section-5) · [项目结构](#readme-section-6) · [仓库导航](#readme-section-7)

<a id="readme-section-1"></a>

## 功能特性

- 通过本机微信开发者工具自动化能力控制小程序。
- 支持导航、点击、输入、元素检查、页面/组件数据读取、截图和紧凑页面快照。
- 采集控制台日志，以及 `wx.request`、`wx.uploadFile`、`wx.downloadFile` 的本地网络请求。
- 可 mock/restore `wx` API、执行小程序运行时函数、调用本机开发者工具 CLI。
- 可用 `WEAPP_TOOLS_PROFILE`、分类开关和工具 allow/deny 列表选择暴露哪些能力。
- 默认脱敏 token、ticket、cookie、session、openid、手机号、邮箱和本机 home 路径。
- 截图默认保存到本地临时文件，不直接进入对话上下文。
- 高风险能力需要通过单次 `riskConsent` 或 `WEAPP_ALLOW_*` 显式开启。
- 通过 npm `overrides` 固定存在漏洞的传递依赖版本。
- 兼容支持 stdio MCP server 的客户端。

<a id="readme-section-2"></a>

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

<a id="readme-section-3"></a>

## 环境变量

连接相关：

- `WEAPP_WS_ENDPOINT`：已运行的开发者工具自动化 WebSocket 地址，推荐 `ws://localhost:9420`。
- `WEAPP_AUTOMATOR_MODE`：`connect` 或 `launch`。
- `WEAPP_AUTO_ACCOUNT`：本地启动开发者工具时可选的账号名。
- `WEAPP_DEVTOOLS_TICKET`：受控本地启动时可选的开发者工具 ticket。
- `WEAPP_PROJECT_PATH`：小程序项目路径。
- `WECHAT_DEVTOOLS_CLI_PATH`：开发者工具 CLI 路径。
- `WEAPP_DEVTOOLS_PORT`：自动化端口。
- `WEAPP_AUTOLAUNCH`：设为 `true` 后自动启动开发者工具。
- `WEAPP_AUTOCLOSE`：设为 `true` 后，在断开连接时自动关闭启动出的开发者工具。
- `WEAPP_TRUST_PROJECT`：设为 `true` 后，在启动流程中信任目标项目。
- `WEAPP_DEVTOOLS_CWD`：本地开发者工具启动命令的工作目录。
- `WEAPP_DEVTOOLS_ARGS`：额外的开发者工具启动参数，按空白分割。
- `WEAPP_DEVTOOLS_TIMEOUT`、`WEAPP_LAUNCH_TIMEOUT`、`WEAPP_CONNECT_TIMEOUT`：超时控制。

隐私相关：

- `WEAPP_ALLOW_INLINE_SCREENSHOT=true`：允许截图直接返回到对话。
- `WEAPP_ALLOW_HIGH_RISK_WX=true`：允许高风险 `wx` 调用。
- `WEAPP_ALLOWED_WX_METHODS=login,request`：允许指定高风险 `wx` 方法。
- `WEAPP_BLOCKED_WX_METHODS=requestPayment`：始终阻断指定 `wx` 方法。
- `WEAPP_ALLOW_RISKY_TOOLS=true`：允许所有高风险本地工具。
- `WEAPP_ALLOW_EVALUATE=true`：允许 `mp_evaluate`。
- `WEAPP_ALLOW_MOCK_WX=true`：允许 `mp_mockWx` 和 `mp_restoreWx`。
- `WEAPP_ALLOW_CLI_COMMANDS=true`：允许 `mp_runCli`。
- `WEAPP_ALLOW_SENSITIVE_OUTPUT=true`：关闭输出脱敏。
- `WEAPP_MASK_INPUT_VALUES=false`：允许 `element_input` 回显输入值。
- `WEAPP_MAX_OUTPUT_CHARS`、`WEAPP_MAX_STRING_CHARS`、`WEAPP_MAX_ARRAY_ITEMS`、`WEAPP_MAX_OBJECT_KEYS`：输出大小限制。

工具暴露范围：

- `WEAPP_TOOLS_PROFILE`：`full`（默认）、`core` 或 `minimal`。
- `WEAPP_ENABLE_TOOL_CATEGORIES`、`WEAPP_DISABLE_TOOL_CATEGORIES`：逗号分隔的分类，如 `network`、`cli`、`experimental`。
- `WEAPP_ENABLE_TOOLS`、`WEAPP_DISABLE_TOOLS`：逗号分隔的工具名。
- `WEAPP_ENABLE_NETWORK_MONITORING=false`：关闭自动网络监听。
- `WEAPP_MAX_NETWORK_LOGS`：网络日志保留数量。

<a id="readme-section-4"></a>

## 工具列表

应用工具：

- `mp_ensureConnection`：确认自动化会话和当前页面。
- `mp_navigate`：支持 `navigateTo`、`redirectTo`、`reLaunch`、`switchTab`、`navigateBack`。
- `mp_screenshot`：截图，默认保存到本地临时文件。
- `mp_callWx`：调用小程序 `wx` 方法；高风险方法需要 `riskConsent` 或显式允许开关。
- `mp_getLogs`：读取捕获到的控制台日志。
- `mp_currentPage`：查看当前路由、参数、尺寸、滚动位置和可选页面数据。
- `mp_listProjects`：从本机开发者工具数据中列出最近项目。
- `mp_setDefaultProject`：保存默认本地项目路径。

页面工具：

- `page_snapshot`、`page_getElement`、`page_getElements`、`page_waitElement`、`page_waitTimeout`
- `page_getData`、`page_setData`、`page_callMethod`

元素工具：

- `element_tap`、`element_input`、`element_callMethod`
- `element_getData`、`element_setData`
- `element_getInnerElement`、`element_getInnerElements`
- `element_getWxml`、`element_getStyles`
- `element_scrollTo`、`element_getAttributes`、`element_getBoundingClientRect`

网络与调试工具：

- `mp_startNetwork`、`mp_stopNetwork`、`mp_getNetworkRequests`、`mp_getNetworkRequest`、`mp_clearNetworkRequests`
- `assert_element`：按选择器断言存在、文本、值、属性和可见状态。
- `mp_toolConfig`：查看当前工具 profile 和高风险能力开关。

运行时与 CLI 工具：

- `mp_evaluate`：在小程序运行时执行函数。
- `mp_mockWx`、`mp_restoreWx`：mock 或恢复 `wx` 方法。
- `mp_runCli`：调用本机微信开发者工具 CLI，不经过 shell 展开。

<a id="readme-section-5"></a>

## 技术栈

- TypeScript + Node.js 18+，用于本地 stdio MCP 服务。
- `fastmcp` 与 `@modelcontextprotocol/sdk`，负责 MCP 传输和工具注册。
- `miniprogram-automator` 配合官方微信开发者工具 CLI，负责本地自动化。
- `zod` 配合默认脱敏策略，负责连接参数解析、安全校验和输出限制。

<a id="readme-section-6"></a>

## 项目结构

```text
src/
  config.ts             环境变量与单次调用配置
  index.ts              MCP 服务入口
  security.ts           脱敏、输出限制和高风险方法策略
  toolProfile.ts        工具 profile 与分类过滤
  weappClient.ts        开发者工具自动化会话管理
  tools/                MCP 工具定义
docs/
  SECURITY_MODEL.md     隐私与安全模型
  releases/             发布说明
```

<a id="readme-section-7"></a>

## 仓库导航

| 入口 | 内容 |
| --- | --- |
| [`docs/`](docs/) | 项目说明与参考文档 |
| [`package.json`](package.json) | 依赖、开发与验证命令 |
| [`src/`](src/) | 应用或服务实现 |

<a id="readme-section-8"></a>

## 开发

```bash
npm ci
npm run build
npm audit --omit=dev
```

<a id="readme-section-9"></a>

## 发布

- 最新发布说明：[v0.2.1](docs/releases/v0.2.1.md)、[v0.2.0](docs/releases/v0.2.0.md)、[v0.1.0](docs/releases/v0.1.0.md)
- 推送 `v*` tag 后会触发 GitHub Actions release workflow，打包 npm tarball 并创建对应 GitHub Release。
- 在打公开版本 tag 前，先同步 README、`.env.example` 和 `docs/releases/`。

<a id="readme-section-10"></a>

## 隐私默认值

为了减少数据进入对话上下文的机会，服务默认：

- 脱敏文本和 JSON 输出。
- `element_input` 不回显输入值。
- 截图保存到本地文件，除非显式允许内联图片。
- 高风险 `wx`、evaluate、mock 和 CLI 能力需要单次同意或显式环境变量。
- 开发者工具启动日志会隐藏账号和 ticket 参数。
- 本地 MCP 配置文件使用 `0600` 权限写入。

完整说明见 [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md)。

<a id="readme-section-11"></a>

## 安全

如发现疑似安全问题，请不要发公开 issue。见 [SECURITY.md](SECURITY.md)。

<a id="readme-section-12"></a>

## 贡献

见 [CONTRIBUTING.md](CONTRIBUTING.md)。

<a id="readme-section-13"></a>

## 许可证

MIT。见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

<a id="readme-section-14"></a>

## 作者

- X: [Mileson07](https://x.com/Mileson07)
- 小红书: [超级峰](https://xhslink.com/m/4LnJ9aB1f97)
- 抖音: [超级峰](https://v.douyin.com/rH645q7trd8/)
