export type BoundedBodyResult =
  | { kind: "ok"; text: string }
  | { kind: "too_large" }
  | { kind: "invalid" };

/**
 * Read a request body with a hard streaming byte ceiling. Do not call
 * Request.text()/json() before applying this guard: those APIs buffer the
 * complete body before a caller can reject an oversized payload.
 */
export async function readBodyWithinLimit(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<BoundedBodyResult> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) {
    throw new Error("Invalid request body size limit.");
  }
  if (!body) return { kind: "ok", text: "" };

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return { kind: "too_large" };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return { kind: "ok", text: new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(bytes) };
  } catch {
    try { await reader.cancel(); } catch { /* Preserve the invalid-body result. */ }
    return { kind: "invalid" };
  } finally {
    reader.releaseLock();
  }
}
