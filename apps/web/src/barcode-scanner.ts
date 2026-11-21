export const RETAIL_BARCODE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "code_93",
  "itf",
  "codabar",
  "qr_code",
] as const;

export type RetailBarcodeFormat = (typeof RETAIL_BARCODE_FORMATS)[number];
export type BarcodeFormat = RetailBarcodeFormat | string;

export interface BarcodeDetectorLike {
  detect(source: ImageBitmapSource): Promise<readonly DetectedBarcodeLike[]>;
}

export interface DetectedBarcodeLike {
  rawValue: string;
  format?: string;
}

export interface BarcodeDetectorOptionsLike {
  formats?: readonly string[];
}

export interface BarcodeDetectorConstructorLike {
  new (options?: BarcodeDetectorOptionsLike): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<readonly string[]>;
}

export interface MediaDevicesLike {
  getUserMedia?: (...args: readonly unknown[]) => Promise<MediaStream>;
}

export interface BarcodeScannerNavigatorLike {
  mediaDevices?: MediaDevicesLike | null;
}

export interface BarcodeScannerEnvironment {
  isSecureContext?: boolean;
  navigator?: BarcodeScannerNavigatorLike | null;
  BarcodeDetector?: BarcodeDetectorConstructorLike;
}

export type ScannerSupportReason =
  | "insecure-context"
  | "camera-api-unavailable"
  | "barcode-detector-unavailable";

export type ScannerSupportStatus =
  | { supported: true; reason: null; message: string }
  | { supported: false; reason: ScannerSupportReason; message: string };

const SUPPORT_MESSAGES: Record<ScannerSupportReason, string> = {
  "insecure-context":
    "El escáner necesita una conexión segura. Puedes buscar el producto escribiendo su código.",
  "camera-api-unavailable":
    "Este navegador no permite acceder a la cámara. Puedes buscar el producto escribiendo su código.",
  "barcode-detector-unavailable":
    "El escaneo no está disponible en este dispositivo. Puedes buscar el producto escribiendo su código.",
};

export function getBarcodeScannerSupport(
  env: BarcodeScannerEnvironment,
): ScannerSupportStatus {
  if (env.isSecureContext !== true) {
    return { supported: false, reason: "insecure-context", message: SUPPORT_MESSAGES["insecure-context"] };
  }
  if (typeof env.navigator?.mediaDevices?.getUserMedia !== "function") {
    return { supported: false, reason: "camera-api-unavailable", message: SUPPORT_MESSAGES["camera-api-unavailable"] };
  }
  if (typeof env.BarcodeDetector !== "function") {
    return { supported: false, reason: "barcode-detector-unavailable", message: SUPPORT_MESSAGES["barcode-detector-unavailable"] };
  }
  return { supported: true, reason: null, message: "El escáner está disponible." };
}

export function selectSupportedBarcodeFormats(
  availableFormats?: readonly string[] | null,
): RetailBarcodeFormat[] {
  if (availableFormats === undefined || availableFormats === null) return [...RETAIL_BARCODE_FORMATS];
  const available = new Set(availableFormats);
  return RETAIL_BARCODE_FORMATS.filter((format) => available.has(format));
}

export function normalizeScannedBarcode(rawValue: unknown): string | null {
  if (typeof rawValue !== "string") return null;
  const normalized = rawValue.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  if (normalized.length === 0 || normalized.length > 128) return null;
  return normalized;
}

export interface ShouldAcceptDetectedBarcodeInput {
  candidate: unknown;
  lastAcceptedCode: string | null;
  lastAcceptedAtMs: number | null;
  nowMs: number;
  cooldownMs?: number;
}

export function shouldAcceptDetectedBarcode({
  candidate,
  lastAcceptedCode,
  lastAcceptedAtMs,
  nowMs,
  cooldownMs = 1500,
}: ShouldAcceptDetectedBarcodeInput): boolean {
  const normalizedCandidate = normalizeScannedBarcode(candidate);
  if (normalizedCandidate === null || !Number.isFinite(nowMs) ||
      !Number.isFinite(cooldownMs) || cooldownMs < 0) return false;
  if (normalizedCandidate !== lastAcceptedCode || lastAcceptedAtMs === null) return true;
  if (!Number.isFinite(lastAcceptedAtMs)) return false;
  return nowMs - lastAcceptedAtMs >= cooldownMs;
}

const CAMERA_ERROR_MESSAGES: Record<string, string> = {
  NotAllowedError: "No se autorizó el acceso a la cámara. Puedes continuar buscando el producto por su código.",
  PermissionDeniedError: "No se autorizó el acceso a la cámara. Puedes continuar buscando el producto por su código.",
  NotFoundError: "No encontramos una cámara disponible. Puedes buscar el producto escribiendo su código.",
  DevicesNotFoundError: "No encontramos una cámara disponible. Puedes buscar el producto escribiendo su código.",
  NotReadableError: "La cámara está siendo utilizada por otra aplicación o no está disponible. Ciérrala e inténtalo de nuevo, o busca el producto por su código.",
  TrackStartError: "No pudimos iniciar la cámara. Puedes buscar el producto escribiendo su código.",
  OverconstrainedError: "La cámara no admite el modo solicitado. Puedes buscar el producto escribiendo su código.",
  SecurityError: "El navegador bloqueó el acceso a la cámara por seguridad. Puedes buscar el producto escribiendo su código.",
  AbortError: "No se pudo completar el acceso a la cámara. Puedes buscar el producto escribiendo su código.",
};

export function mapCameraScannerError(error: unknown): string {
  if (typeof error === "object" && error !== null && "name" in error && typeof error.name === "string") {
    return CAMERA_ERROR_MESSAGES[error.name] ??
      "No pudimos iniciar el escáner. Puedes buscar el producto escribiendo su código.";
  }
  return "No pudimos iniciar el escáner. Puedes buscar el producto escribiendo su código.";
}
