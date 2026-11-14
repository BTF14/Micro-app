import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const buildEnv = (globalThis as typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
}).process?.env ?? {};
const pagesBranch = buildEnv.CF_PAGES_BRANCH;
const isCloudflarePagesBuild = buildEnv.CF_PAGES === "1" || pagesBranch !== undefined;
const isPagesPreview = isCloudflarePagesBuild && pagesBranch !== "main";

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, ".", "VITE_");
  const apiBaseUrl = isPagesPreview
    ? ""
    : (buildEnv.VITE_API_BASE_URL ?? fileEnv.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");
  const e2eProxyTarget = buildEnv.E2E_API_PROXY_TARGET;
  let e2eProxy: Record<string, { target: string; changeOrigin: boolean }> | undefined;
  if (e2eProxyTarget) {
    const target = new URL(e2eProxyTarget);
    if (target.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(target.hostname)) {
      throw new Error("E2E_API_PROXY_TARGET must be a loopback HTTP API harness.");
    }
    e2eProxy = {
      "/api": { target: target.origin, changeOrigin: false },
      "/auth": { target: target.origin, changeOrigin: false },
    };
  }

  return {
    plugins: [react()],
    preview: e2eProxy ? { proxy: e2eProxy } : undefined,
    define: {
      __MICRO_APP_API_BASE_URL__: JSON.stringify(apiBaseUrl),
      __MICRO_APP_IS_PREVIEW__: JSON.stringify(isPagesPreview),
    },
    test: {
      environment: "jsdom",
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
