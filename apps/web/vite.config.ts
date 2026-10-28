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
    : (fileEnv.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

  return {
    plugins: [react()],
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
