import { type ContentResult } from "fastmcp";
import { z } from "zod";

import type { WeappAutomatorManager } from "../weappClient.js";
import {
  AnyTool,
  ToolContext,
  connectionContainerSchema,
  formatJson,
  resolveElement,
  toErrorResult,
  toTextResult,
  withUserErrorResult,
} from "./common.js";

const assertElementParameters = connectionContainerSchema.extend({
  selector: z.string().trim().min(1),
  innerSelector: z.string().trim().min(1).optional(),
  exists: z.coerce.boolean().optional(),
  text: z.string().optional(),
  textContains: z.string().optional(),
  textMatches: z.string().optional(),
  value: z.string().optional(),
  attribute: z.string().trim().min(1).optional(),
  attributeValue: z.string().optional(),
  visible: z.coerce.boolean().optional(),
});

export function createAssertTools(manager: WeappAutomatorManager): AnyTool[] {
  return [{ ...createAssertElementTool(manager), category: "debug" as const }];
}

function createAssertElementTool(manager: WeappAutomatorManager): AnyTool {
  return {
    name: "assert_element",
    description:
      "基于选择器断言元素存在、文本、值、属性或可见状态。失败时返回 isError=true，适合自动化巡检。",
    parameters: assertElementParameters,
    execute: async (rawArgs, context: ToolContext) =>
      withUserErrorResult(async () => {
        const args = assertElementParameters.parse(rawArgs ?? {});
        return manager.withPage<ContentResult>(
          context.log,
          { overrides: args.connection },
          async (page) => {
            let element: any = null;
            try {
              element = await resolveElement(page, args.selector, args.innerSelector);
            } catch (error) {
              if (args.exists === false) {
                return toTextResult(
                  formatJson({
                    passed: true,
                    selector: args.selector,
                    assertion: "exists=false",
                  })
                );
              }
              const message = error instanceof Error ? error.message : String(error);
              return toErrorResult(
                formatJson({
                  passed: false,
                  selector: args.selector,
                  reason: message,
                })
              );
            }

            const failures: string[] = [];

            if (args.exists === false) {
              failures.push("expected element to be absent");
            }

            if (args.text !== undefined || args.textContains || args.textMatches) {
              const actualText =
                typeof element?.text === "function" ? await element.text().catch(() => "") : "";
              if (args.text !== undefined && actualText !== args.text) {
                failures.push(`text expected "${args.text}", got "${actualText}"`);
              }
              if (args.textContains && !String(actualText).includes(args.textContains)) {
                failures.push(`text expected to contain "${args.textContains}", got "${actualText}"`);
              }
              if (args.textMatches) {
                const regex = new RegExp(args.textMatches);
                if (!regex.test(String(actualText))) {
                  failures.push(`text expected to match /${args.textMatches}/, got "${actualText}"`);
                }
              }
            }

            if (args.value !== undefined) {
              const actualValue =
                typeof element?.value === "function" ? await element.value().catch(() => "") : "";
              if (String(actualValue) !== args.value) {
                failures.push(`value expected "${args.value}", got "${actualValue}"`);
              }
            }

            if (args.attribute) {
              const actualAttr =
                typeof element?.attribute === "function"
                  ? await element.attribute(args.attribute).catch(() => null)
                  : null;
              if (
                args.attributeValue !== undefined &&
                String(actualAttr) !== args.attributeValue
              ) {
                failures.push(
                  `attribute ${args.attribute} expected "${args.attributeValue}", got "${actualAttr}"`
                );
              }
              if (args.attributeValue === undefined && actualAttr === null) {
                failures.push(`attribute ${args.attribute} was not present`);
              }
            }

            if (args.visible !== undefined) {
              const [size, offset] = await Promise.all([
                typeof element?.size === "function" ? element.size().catch(() => null) : null,
                typeof element?.offset === "function" ? element.offset().catch(() => null) : null,
              ]);
              const isVisible =
                !!size &&
                Number(size.width) > 0 &&
                Number(size.height) > 0 &&
                !!offset;
              if (isVisible !== args.visible) {
                failures.push(`visible expected ${args.visible}, got ${isVisible}`);
              }
            }

            const payload = {
              passed: failures.length === 0,
              selector: args.selector,
              innerSelector: args.innerSelector ?? null,
              failures,
            };

            return failures.length ? toErrorResult(formatJson(payload)) : toTextResult(formatJson(payload));
          }
        );
      }),
  };
}
