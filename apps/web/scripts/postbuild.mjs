import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const pagesBranch = process.env.CF_PAGES_BRANCH;
const isCloudflarePagesBuild = process.env.CF_PAGES === "1" || pagesBranch !== undefined;
const isPagesPreview = isCloudflarePagesBuild && pagesBranch !== "main";

const headersPath = fileURLToPath(new URL("../dist/_headers", import.meta.url));
const headers = await readFile(headersPath, "utf8");

if (!/connect-src\s+'self';/.test(headers) || /connect-src[^;]*workers\.dev/i.test(headers)) {
  throw new Error("Pages CSP must keep API traffic same-origin with connect-src 'self' only.");
}

const assetsPath = fileURLToPath(new URL("../dist/assets", import.meta.url));
const assets = await readdir(assetsPath);
for (const asset of assets) {
  const assetPath = fileURLToPath(new URL(`../dist/assets/${asset}`, import.meta.url));
  const content = await readFile(assetPath, "utf8");
  if (/https:\/\/[^"'\s]+\.workers\.dev/i.test(content)) {
    throw new Error(`Pages bundle must not contain a direct Workers API origin (asset: ${asset}).`);
  }
}

if (isPagesPreview && headers.includes("micro-app-api.btfcasheb.workers.dev")) {
  throw new Error("Preview isolation failed: production Worker origin found in _headers.");
}
