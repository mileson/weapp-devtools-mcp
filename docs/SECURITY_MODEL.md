# Security Model

WeApp DevTools MCP is designed for local development. It connects an MCP
client to a local WeChat Mini Program DevTools automation endpoint.

## Trust Boundary

```text
MCP client -> local Node.js MCP server -> local DevTools WebSocket/CLI -> Mini Program runtime
```

The server does not need a hosted relay service. The recommended endpoint is
`ws://localhost:9420`.

## Default Protections

- Tool JSON/text results are redacted by default.
- Local home paths are shortened to `~`.
- Keys such as `token`, `secret`, `ticket`, `session`, `cookie`, `openid`,
  `phone`, and `email` are masked.
- `element_input` does not echo the typed value.
- `mp_screenshot` saves to a local temp file by default.
- `mp_callWx` blocks high-risk `wx` methods by default, including network,
  login, payment, location, clipboard, storage, and file APIs.
- WeChat DevTools launch logs redact `--ticket` and `--auto-account`.
- Local MCP config is written with `0600` permissions.

## Escape Hatches

Use these only in trusted local sessions:

- `WEAPP_ALLOW_INLINE_SCREENSHOT=true` allows `mp_screenshot` with `inline: true`.
- `WEAPP_ALLOW_HIGH_RISK_WX=true` allows high-risk `mp_callWx` methods.
- `WEAPP_ALLOW_SENSITIVE_OUTPUT=true` disables value redaction.
- `WEAPP_MASK_INPUT_VALUES=false` allows `element_input` to echo input values.

## Output Limits

- `WEAPP_MAX_OUTPUT_CHARS` defaults to `50000`.
- `WEAPP_MAX_STRING_CHARS` defaults to `4000`.
- `WEAPP_MAX_ARRAY_ITEMS` defaults to `80`.
- `WEAPP_MAX_OBJECT_KEYS` defaults to `120`.

## Practical Guidance

- Use non-production Mini Program accounts and test projects whenever possible.
- Avoid printing tokens, open IDs, phone numbers, or business data in Mini
  Program console logs.
- Do not auto-approve data-heavy tools such as `mp_getLogs`, `page_getData`,
  `element_getData`, `element_getWxml`, and `mp_screenshot` in sensitive
  projects.
