import { describe, expect, it } from "vitest";
import { readBodyWithinLimit } from "./bounded-body";

function streamOf(...chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe("streaming request body limits", () => {
  it("decodes a body at the exact byte ceiling", async () => {
    const result = await readBodyWithinLimit(streamOf(new TextEncoder().encode("hello")), 5);
    expect(result).toEqual({ kind: "ok", text: "hello" });
  });

  it("rejects chunked bodies as soon as the cumulative byte ceiling is exceeded", async () => {
    const result = await readBodyWithinLimit(
      streamOf(new TextEncoder().encode("hello"), new TextEncoder().encode("!")),
      5,
    );
    expect(result).toEqual({ kind: "too_large" });
  });

  it("rejects invalid UTF-8 instead of silently replacing bytes", async () => {
    const result = await readBodyWithinLimit(streamOf(new Uint8Array([0xc3, 0x28])), 8);
    expect(result).toEqual({ kind: "invalid" });
  });

  it("treats an absent body as an empty body", async () => {
    await expect(readBodyWithinLimit(null, 0)).resolves.toEqual({ kind: "ok", text: "" });
  });
});
