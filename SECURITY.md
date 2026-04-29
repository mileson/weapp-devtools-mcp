# Security Policy

## Supported Versions

Security fixes target the latest release on the default branch.

## Reporting A Vulnerability

Please do not open public issues for suspected security problems.

Use GitHub private vulnerability reporting when available, or contact the
maintainer through a private channel listed on the maintainer profile.

Please include:

- A concise description of the issue.
- A minimal reproduction, if safe to share.
- The affected version or commit.
- Whether sensitive data may have been exposed.

## Data Handling Model

This server runs locally and talks to local WeChat DevTools automation.
Tool results may still enter an MCP client transcript, so the server redacts
sensitive values and blocks high-risk methods by default.

See [docs/SECURITY_MODEL.md](docs/SECURITY_MODEL.md) for details.
