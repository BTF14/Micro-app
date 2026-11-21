import { describe, expect, it } from "vitest";
import { runBcvNodeSync } from "./bcv-node-runner";
import { safeBcvSyncErrorCode } from "./exchange-rates";

type ProcessLike = { env: Record<string, string | undefined> };
const processLike = (globalThis as typeof globalThis & { process?: ProcessLike }).process;
if (!processLike) throw new Error("BCV_NODE_PROCESS_UNAVAILABLE");

const env = processLike.env;
const forceSync = env.BCV_FORCE_SYNC === "true";

describe("dedicated BCV Node 24 production runner", () => {
  it("performs or safely skips one official BCV synchronization", async () => {
    const startedAt = new Date().toISOString();
    const scheduledFor = env.GITHUB_EVENT_NAME === "schedule" ? startedAt : null;
    console.info({
      event: "BCV_NODE_SYNC_STARTED",
      scheduledFor,
      startedAt,
      trigger: env.GITHUB_EVENT_NAME === "workflow_dispatch" ? "workflow_dispatch" : "schedule",
    });

    try {
      const result = await runBcvNodeSync(env.DATABASE_URL_BCV_SYNC, forceSync);
      console.info({
        event: "BCV_NODE_SYNC_COMPLETED",
        scheduledFor,
        startedAt,
        finishedAt: new Date().toISOString(),
        outcome: result.status === "skipped" ? `skipped_${result.outcome}` : result.outcome,
      });
      expect(["skipped", "synced"]).toContain(result.status);
    } catch (error) {
      const code = safeBcvSyncErrorCode(error);
      console.error({
        event: "BCV_NODE_SYNC_FAILED",
        scheduledFor,
        startedAt,
        finishedAt: new Date().toISOString(),
        code,
      });
      throw new Error(code);
    }
  });
});
