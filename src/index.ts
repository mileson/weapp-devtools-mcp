#!/usr/bin/env node

import { FastMCP } from "fastmcp";

import { createPrompts } from "./prompts.js";
import { createTools } from "./tools.js";
import { WeappAutomatorManager } from "./weappClient.js";
import { globalTimeoutMs } from "./config.js";
import { resolveToolsByProfile } from "./toolProfile.js";

const manager = new WeappAutomatorManager();

const server = new FastMCP({
  name: "weapp-devtools-mcp",
  version: "0.2.0",
  instructions:
    "Controls WeChat Mini Program projects through WeChat DevTools using miniprogram-automator. Call mp_ensureConnection before mp_screenshot, page_*, element_*, network, evaluate, mock, or CLI tools. If connection fails, prefer one guided retry with reconnect=true. Some powerful local-only capabilities require riskConsent=true or WEAPP_ALLOW_* environment variables.",
});

const toolProfile = resolveToolsByProfile(createTools(manager));
console.error(`[ToolProfile] ${toolProfile.summary}`);

const tools = toolProfile.activeTools.map(tool => ({
  ...tool,
  timeoutMs: tool.timeoutMs ?? globalTimeoutMs
}));
server.addTools(tools);
server.addPrompts(createPrompts());

server.on("disconnect", async () => {
  await manager.close();
  process.exit(0);
});

await server.start({
  transportType: "stdio",
});
