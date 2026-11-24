import { hashFxPin, verifyFxPin } from "./fx-pin";

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return new Response("Not found", { status: 404 });
    try {
      const body = await request.json() as {
        pin?: unknown; organizationId?: string; userId?: string; pepper?: string;
      };
      if (typeof body.pin !== "string" || typeof body.organizationId !== "string" ||
          typeof body.userId !== "string" || typeof body.pepper !== "string") {
        return Response.json({ error: "INVALID_TEST_INPUT" }, { status: 400 });
      }
      const encoded = await hashFxPin(body.pin, body.organizationId, body.userId, body.pepper);
      const verified = await verifyFxPin(body.pin, {
        kdf_version: encoded.kdfVersion,
        iterations: encoded.iterations,
        salt_base64: encoded.saltBase64,
        hash_base64: encoded.hashBase64,
      }, body.organizationId, body.userId, body.pepper);
      return Response.json({ verified, kdfVersion: encoded.kdfVersion, iterations: encoded.iterations });
    } catch {
      return Response.json({ error: "KDF_RUNTIME_FAILED" }, { status: 500 });
    }
  },
};
