import { describe, expect, it } from "vitest";
import { readBodyWithinLimit } from "./bounded-body";

describe("bounded streaming request bodies", () => {
  it("cancels the stream as soon as the byte ceiling is exceeded", async () => {
    let cancelled = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array(1024));
        controller.enqueue(new Uint8Array(1025));
      },
      cancel() {
        cancelled = true;
      },
    });

    await expect(readBodyWithinLimit(body, 2048)).resolves.toEqual({ kind: "too_large" });
    expect(cancelled).toBe(true);
  });

  it("accepts a body exactly at the configured byte ceiling", async () => {
    const expected = "x".repeat(2048);
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(expected));
        controller.close();
      },
    });

    await expect(readBodyWithinLimit(body, 2048)).resolves.toEqual({ kind: "ok", text: expected });
  });

  it("rejects malformed UTF-8 instead of silently replacing invalid bytes", async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new Uint8Array([0xff, 0xfe]));
        controller.close();
      },
    });

    await expect(readBodyWithinLimit(body, 2048)).resolves.toEqual({ kind: "invalid" });
  });

  it("treats a missing body as an empty body", async () => {
    await expect(readBodyWithinLimit(null, 2048)).resolves.toEqual({ kind: "ok", text: "" });
  });
});
