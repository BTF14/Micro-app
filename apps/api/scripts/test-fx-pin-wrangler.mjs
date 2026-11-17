import { spawn } from "node:child_process";

const port = 8791;
const origin = `http://127.0.0.1:${port}`;
const child = spawn("pnpm", ["exec", "wrangler", "dev", "--ip", "127.0.0.1", "--port", String(port), "--config", "wrangler.fx-pin-test.toml"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
});
const childOutput = [];
child.stdout?.on("data", (chunk) => childOutput.push(String(chunk)));
child.stderr?.on("data", (chunk) => childOutput.push(String(chunk)));
const timeout = Date.now() + 45_000;
let ready = false;
try {
  while (Date.now() < timeout) {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Wrangler exited before becoming ready (${child.exitCode ?? child.signalCode}).\\n${childOutput.join("")}`);
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(500) });
      if (response.status === 404) { ready = true; break; }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error("Wrangler local runtime did not become ready.");
  const response = await fetch(origin, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      pin: "12345678",
      organizationId: "11111111-1111-4111-8111-111111111111",
      userId: "22222222-2222-4222-8222-222222222222",
      pepper: "local-runtime-only-fx-pin-pepper-32-bytes-minimum",
    }),
  });
  const result = await response.json();
  if (!response.ok || result.verified !== true || result.kdfVersion !== "pbkdf2-sha256-v1" || result.iterations !== 100000) {
    throw new Error("Wrangler KDF runtime assertion failed.");
  }
  process.stdout.write("FX_PIN_WRANGLER_RUNTIME_SUCCESS\n");
} finally {
  child.kill("SIGTERM");
}
