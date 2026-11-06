import app from "./index";
import type { Bindings } from "./bindings";
import { syncBcvRate } from "./bcv";

export function createWorker(syncRate: typeof syncBcvRate = syncBcvRate) {
  return {
    fetch: app.fetch,
    scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext): void {
      context.waitUntil(syncRate(env));
    },
  };
}

export default createWorker();
