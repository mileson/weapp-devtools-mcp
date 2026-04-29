import type { AnyTool, ToolCategory } from "./tools/common.js";

export type ToolsProfile = "minimal" | "core" | "full";

export interface ToolProfileResult {
  profile: ToolsProfile;
  activeTools: AnyTool[];
  disabledTools: AnyTool[];
  summary: string;
}

const DEFAULT_PROFILE: ToolsProfile = "full";

const MINIMAL_TOOLS = new Set([
  "mp_ensureConnection",
  "mp_currentPage",
  "mp_screenshot",
  "mp_navigate",
  "page_getElement",
  "page_getElements",
  "page_waitElement",
  "element_tap",
  "element_input",
]);

const CORE_CATEGORIES = new Set<ToolCategory>(["core", "page", "element"]);
const FULL_CATEGORIES = new Set<ToolCategory>([
  "core",
  "page",
  "element",
  "network",
  "debug",
  "cli",
  "experimental",
]);

function parseProfile(raw: string | undefined): ToolsProfile {
  const normalized = raw?.trim().toLowerCase();
  if (normalized === "minimal" || normalized === "core" || normalized === "full") {
    return normalized;
  }
  return DEFAULT_PROFILE;
}

function splitList(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }
  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function getBaseActiveNames(profile: ToolsProfile, tools: AnyTool[]): Set<string> {
  if (profile === "full") {
    return new Set(tools.map((tool) => tool.name));
  }

  if (profile === "minimal") {
    return new Set(tools.filter((tool) => MINIMAL_TOOLS.has(tool.name)).map((tool) => tool.name));
  }

  return new Set(
    tools
      .filter((tool) => CORE_CATEGORIES.has(tool.category ?? "core"))
      .map((tool) => tool.name)
  );
}

export function resolveToolsByProfile(tools: AnyTool[]): ToolProfileResult {
  const profile = parseProfile(process.env.WEAPP_TOOLS_PROFILE);
  const activeNames = getBaseActiveNames(profile, tools);
  const enabledCategories = splitList(process.env.WEAPP_ENABLE_TOOL_CATEGORIES);
  const disabledCategories = splitList(process.env.WEAPP_DISABLE_TOOL_CATEGORIES);
  const enabledTools = splitList(process.env.WEAPP_ENABLE_TOOLS);
  const disabledTools = splitList(process.env.WEAPP_DISABLE_TOOLS);

  for (const tool of tools) {
    const category = tool.category ?? "core";
    if (enabledCategories.has(category) || enabledTools.has(tool.name)) {
      activeNames.add(tool.name);
    }
  }

  for (const tool of tools) {
    const category = tool.category ?? "core";
    if (disabledCategories.has(category) || disabledTools.has(tool.name)) {
      activeNames.delete(tool.name);
    }
  }

  if (profile === "full") {
    for (const tool of tools) {
      if (FULL_CATEGORIES.has(tool.category ?? "core")) {
        activeNames.add(tool.name);
      }
    }
    for (const tool of tools) {
      const category = tool.category ?? "core";
      if (disabledCategories.has(category) || disabledTools.has(tool.name)) {
        activeNames.delete(tool.name);
      }
    }
  }

  const activeTools = tools.filter((tool) => activeNames.has(tool.name));
  const inactiveTools = tools.filter((tool) => !activeNames.has(tool.name));

  return {
    profile,
    activeTools,
    disabledTools: inactiveTools,
    summary: `profile=${profile}, active=${activeTools.length}, disabled=${inactiveTools.length}`,
  };
}
