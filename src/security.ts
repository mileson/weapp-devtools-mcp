import fs from "fs";
import os from "os";
import path from "path";

const REDACTED = "[REDACTED]";
const TRUNCATED = "[TRUNCATED]";
const DEFAULT_MAX_OUTPUT_CHARS = 50000;
const DEFAULT_MAX_STRING_CHARS = 4000;
const DEFAULT_MAX_ARRAY_ITEMS = 80;
const DEFAULT_MAX_OBJECT_KEYS = 120;

const sensitiveKeyPattern =
  /(^|[_-])(password|passwd|pwd|token|secret|ticket|session|cookie|authorization|auth|credential|privatekey|accesskey|access_token|refresh_token|openid|unionid|phone|mobile|email|idcard|id_card|identity|jwt)([_-]|$)/i;

const highRiskWxMethods = [
  { pattern: /^(wx\.)?request$/i, reason: "network request" },
  { pattern: /^(wx\.)?uploadFile$/i, reason: "file upload" },
  { pattern: /^(wx\.)?downloadFile$/i, reason: "file download" },
  { pattern: /^(wx\.)?(connectSocket|sendSocketMessage)$/i, reason: "socket communication" },
  { pattern: /^(wx\.)?(login|getUserProfile|getUserInfo|getAccountInfoSync)$/i, reason: "identity data" },
  { pattern: /^(wx\.)?(getClipboardData|setClipboardData)$/i, reason: "clipboard access" },
  { pattern: /^(wx\.)?(getLocation|chooseLocation|openLocation|chooseAddress)$/i, reason: "location or address data" },
  { pattern: /^(wx\.)?requestPayment$/i, reason: "payment action" },
  { pattern: /^(wx\.)?(getStorage|setStorage|removeStorage|clearStorage|getStorageSync|setStorageSync|removeStorageSync|clearStorageSync)$/i, reason: "local storage access" },
  { pattern: /^(wx\.)?(saveFile|getFileSystemManager|chooseMedia|chooseImage|chooseVideo|chooseMessageFile)$/i, reason: "local file access" },
  { pattern: /^(wx\.)?(authorize|openSetting|requestSubscribeMessage)$/i, reason: "permission prompt" },
];

function envFlag(name: string, defaultValue: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return defaultValue;
  }
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

function positiveIntEnv(name: string, defaultValue: number): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : defaultValue;
}

export function allowSensitiveOutput(): boolean {
  return envFlag("WEAPP_ALLOW_SENSITIVE_OUTPUT", false);
}

export function maskInputValues(): boolean {
  return envFlag("WEAPP_MASK_INPUT_VALUES", true);
}

export function allowInlineScreenshots(): boolean {
  return envFlag("WEAPP_ALLOW_INLINE_SCREENSHOT", false);
}

export function allowHighRiskWxMethods(): boolean {
  return envFlag("WEAPP_ALLOW_HIGH_RISK_WX", false);
}

export function maxOutputChars(): number {
  return positiveIntEnv("WEAPP_MAX_OUTPUT_CHARS", DEFAULT_MAX_OUTPUT_CHARS);
}

function maxStringChars(): number {
  return positiveIntEnv("WEAPP_MAX_STRING_CHARS", DEFAULT_MAX_STRING_CHARS);
}

function maxArrayItems(): number {
  return positiveIntEnv("WEAPP_MAX_ARRAY_ITEMS", DEFAULT_MAX_ARRAY_ITEMS);
}

function maxObjectKeys(): number {
  return positiveIntEnv("WEAPP_MAX_OBJECT_KEYS", DEFAULT_MAX_OBJECT_KEYS);
}

export function isSensitiveKey(key: string): boolean {
  return sensitiveKeyPattern.test(key);
}

