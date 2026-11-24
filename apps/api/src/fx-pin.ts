const KDF_VERSION = "pbkdf2-sha256-v1" as const;
export const FX_PIN_ITERATIONS = 100_000;

export type FxPinHash = {
  kdfVersion: typeof KDF_VERSION;
  iterations: number;
  saltBase64: string;
  hashBase64: string;
};

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(value: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error("FX_PIN_ENCODING_INVALID");
  }
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function validPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^[0-9]{8,32}$/.test(pin);
}

async function prehashPin(pin: string, organizationId: string, userId: string, pepper: string): Promise<Uint8Array> {
  if (!pepper || pepper.length < 32) throw new Error("FX_PIN_PEPPER_NOT_CONFIGURED");
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const message = ["micro-app-fx-pin-v1", organizationId.toLowerCase(), userId.toLowerCase(), pin].join(":");
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

async function derive(prehash: Uint8Array, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", prehash, "PBKDF2", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256,
  ));
}

export async function hashFxPin(
  pin: string,
  organizationId: string,
  userId: string,
  pepper: string,
): Promise<FxPinHash> {
  if (!validPin(pin)) throw new Error("FX_PIN_FORMAT_INVALID");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const prehash = await prehashPin(pin, organizationId, userId, pepper);
  const hash = await derive(prehash, salt, FX_PIN_ITERATIONS);
  return {
    kdfVersion: KDF_VERSION,
    iterations: FX_PIN_ITERATIONS,
    saltBase64: encodeBase64(salt),
    hashBase64: encodeBase64(hash),
  };
}

export async function verifyFxPin(
  pin: unknown,
  stored: { kdf_version: string; iterations: number; salt_base64: string; hash_base64: string } | null,
  organizationId: string,
  userId: string,
  pepper: string,
): Promise<boolean> {
  if (!validPin(pin) || !stored || stored.kdf_version !== KDF_VERSION ||
      !Number.isInteger(stored.iterations) || stored.iterations !== FX_PIN_ITERATIONS) {
    // Keep malformed/missing credentials on a fixed-cost derivation path.
    if (validPin(pin) && pepper.length >= 32) {
      const dummy = await prehashPin(pin, organizationId, userId, pepper);
      await derive(dummy, new Uint8Array(16), FX_PIN_ITERATIONS);
    }
    return false;
  }
  try {
    const salt = decodeBase64(stored.salt_base64);
    const expected = decodeBase64(stored.hash_base64);
    if (salt.length !== 16 || expected.length !== 32) return false;
    const prehash = await prehashPin(pin, organizationId, userId, pepper);
    const actual = await derive(prehash, salt, stored.iterations);
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) difference |= actual[index]! ^ expected[index]!;
    return difference === 0;
  } catch {
    return false;
  }
}
