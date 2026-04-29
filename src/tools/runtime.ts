import { spawn } from "child_process";
import { type ContentResult } from "fastmcp";
import { z } from "zod";

import {
  allowCliTool,
  allowEvaluateTool,
  allowMockWxTool,
  redactCliArgs,
  redactText,
  riskGate,
} from "../security.js";
import type { WeappAutomatorManager } from "../weappClient.js";
import {
  AnyTool,
  ToolContext,
  connectionContainerSchema,
  createFunctionFromSource,
  formatJson,
  stringListSchema,
  toErrorResult,
  toSerializableValue,
  toTextResult,
  withUserErrorResult,
} from "./common.js";

const evaluateParameters = connectionContainerSchema.extend({
  source: z.string().trim().min(1),
  args: z.array(z.unknown()).optional(),
  riskConsent: z.coerce.boolean().optional().default(false),
});

const mockWxParameters = connectionContainerSchema
  .extend({
    method: z.string().trim().min(1),
    result: z.unknown().optional(),
    functionSource: z.string().trim().min(1).optional(),
    args: z.array(z.unknown()).optional(),
    riskConsent: z.coerce.boolean().optional().default(false),
  })
  .refine((value) => value.result !== undefined || value.functionSource, {
    message: "result or functionSource is required",
  });

const restoreWxParameters = connectionContainerSchema.extend({
  method: z.string().trim().min(1),
  riskConsent: z.coerce.boolean().optional().default(false),
});

const runCliParameters = z.object({
  cliPath: z.string().trim().min(1).optional(),
  args: stringListSchema,
  cwd: z.string().trim().min(1).optional(),
  timeoutMs: z.coerce.number().int().positive().max(300000).optional().default(60000),
  riskConsent: z.coerce.boolean().optional().default(false),
});

const toolConfigParameters = z.object({});

export function createRuntimeTools(manager: WeappAutomatorManager): AnyTool[] {
  return [
    { ...createEvaluateTool(manager), category: "experimental" as const },
    { ...createMockWxTool(manager), category: "experimental" as const },
    { ...createRestoreWxTool(manager), category: "experimental" as const },
    { ...createRunCliTool(), category: "cli" as const },
    { ...createToolConfigTool(), category: "debug" as const },
  ];
}

function createEvaluateTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_evaluate",
    description:
      "在小程序逻辑层执行函数源码并返回结果。此工具能力很强，适合读取 getApp/globalData、运行诊断脚本或触发复杂调试逻辑。",
    parameters: evaluateParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = evaluateParameters.parse(rawArgs ?? {});
        const denied = riskGate("mp_evaluate", args.riskConsent, allowEvaluateTool());
        if (denied) {
          return toErrorResult(denied);
        }
        const fn = createFunctionFromSource(args.source, "source");
        return manager.withMiniProgram<ContentResult>(
          context.log,
          { overrides: args.connection },
          async (miniProgram) => {
            const result = await miniProgram.evaluate(fn, ...(args.args ?? []));
            return toTextResult(
              formatJson({
                result: toSerializableValue(result),
              })
            );
          }
        );
      }),
  };
}

function createMockWxTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_mockWx",
    description:
      "Mock 指定 wx 方法的返回值或实现函数。适合本地测试登录、支付、位置、文件等分支；使用 mp_restoreWx 可恢复。",
    parameters: mockWxParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = mockWxParameters.parse(rawArgs ?? {});
        const denied = riskGate("mp_mockWx", args.riskConsent, allowMockWxTool());
        if (denied) {
          return toErrorResult(denied);
        }
        return manager.withMiniProgram<ContentResult>(
          context.log,
          { overrides: args.connection },
          async (miniProgram) => {
            if (args.functionSource) {
              const fn = createFunctionFromSource(args.functionSource, "functionSource");
              await (miniProgram as any).mockWxMethod(args.method, fn, ...(args.args ?? []));
            } else {
              await (miniProgram as any).mockWxMethod(args.method, args.result);
            }

            return toTextResult(
              formatJson({
                mocked: args.method,
                mode: args.functionSource ? "function" : "result",
              })
            );
          }
        );
      }),
  };
}

function createRestoreWxTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_restoreWx",
    description: "恢复被 mp_mockWx 或网络监听替换过的 wx 方法。",
    parameters: restoreWxParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = restoreWxParameters.parse(rawArgs ?? {});
        const denied = riskGate("mp_restoreWx", args.riskConsent, allowMockWxTool());
        if (denied) {
          return toErrorResult(denied);
        }
        return manager.withMiniProgram<ContentResult>(
          context.log,
          { overrides: args.connection },
          async (miniProgram) => {
            await (miniProgram as any).restoreWxMethod(args.method);
            return toTextResult(formatJson({ restored: args.method }));
          }
        );
      }),
  };
}

function createRunCliTool(): AnyTool {
  return {
    name: "mp_runCli",
    description:
      "运行微信开发者工具 CLI 命令。用于预览、上传、构建 npm、清缓存、登录等官方 CLI 能力；不会通过 shell 执行。",
    parameters: runCliParameters,
    execute: async (rawArgs) =>
      withUserErrorResult(async () => {
        const args = runCliParameters.parse(rawArgs ?? {});
        const denied = riskGate("mp_runCli", args.riskConsent, allowCliTool());
        if (denied) {
          return toErrorResult(denied);
        }

        const command = args.cliPath ?? process.env.WECHAT_DEVTOOLS_CLI_PATH;
        if (!command) {
          return toErrorResult("cliPath is required, or set WECHAT_DEVTOOLS_CLI_PATH.");
        }
        const cliArgs = args.args ?? [];
        const result = await runCli(command, cliArgs, {
          cwd: args.cwd,
          timeoutMs: args.timeoutMs,
        });

        return toTextResult(
          formatJson({
            command: redactText(command),
            args: redactCliArgs(cliArgs),
            ...result,
          })
        );
      }),
  };
}

function createToolConfigTool(): AnyTool {
  return {
    name: "mp_toolConfig",
    description: "查看当前工具 profile 与高风险能力开关，方便确认 MCP 暴露范围。",
    parameters: toolConfigParameters,
    execute: async () =>
      withUserErrorResult(async () =>
        toTextResult(
          formatJson({
            toolsProfile: process.env.WEAPP_TOOLS_PROFILE ?? "full",
            enabledCategories: process.env.WEAPP_ENABLE_TOOL_CATEGORIES ?? null,
            disabledCategories: process.env.WEAPP_DISABLE_TOOL_CATEGORIES ?? null,
            enabledTools: process.env.WEAPP_ENABLE_TOOLS ?? null,
            disabledTools: process.env.WEAPP_DISABLE_TOOLS ?? null,
            allowRiskyTools: process.env.WEAPP_ALLOW_RISKY_TOOLS ?? "false",
            allowHighRiskWx: process.env.WEAPP_ALLOW_HIGH_RISK_WX ?? "false",
            allowEvaluate: process.env.WEAPP_ALLOW_EVALUATE ?? "false",
            allowMockWx: process.env.WEAPP_ALLOW_MOCK_WX ?? "false",
            allowCliCommands: process.env.WEAPP_ALLOW_CLI_COMMANDS ?? "false",
            autoNetworkMonitoring: process.env.WEAPP_ENABLE_NETWORK_MONITORING ?? "true",
          })
        )
      ),
  };
}

function runCli(
  command: string,
  args: string[],
  options: { cwd?: string; timeoutMs: number }
): Promise<{
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timer);
      resolve({
        exitCode,
        signal,
        stdout: redactText(stdout),
        stderr: redactText(stderr),
        timedOut,
      });
    });
  });
}
