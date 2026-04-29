import { type ContentResult } from "fastmcp";
import { z } from "zod";

import type { NetworkLogEntry, WeappAutomatorManager } from "../weappClient.js";
import {
  AnyTool,
  ToolContext,
  connectionContainerSchema,
  formatJson,
  toErrorResult,
  toTextResult,
  withUserErrorResult,
} from "./common.js";

const requestTypeSchema = z.enum(["request", "uploadFile", "downloadFile"]);

const startNetworkParameters = connectionContainerSchema.extend({
  clear: z.coerce.boolean().optional().default(false),
});

const stopNetworkParameters = connectionContainerSchema.extend({
  restoreWx: z.coerce.boolean().optional().default(true),
  clear: z.coerce.boolean().optional().default(false),
});

const listNetworkParameters = connectionContainerSchema.extend({
  sync: z.coerce.boolean().optional().default(true),
  pageSize: z.coerce.number().int().positive().max(500).optional().default(50),
  pageIndex: z.coerce.number().int().nonnegative().optional().default(0),
  types: z.array(requestTypeSchema).optional(),
  urlPattern: z.string().trim().min(1).optional(),
  successOnly: z.coerce.boolean().optional().default(false),
  failedOnly: z.coerce.boolean().optional().default(false),
  since: z.string().trim().min(1).optional(),
  includeDetails: z.coerce.boolean().optional().default(false),
});

const getNetworkRequestParameters = connectionContainerSchema.extend({
  id: z.string().trim().min(1),
  sync: z.coerce.boolean().optional().default(true),
});

const clearNetworkParameters = connectionContainerSchema.extend({
  clearRemote: z.coerce.boolean().optional().default(true),
});

export function createNetworkTools(manager: WeappAutomatorManager): AnyTool[] {
  return [
    createStartNetworkTool(manager),
    createStopNetworkTool(manager),
    createListNetworkTool(manager),
    createGetNetworkRequestTool(manager),
    createClearNetworkTool(manager),
  ].map((tool) => ({ ...tool, category: "network" as const }));
}

function createStartNetworkTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_startNetwork",
    description:
      "开启网络请求采集，记录 wx.request、wx.uploadFile、wx.downloadFile 的请求结果。默认连接成功后会自动开启，也可以手动开启或清空后重启。",
    parameters: startNetworkParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = startNetworkParameters.parse(rawArgs ?? {});
        await manager.withMiniProgram<ContentResult>(
          context.log,
          { overrides: args.connection },
          async () => {
            await manager.startNetworkMonitoring(context.log, { clear: args.clear });
            return toTextResult(
              formatJson({
                monitoring: manager.isNetworkMonitoring(),
                cleared: args.clear,
              })
            );
          }
        );
        return toTextResult(formatJson({ monitoring: manager.isNetworkMonitoring() }));
      }),
  };
}

function createStopNetworkTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_stopNetwork",
    description:
      "停止网络请求采集。restoreWx 为 true 时会恢复被 mock 的 wx 网络方法；clear 为 true 时同时清空已收集记录。",
    parameters: stopNetworkParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = stopNetworkParameters.parse(rawArgs ?? {});
        await manager.withMiniProgram<ContentResult>(
          context.log,
          { overrides: args.connection },
          async () => {
            await manager.stopNetworkMonitoring(context.log, {
              restoreWx: args.restoreWx,
              clear: args.clear,
            });
            return toTextResult(formatJson({ monitoring: manager.isNetworkMonitoring() }));
          }
        );
        return toTextResult(formatJson({ monitoring: manager.isNetworkMonitoring() }));
      }),
  };
}

function createListNetworkTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_getNetworkRequests",
    description:
      "分页查询已采集的网络请求，支持类型、URL、成功/失败、时间过滤。默认只返回摘要；includeDetails=true 时返回请求和响应详情。",
    parameters: listNetworkParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = listNetworkParameters.parse(rawArgs ?? {});
        let synced = 0;
        if (args.sync) {
          await manager.withMiniProgram<ContentResult>(
            context.log,
            { overrides: args.connection },
            async () => {
              synced = await manager.syncNetworkLogs(context.log);
              return toTextResult(formatJson({ synced }));
            }
          );
        }

        const filtered = filterNetworkLogs(manager.getNetworkLogs(), args);
        const start = args.pageIndex * args.pageSize;
        const page = filtered.slice(start, start + args.pageSize);

        return toTextResult(
          formatJson({
            monitoring: manager.isNetworkMonitoring(),
            synced,
            total: filtered.length,
            pageIndex: args.pageIndex,
            pageSize: args.pageSize,
            requests: page.map((request) =>
              args.includeDetails ? request : summarizeNetworkLog(request)
            ),
          })
        );
      }),
  };
}

function createGetNetworkRequestTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_getNetworkRequest",
    description: "通过 id 获取单条网络请求详情。id 来自 mp_getNetworkRequests。",
    parameters: getNetworkRequestParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = getNetworkRequestParameters.parse(rawArgs ?? {});
        if (args.sync) {
          await manager.withMiniProgram<ContentResult>(
            context.log,
            { overrides: args.connection },
            async () => {
              await manager.syncNetworkLogs(context.log);
              return toTextResult(formatJson({ synced: true }));
            }
          );
        }
        const request = manager.getNetworkLogs().find((item) => item.id === args.id);
        if (!request) {
          return toErrorResult(`未找到网络请求: ${args.id}`);
        }
        return toTextResult(formatJson(request));
      }),
  };
}

function createClearNetworkTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "mp_clearNetworkRequests",
    description: "清空已采集的网络请求记录。clearRemote 为 true 时会先连接小程序并清空运行时缓存。",
    parameters: clearNetworkParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = clearNetworkParameters.parse(rawArgs ?? {});
        const localCount = manager.getNetworkLogs().length;
        manager.clearNetworkLogs();
        let remoteSynced = 0;
        if (args.clearRemote) {
          await manager.withMiniProgram<ContentResult>(
            context.log,
            { overrides: args.connection },
            async () => {
              remoteSynced = await manager.syncNetworkLogs(context.log);
              manager.clearNetworkLogs();
              return toTextResult(formatJson({ remoteSynced }));
            }
          );
        }
        return toTextResult(formatJson({ localCleared: localCount, remoteSynced }));
      }),
  };
}

function summarizeNetworkLog(request: NetworkLogEntry): Record<string, unknown> {
  return {
    id: request.id,
    type: request.type,
    method: request.method ?? null,
    url: request.url,
    statusCode: request.statusCode ?? null,
    success: request.success,
    duration: request.duration ?? null,
    timestamp: request.timestamp,
    source: request.source ?? null,
  };
}

function filterNetworkLogs(
  logs: NetworkLogEntry[],
  args: z.infer<typeof listNetworkParameters>
): NetworkLogEntry[] {
  let filtered = [...logs];

  if (args.types?.length) {
    const typeSet = new Set(args.types);
    filtered = filtered.filter((item) => typeSet.has(item.type));
  }

  if (args.urlPattern) {
    try {
      const regex = new RegExp(args.urlPattern);
      filtered = filtered.filter((item) => regex.test(item.url));
    } catch {
      filtered = filtered.filter((item) => item.url.includes(args.urlPattern!));
    }
  }

  if (args.successOnly && args.failedOnly) {
    return [];
  }
  if (args.successOnly) {
    filtered = filtered.filter((item) => item.success);
  }
  if (args.failedOnly) {
    filtered = filtered.filter((item) => !item.success);
  }

  if (args.since) {
    const sinceTime = new Date(args.since).getTime();
    if (!Number.isNaN(sinceTime)) {
      filtered = filtered.filter(
        (item) => new Date(item.timestamp).getTime() >= sinceTime
      );
    }
  }

  return filtered.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}
