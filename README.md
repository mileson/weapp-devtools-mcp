# WeApp DevTools MCP

> A privacy-first MCP server for controlling WeChat Mini Program DevTools from AI coding agents.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-stdio-111827)](https://modelcontextprotocol.io/)

[简体中文](README_CN.md)

WeApp DevTools MCP connects an MCP client to a local WeChat Mini Program DevTools automation endpoint. It lets an agent navigate pages, inspect elements, collect logs, and capture screenshots while keeping risky data paths closed by default.

## Features

- Control Mini Program pages through local WeChat DevTools automation.
- Navigate, tap, input, inspect elements, read page/component data, and capture screenshots.
- Redact sensitive output by default, including tokens, tickets, cookies, sessions, phone numbers, email addresses, and local home paths.
- Save screenshots to local temp files by default instead of returning inline images.
- Block high-risk `wx` calls by default, including network, login, payment, location, clipboard, storage, and file APIs.
- Patch vulnerable transitive dependency versions through npm `overrides`.
- Works with any MCP client that supports stdio servers.

## Quick Start

### Prerequisites

- Node.js 18 or newer.
- WeChat Mini Program DevTools.
- A Mini Program project that can open in DevTools.
- DevTools security settings enabled:
  - HTTP debugging
  - Automation testing

### Start WeChat DevTools Automation

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

### Install In An MCP Client

Use directly from GitHub:

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

Local development:

```bash
git clone https://github.com/Mileson/weapp-devtools-mcp.git
cd weapp-devtools-mcp
npm ci
npm run build
WEAPP_WS_ENDPOINT=ws://localhost:9420 node dist/index.js
```

## Tools

Application tools:

- `mp_ensureConnection`: verify the automation session and current page.
- `mp_navigate`: navigate with `navigateTo`, `redirectTo`, `reLaunch`, `switchTab`, or `navigateBack`.
- `mp_screenshot`: capture the current viewport. Saves locally by default.
- `mp_callWx`: call allowed Mini Program `wx` methods.
- `mp_getLogs`: read captured console logs.
- `mp_currentPage`: inspect current route, query, size, scroll position, and optional data.
- `mp_listProjects`: list recent projects discovered from local DevTools data.
- `mp_setDefaultProject`: store a default local project path.

Page tools:

- `page_getElement`, `page_getElements`, `page_waitElement`, `page_waitTimeout`
- `page_getData`, `page_setData`, `page_callMethod`

Element tools:

- `element_tap`, `element_input`, `element_callMethod`
- `element_getData`, `element_setData`
- `element_getInnerElement`, `element_getInnerElements`
- `element_getWxml`, `element_getStyles`
- `element_scrollTo`, `element_getAttributes`, `element_getBoundingClientRect`

## Privacy Defaults

The server is designed to avoid accidental data leakage in agent transcripts:

- Text and JSON outputs are redacted by default.
- `element_input` does not echo typed values.
- Screenshots are saved to local temp files unless inline screenshots are explicitly enabled.
- High-risk `wx` calls are blocked unless explicitly enabled.
- DevTools launch logs redact account and ticket arguments.
- Local MCP config is written with `0600` permissions.

For the full model and escape hatches, see [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md).

## Environment Variables

Connection:

- `WEAPP_WS_ENDPOINT`: WebSocket endpoint for a running DevTools automation service. Recommended: `ws://localhost:9420`.
- `WEAPP_AUTOMATOR_MODE`: `connect` or `launch`.
- `WEAPP_PROJECT_PATH`: Mini Program project path.
- `WECHAT_DEVTOOLS_CLI_PATH`: DevTools CLI path.
- `WEAPP_DEVTOOLS_PORT`: preferred automation port.
- `WEAPP_AUTOLAUNCH`: set to `true` to launch DevTools automatically.
- `WEAPP_DEVTOOLS_TIMEOUT`, `WEAPP_LAUNCH_TIMEOUT`, `WEAPP_CONNECT_TIMEOUT`: timeout controls.

Privacy:

- `WEAPP_ALLOW_INLINE_SCREENSHOT=true`: allow inline image responses.
- `WEAPP_ALLOW_HIGH_RISK_WX=true`: allow high-risk `wx` calls.
- `WEAPP_ALLOW_SENSITIVE_OUTPUT=true`: disable output redaction.
- `WEAPP_MASK_INPUT_VALUES=false`: allow `element_input` to echo typed values.
- `WEAPP_MAX_OUTPUT_CHARS`, `WEAPP_MAX_STRING_CHARS`, `WEAPP_MAX_ARRAY_ITEMS`, `WEAPP_MAX_OBJECT_KEYS`: output size limits.

## Project Structure

```text
src/
  config.ts             Environment and per-call connection config
  index.ts              MCP server entry
  security.ts           Redaction, limits, and high-risk method policy
  weappClient.ts        DevTools automation session manager
  tools/                MCP tool definitions
docs/
  SECURITY_MODEL.md     Privacy and security model
  releases/             Release notes
```

## Development

```bash
npm ci
npm run build
npm audit --omit=dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Security

Please do not open public issues for suspected security problems. See [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Author

- X: [Mileson07](https://x.com/Mileson07)
- Xiaohongshu: [超级峰](https://xhslink.com/m/4LnJ9aB1f97)
- Douyin: [超级峰](https://v.douyin.com/rH645q7trd8/)
