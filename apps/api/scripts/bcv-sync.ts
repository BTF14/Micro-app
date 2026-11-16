import { runBcvNodeSync } from "../src/bcv-node-runner";
import { safeBcvSyncErrorCode } from "../src/exchange-rates";

type ProcessLike = { env: Record<string, string | undefined>; exitCode?: number };
const processLike = (globalThis as typeof globalThis & { process?: ProcessLike }).process;
if (!processLike) throw new Error("BCV_NODE_PROCESS_UNAVAILABLE");

const env = processLike.env;
const scheduledFor = env.GITHUB_EVENT_NAME === "schedule"
  ? `${new Date().toISOString().slice(0, 10)}T11:17:00.000Z`
  : null;
const startedAt = new Date().toISOString();
const forceSync = env.BCV_FORCE_SYNC === "true";

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
} catch (error) {
  console.error({
    event: "BCV_NODE_SYNC_FAILED",
    scheduledFor,
    startedAt,
    finishedAt: new Date().toISOString(),
    code: safeBcvSyncErrorCode(error),
  });
  processLike.exitCode = 1;
}
