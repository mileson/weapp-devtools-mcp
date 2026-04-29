# Contributing

Thanks for helping improve WeApp DevTools MCP.

## Development

```bash
npm ci
npm run build
npm audit --omit=dev
```

## Pull Request Checklist

- Keep privacy defaults conservative.
- Do not add real project paths, tokens, tickets, screenshots, or logs.
- Add or update docs when tool behavior changes.
- Run `npm run build` and `npm audit --omit=dev`.

## Security-Sensitive Changes

Changes touching redaction, logging, screenshots, `wx` method allow/block
policy, or local file writes should be reviewed with extra care.

Do not discuss exploitable vulnerabilities in public issues.
