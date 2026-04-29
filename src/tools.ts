import { createApplicationTools } from "./tools/application.js";
import { createAssertTools } from "./tools/assert.js";
import { AnyTool } from "./tools/common.js";
import { createElementTools } from "./tools/element.js";
import { createNetworkTools } from "./tools/network.js";
import { createPageTools } from "./tools/page.js";
import { createRuntimeTools } from "./tools/runtime.js";
import { WeappAutomatorManager } from "./weappClient.js";

export function createTools(manager: WeappAutomatorManager): AnyTool[] {
  return [
    ...createApplicationTools(manager).map(tool => ({ ...tool, category: "core" as const })),
    ...createPageTools(manager).map(tool => ({ ...tool, category: "page" as const })),
    ...createElementTools(manager).map(tool => ({ ...tool, category: "element" as const })),
    ...createNetworkTools(manager),
    ...createAssertTools(manager),
    ...createRuntimeTools(manager),
  ];
}
