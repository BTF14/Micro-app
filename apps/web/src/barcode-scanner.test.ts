import { describe, expect, it } from "vitest";
import {
  RETAIL_BARCODE_FORMATS,
  getBarcodeScannerSupport,
  mapCameraScannerError,
  normalizeScannedBarcode,
  selectSupportedBarcodeFormats,
  shouldAcceptDetectedBarcode,
  type BarcodeDetectorConstructorLike,
} from "./barcode-scanner";

const detectorStub = class {
  detect() { return Promise.resolve([]); }
} as unknown as BarcodeDetectorConstructorLike;

describe("getBarcodeScannerSupport", () => {
  const supportedEnv = {
    isSecureContext: true,
    navigator: { mediaDevices: { getUserMedia: () => Promise.resolve({} as MediaStream) } },
    BarcodeDetector: detectorStub,
  };

  it("requires a secure context", () => {
    expect(getBarcodeScannerSupport({ ...supportedEnv, isSecureContext: false })).toMatchObject({
      supported: false, reason: "insecure-context",
    });
  });
  it("falls back when mediaDevices is missing", () => {
    expect(getBarcodeScannerSupport({ isSecureContext: true, navigator: {}, BarcodeDetector: detectorStub }))
      .toMatchObject({ supported: false, reason: "camera-api-unavailable" });
  });
  it("falls back when getUserMedia is missing", () => {
    expect(getBarcodeScannerSupport({ isSecureContext: true, navigator: { mediaDevices: {} }, BarcodeDetector: detectorStub }))
      .toMatchObject({ supported: false, reason: "camera-api-unavailable" });
  });
  it("falls back when BarcodeDetector is missing", () => {
    expect(getBarcodeScannerSupport({ isSecureContext: true, navigator: supportedEnv.navigator }))
      .toMatchObject({ supported: false, reason: "barcode-detector-unavailable" });
  });
  it("reports full native support", () => {
    expect(getBarcodeScannerSupport(supportedEnv)).toMatchObject({ supported: true, reason: null });
  });
  it("provides a clear Spanish manual fallback message", () => {
    const result = getBarcodeScannerSupport({ isSecureContext: false });
    expect(result.message).toContain("buscar el producto");
    expect(result.message).not.toContain("BarcodeDetector");
  });
});

describe("selectSupportedBarcodeFormats", () => {
  it("preserves retail order for a partial browser list", () => {
    expect(selectSupportedBarcodeFormats(["qr_code", "ean_13", "code_128"]))
      .toEqual(["ean_13", "code_128", "qr_code"]);
  });
  it("returns empty when the browser explicitly reports no formats", () => {
    expect(selectSupportedBarcodeFormats([])).toEqual([]);
  });
  it("uses the ordered retail list when format reporting is unavailable", () => {
    expect(selectSupportedBarcodeFormats()).toEqual([...RETAIL_BARCODE_FORMATS]);
    expect(selectSupportedBarcodeFormats(null)).toEqual([...RETAIL_BARCODE_FORMATS]);
  });
  it("ignores formats outside the retail allowlist", () => {
    expect(selectSupportedBarcodeFormats(["aztec", "pdf417"])).toEqual([]);
  });
});

describe("normalizeScannedBarcode", () => {
  it("trims surrounding whitespace", () => {
    expect(normalizeScannedBarcode("  7501234567890  ")).toBe("7501234567890");
  });
  it("removes ASCII control characters and line breaks", () => {
    expect(normalizeScannedBarcode("\t750123\r\n4567890\u0000\u007f")).toBe("7501234567890");
  });
  it("rejects empty values and values made only of controls", () => {
    expect(normalizeScannedBarcode("   ")).toBeNull();
    expect(normalizeScannedBarcode("\r\n\t\u0000")).toBeNull();
  });
  it("rejects values longer than products.barcode limit", () => {
    expect(normalizeScannedBarcode("1".repeat(129))).toBeNull();
    expect(normalizeScannedBarcode("1".repeat(128))).toHaveLength(128);
  });
  it("rejects non-string input", () => {
    expect(normalizeScannedBarcode(null)).toBeNull();
    expect(normalizeScannedBarcode(123)).toBeNull();
  });
});

describe("shouldAcceptDetectedBarcode", () => {
  const base = { candidate: "7501234567890", lastAcceptedCode: "7501234567890", lastAcceptedAtMs: 1000, nowMs: 2000 };
  it("blocks the same code inside the default cooldown", () => {
    expect(shouldAcceptDetectedBarcode(base)).toBe(false);
  });
  it("accepts the same code after the cooldown expires", () => {
    expect(shouldAcceptDetectedBarcode({ ...base, nowMs: 2500 })).toBe(true);
  });
  it("accepts a different code immediately", () => {
    expect(shouldAcceptDetectedBarcode({ ...base, candidate: "7501234567891", nowMs: 1001 })).toBe(true);
  });
  it("rejects invalid candidates", () => {
    expect(shouldAcceptDetectedBarcode({ ...base, candidate: " \n " })).toBe(false);
    expect(shouldAcceptDetectedBarcode({ ...base, candidate: "x".repeat(129) })).toBe(false);
  });
  it("rejects invalid clock and cooldown values", () => {
    expect(shouldAcceptDetectedBarcode({ ...base, nowMs: Number.NaN })).toBe(false);
    expect(shouldAcceptDetectedBarcode({ ...base, cooldownMs: -1 })).toBe(false);
  });
});

describe("mapCameraScannerError", () => {
  const cases = [
    ["NotAllowedError", "No se autorizó"],
    ["PermissionDeniedError", "No se autorizó"],
    ["NotFoundError", "No encontramos una cámara"],
    ["DevicesNotFoundError", "No encontramos una cámara"],
    ["NotReadableError", "está siendo utilizada"],
    ["TrackStartError", "No pudimos iniciar la cámara"],
    ["OverconstrainedError", "no admite el modo solicitado"],
    ["SecurityError", "bloqueó el acceso"],
    ["AbortError", "No se pudo completar"],
  ] as const;
  it.each(cases)("maps %s to Spanish guidance", (name, expectedText) => {
    const message = mapCameraScannerError({ name });
    expect(message).toContain(expectedText);
    expect(message).toMatch(/busca(?:r|ndo)? el producto/);
    expect(message).not.toContain(name);
  });
  it("returns generic manual fallback for unknown or non-DOM errors", () => {
    expect(mapCameraScannerError({ name: "UnexpectedCameraFailure" })).toContain("buscar el producto");
    expect(mapCameraScannerError(new Error("internal stack detail"))).not.toContain("internal stack detail");
    expect(mapCameraScannerError(null)).toContain("buscar el producto");
  });
});
