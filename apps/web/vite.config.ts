import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const root = fileURLToPath(new URL(".", import.meta.url));
const pagesBranch = process.env.CF_PAGES_BRANCH;
const isCloudflarePagesBuild = process.env.CF_PAGES === "1" || pagesBranch !== undefined;
const isPagesPreview = isCloudflarePagesBuild && pagesBranch !== "main";

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, root, "VITE_");
  const apiBaseUrl = isPagesPreview
    ? ""
    : (process.env.VITE_API_BASE_URL ?? fileEnv.VITE_API_BASE_URL ?? "").trim().replace(/\/+$/, "");

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
