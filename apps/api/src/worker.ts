import app from "./index";
import type { Bindings } from "./bindings";
import { syncBcvRate } from "./bcv";

const worker = {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: Bindings, context: ExecutionContext): void {
    context.waitUntil(syncBcvRate(env));
  },
};

export default worker;
