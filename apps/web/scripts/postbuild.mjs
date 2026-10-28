import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const pagesBranch = process.env.CF_PAGES_BRANCH;
const isCloudflarePagesBuild = process.env.CF_PAGES === "1" || pagesBranch !== undefined;
const isPagesPreview = isCloudflarePagesBuild && pagesBranch !== "main";

if (isPagesPreview) {
  const headersPath = fileURLToPath(new URL("../dist/_headers", import.meta.url));
  const headers = await readFile(headersPath, "utf8");
  const productionConnectSrc = "connect-src 'self' https://micro-app-api.btfcasheb.workers.dev;";

  if (!headers.includes(productionConnectSrc)) {
    throw new Error("Preview isolation failed: the expected production API origin was not found in dist/_headers.");
  }

  await writeFile(headersPath, headers.replace(productionConnectSrc, "connect-src 'self';"));
}