export function redactText(input: string): string {
  let text = input;

  const home = os.homedir();
  if (home && text.includes(home)) {
    text = text.split(home).join("~");
  }

  if (allowSensitiveOutput()) {
    return truncateString(text, maxStringChars());
  }

  text = text.replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, `Bearer ${REDACTED}`);
  text = text.replace(
    /([?&](?:access[_-]?token|refresh[_-]?token|token|secret|ticket|key|password|session|openid|unionid)=)[^&#\s]+/gi,
    `$1${REDACTED}`,
  );
  text = text.replace(
    /(--(?:ticket|auto-account|token|password|secret|session)\s+)([^\s]+)/gi,
    `$1${REDACTED}`,
  );
  text = text.replace(
    /(["']?(?:password|passwd|pwd|token|secret|ticket|session|cookie|authorization|access[_-]?token|refresh[_-]?token|openid|unionid|phone|mobile|email|idcard|id_card|jwt)["']?\s*[:=]\s*)(["'][^"']*["']|[^\s,}&]+)/gi,
    `$1${REDACTED}`,
  );
  text = text.replace(
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
    "[REDACTED_EMAIL]",
  );
  text = text.replace(/\b1[3-9]\d{9}\b/g, "[REDACTED_PHONE]");

  return truncateString(text, maxStringChars());
}

export function redactCliArgs(args: string[]): string[] {
  const sensitiveFlags = new Set([
    "--ticket",
    "--auto-account",
    "--token",
    "--password",
    "--secret",
    "--session",
  ]);

  return args.map((arg, index) => {
    if (index > 0 && sensitiveFlags.has(args[index - 1])) {
      return REDACTED;
    }

    const [flag] = arg.split("=", 1);
    if (sensitiveFlags.has(flag) && arg.includes("=")) {
      return `${flag}=${REDACTED}`;
    }

    return redactText(arg);
  });
}

export function sanitizeForOutput(value: unknown): unknown {
  return sanitizeValue(value, undefined, new WeakSet<object>(), 0);
}

function sanitizeValue(
  value: unknown,
  key: string | undefined,
  seen: WeakSet<object>,
  depth: number,
): unknown {
  if (key && isSensitiveKey(key) && !allowSensitiveOutput()) {
    return REDACTED;
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return redactText(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) {
    return `[BUFFER:${value.length}]`;
  }

  if (typeof value !== "object") {
    return redactText(String(value));
  }

  if (seen.has(value)) {
    return "[CIRCULAR]";
  }

  if (depth >= 8) {
    return "[MAX_DEPTH]";
  }

  seen.add(value);

  if (Array.isArray(value)) {
    const limit = maxArrayItems();
    const items = value
      .slice(0, limit)
      .map((item) => sanitizeValue(item, undefined, seen, depth + 1));
    if (value.length > limit) {
      items.push(`${TRUNCATED}: ${value.length - limit} items`);
    }
    return items;
  }

  const entries = Object.entries(value as Record<string, unknown>);
  const limit = maxObjectKeys();
  const result: Record<string, unknown> = {};

  for (const [entryKey, entryValue] of entries.slice(0, limit)) {
    result[entryKey] = sanitizeValue(entryValue, entryKey, seen, depth + 1);
  }

  if (entries.length > limit) {
    result.__truncatedKeys = entries.length - limit;
  }

  return result;
}

export function safeJson(value: unknown): string {
  const serialized = JSON.stringify(sanitizeForOutput(value), null, 2);
  return truncateString(serialized ?? String(value), maxOutputChars());
}

export function truncateString(value: string, limit: number): string {
  if (value.length <= limit) {
    return value;
  }
  return `${value.slice(0, limit)}\n${TRUNCATED}: ${value.length - limit} chars`;
}

export function maskedInputValue(value: unknown): string {
  if (maskInputValues()) {
    return REDACTED;
  }
  return redactText(String(value));
}

export function getBlockedWxMethodReason(method: string): string | null {
  if (allowHighRiskWxMethods()) {
    return null;
  }

  const normalized = method.trim();
  const blocked = highRiskWxMethods.find(({ pattern }) => pattern.test(normalized));
  return blocked?.reason ?? null;
}

export async function createScreenshotPath(): Promise<string> {
  const dir = path.join(os.tmpdir(), "weapp-devtools-mcp-screenshots");
  await fs.promises.mkdir(dir, { recursive: true, mode: 0o700 });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(dir, `screenshot-${stamp}.png`);
}

export async function writePrivateFile(filePath: string, content: string): Promise<void> {
  await fs.promises.writeFile(filePath, content, { encoding: "utf-8", mode: 0o600 });
  await fs.promises.chmod(filePath, 0o600).catch(() => undefined);
}
