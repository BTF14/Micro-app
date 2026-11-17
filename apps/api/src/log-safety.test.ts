import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const sourceRoot = dirname(fileURLToPath(import.meta.url));
const approvedCalls = new Set([
  'console.error("Unhandled API error")',
  'console.error({ event: "BCV_SYNC_FAILED", code: "BCV_SYNC_DATABASE_URL_MISSING" })',
  'console.info({ event: "BCV_SYNC_STARTED" })',
  'console.info({ event: "BCV_SYNC_COMPLETED", outcome })',
  'console.error({ event: "BCV_SYNC_FAILED", code: safeBcvSyncErrorCode(error) })',
  'console.error({ event: "BCV_SYNC_STALE_RUNNING", attemptAgeSeconds: state.attempt_age_seconds, thresholdSeconds: BCV_STALE_RUNNING_THRESHOLD_SECONDS, lastAttemptAt: state.last_attempt_at})',
  'console.error({ event: "BCV_SYNC_WATCHDOG_LOOKUP_FAILED" })',
  'console.error({ event: "AUTH_RETENTION_CLEANUP_FAILED" })',
  'console.error({ event: "REGISTER_SHIFT_DATABASE_FAILURE", code: code ?? "UNKNOWN" })',
  'console.error({ event: "ORGANIZATION_STRUCTURE_FAILED", code: code || "UNKNOWN" })',
  'console.error({ event: "FX_CONTINGENCY_FAILURE", code: code ?? "UNKNOWN" })',
  'console.error({ event: "FX_BCV_RESTORATION_TRANSITION_FAILED" })',
]);

function productionSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) return productionSourceFiles(path);
    if (!/\.(?:ts|tsx|js|mjs)$/.test(name)) return [];
    if (/\.(?:test|spec)\.(?:ts|tsx|js|mjs)$/.test(name) || name.endsWith(".d.ts")) return [];
    return [path];
  });
}

function normalizeCall(call: string): string {
  return call.replace(/\s+/g, " ").replace(/,\s*([}])/g, "$1").replace(/;$/, "").trim();
}

describe("operational log safety", () => {
  it("allows only reviewed, sanitized console calls in production API source", () => {
    const files = productionSourceFiles(sourceRoot);
    const calls: Array<{ file: string; call: string }> = [];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      const pattern = /console\.(?:log|info|warn|error|debug|trace)\s*\(([\s\S]*?)\);/g;
      for (const match of source.matchAll(pattern)) {
        const call = normalizeCall(match[0]);
        calls.push({ file, call });
        expect(approvedCalls.has(call), `Unreviewed or potentially sensitive operational log in ${file}: ${call}`).toBe(true);
      }
      expect(source).not.toMatch(/(?:globalThis\s*\.\s*console|console\s*\[\s*["'](?:log|info|warn|error|debug|trace)["']\s*\])/);
      expect(source).not.toMatch(/\bconsole\s*\?\.\s*(?:log|info|warn|error|debug|trace)\s*\(/);
      expect(source).not.toMatch(/\b(?:const|let|var)\s+\{[^}]*\}\s*=\s*console\b/);
      expect(source).not.toMatch(/\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*console\b/);
    }
    expect(calls.length).toBe(12);
  });
});
