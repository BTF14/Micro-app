import { formatNumeric, parseNumeric } from "@micro-app/money";

export const CSV_MAX_BYTES = 256 * 1024;
export const CSV_MAX_DATA_ROWS = 1000;

export type CsvDelimiter = "," | ";" | "auto";
export type ResolvedCsvDelimiter = "," | ";";
export type CatalogCsvRow = {
  sku: string;
  name?: string;
  price_usd?: string;
  cost_usd?: string;
  unit?: string;
  quantity_mode?: "integer" | "fractional";
  minimum_stock?: string;
  barcode?: string | null;
  description?: string | null;
  is_active?: boolean;
};
export type CatalogCsvRowError = {
  row: number;
  field: string;
  code: string;
  message: string;
};
export type CatalogCsvParseResult = {
  delimiter: ResolvedCsvDelimiter;
  headers: string[];
  rows: CatalogCsvRow[];
  errors: CatalogCsvRowError[];
  dataRowCount: number;
};

export class CatalogCsvError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "CatalogCsvError";
    this.code = code;
  }
}

const ALLOWED_HEADERS = new Set([
  "sku", "name", "price_usd", "cost_usd", "unit", "quantity_mode",
  "minimum_stock", "barcode", "description", "is_active",
]);
const FORBIDDEN_HEADERS = new Set([
  "stock", "stock_quantity", "on_hand", "on_hand_quantity", "reserved_quantity",
  "existencia", "existencias", "inventario", "warehouse", "warehouse_id",
  "almacen", "movement", "quantity_delta",
]);

function normalizeHeader(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase();
}

function foldHeader(value: string): string {
  return normalizeHeader(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function decodeCsv(input: Uint8Array | string): string {
  let text: string;
  if (typeof input === "string") {
    text = input;
    if (new TextEncoder().encode(text).byteLength > CSV_MAX_BYTES) {
      throw new CatalogCsvError("CSV_TOO_LARGE", "El archivo CSV excede 262144 bytes.");
    }
  } else {
    if (!(input instanceof Uint8Array)) {
      throw new CatalogCsvError("INVALID_INPUT", "El CSV debe ser texto o Uint8Array.");
    }
    if (input.byteLength > CSV_MAX_BYTES) {
      throw new CatalogCsvError("CSV_TOO_LARGE", "El archivo CSV excede 262144 bytes.");
    }
    try {
      text = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(input);
    } catch {
      throw new CatalogCsvError("INVALID_UTF8", "El archivo no contiene UTF-8 válido.");
    }
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (text.includes("\u0000")) {
    throw new CatalogCsvError("NUL_BYTE", "El archivo contiene un byte NUL no permitido.");
  }
  return text;
}

function parseRecords(text: string, delimiter: ResolvedCsvDelimiter): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;
  let afterQuote = false;

  const pushField = () => {
    record.push(field);
    field = "";
    afterQuote = false;
  };
  const pushRecord = () => {
    pushField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
          afterQuote = true;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (afterQuote) {
      if (char === delimiter) {
        pushField();
      } else if (char === "\r" || char === "\n") {
        pushRecord();
        if (char === "\r" && text[i + 1] === "\n") i += 1;
      } else {
        throw new CatalogCsvError("MALFORMED_CSV", "Hay caracteres inesperados después de una comilla de cierre.");
      }
      continue;
    }

    if (char === '"') {
      if (field.length !== 0) {
        throw new CatalogCsvError("MALFORMED_CSV", "Una comilla solo puede iniciar un campo vacío.");
      }
      quoted = true;
    } else if (char === delimiter) {
      pushField();
    } else if (char === "\r" || char === "\n") {
      pushRecord();
      if (char === "\r" && text[i + 1] === "\n") i += 1;
    } else {
      field += char;
    }
  }

  if (quoted) {
    throw new CatalogCsvError("UNCLOSED_QUOTE", "El CSV contiene una comilla sin cerrar.");
  }
  if (field.length > 0 || record.length > 0 || afterQuote) pushRecord();
  return records;
}

function resolveDelimiter(text: string, requested: CsvDelimiter): ResolvedCsvDelimiter {
  if (requested === "," || requested === ";") return requested;
  const header = text.split(/\r\n|\n|\r/, 1)[0] ?? "";
  let quoted = false;
  let commas = 0;
  let semicolons = 0;
  for (let index = 0; index < header.length; index += 1) {
    const char = header[index];
    if (char === '"') {
      if (quoted && header[index + 1] === '"') {
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === ",") {
      commas += 1;
    } else if (!quoted && char === ";") {
      semicolons += 1;
    }
  }
  if (quoted || (commas > 0 && semicolons > 0) || (commas === 0 && semicolons === 0)) {
    throw new CatalogCsvError("AMBIGUOUS_DELIMITER", "No se puede determinar el separador de forma unívoca; selecciona coma o punto y coma manualmente.");
  }
  return commas > 0 ? "," : ";";
}
function isEmptyRecord(record: string[]): boolean {
  return record.every((value) => value.trim() === "");
}

function addError(
  errors: CatalogCsvRowError[],
  row: number,
  field: string,
  code: string,
  message: string,
): void {
  errors.push({ row, field, code, message });
}

function boundedText(
  value: string,
  minLength: number,
  maxLength: number,
  field: string,
  row: number,
  errors: CatalogCsvRowError[],
): string | null {
  const normalized = value.trim();
  if (
    normalized.length < minLength ||
    normalized.length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(normalized)
  ) {
    addError(errors, row, field, "INVALID_TEXT", `${field} debe tener ${minLength}..${maxLength} caracteres y no contener controles.`);
    return null;
  }
  return normalized;
}

function decimalValue(
  value: string,
  delimiter: ResolvedCsvDelimiter,
  precision: number,
  scale: number,
  field: string,
  row: number,
  errors: CatalogCsvRowError[],
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const canonical = delimiter === ";" ? trimmed.replace(",", ".") : trimmed;
  const decimalPattern = scale === 0
    ? /^(?:0|[1-9][0-9]*)$/
    : new RegExp(`^(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,${scale}})?$`);
  if ((delimiter === ";" && trimmed.includes(".")) || !decimalPattern.test(canonical)) {
    addError(errors, row, field, "INVALID_DECIMAL", `${field} no respeta el formato decimal del separador ni la escala ${scale}.`);
    return undefined;
  }
  try {
    const parsed = parseNumeric(canonical, precision, scale);
    if (parsed < 0n) {
      addError(errors, row, field, "NEGATIVE_DECIMAL", `${field} no puede ser negativo.`);
      return undefined;
    }
    return formatNumeric(parsed, precision, scale);
  } catch {
    addError(errors, row, field, "DECIMAL_OUT_OF_RANGE", `${field} excede NUMERIC(${precision},${scale}).`);
    return undefined;
  }
}

function validateRow(
  cells: string[],
  headers: string[],
  delimiter: ResolvedCsvDelimiter,
  rowNumber: number,
  errors: CatalogCsvRowError[],
): CatalogCsvRow {
  const raw = new Map(headers.map((header, index) => [header, cells[index] ?? ""]));
  const result: CatalogCsvRow = { sku: "" };
  const skuRaw = raw.get("sku") ?? "";
  const sku = boundedText(skuRaw, 1, 80, "sku", rowNumber, errors);
  if (sku !== null) result.sku = sku;
  else addError(errors, rowNumber, "sku", "SKU_REQUIRED", "sku es obligatorio en todas las filas.");

  const textFields: Array<["name" | "unit", number, number]> = [
    ["name", 1, 240], ["unit", 1, 40],
  ];
  for (const [field, min, max] of textFields) {
    if (!raw.has(field)) continue;
    const value = raw.get(field) ?? "";
    if (!value.trim()) continue;
    const parsed = boundedText(value, min, max, field, rowNumber, errors);
    if (parsed !== null) {
      if (field === "name") result.name = parsed;
      else result.unit = parsed;
    }
  }

  for (const [field, precision, scale] of [
    ["price_usd", 14, 4], ["cost_usd", 14, 4], ["minimum_stock", 14, 3],
  ] as const) {
    if (!raw.has(field)) continue;
    const parsed = decimalValue(raw.get(field) ?? "", delimiter, precision, scale, field, rowNumber, errors);
    if (parsed !== undefined) result[field] = parsed;
  }

  if (raw.has("quantity_mode")) {
    const mode = (raw.get("quantity_mode") ?? "").trim().toLowerCase();
    if (mode) {
      if (mode === "integer" || mode === "fractional") result.quantity_mode = mode;
      else addError(errors, rowNumber, "quantity_mode", "INVALID_QUANTITY_MODE", "quantity_mode debe ser integer o fractional.");
    }
  }

  if (raw.has("minimum_stock") && result.minimum_stock !== undefined) {
    const mode = result.quantity_mode;
    if (mode === "integer") {
      try {
        if (parseNumeric(result.minimum_stock, 14, 3) % 1000n !== 0n) {
          addError(errors, rowNumber, "minimum_stock", "FRACTIONAL_INTEGER_MINIMUM", "minimum_stock debe ser entero cuando quantity_mode es integer.");
        }
      } catch {
        // The decimal parser already reported the invalid value.
      }
    }
  }

  if (raw.has("barcode")) {
    const value = raw.get("barcode") ?? "";
    if (!value.trim()) result.barcode = null;
    else {
      const parsed = boundedText(value, 1, 128, "barcode", rowNumber, errors);
      if (parsed !== null) result.barcode = parsed;
    }
  }

  if (raw.has("description")) {
    const value = raw.get("description") ?? "";
    if (!value.trim()) result.description = null;
    else {
      const parsed = boundedText(value, 0, 2000, "description", rowNumber, errors);
      if (parsed !== null) result.description = parsed;
    }
  }

  if (raw.has("is_active")) {
    const value = (raw.get("is_active") ?? "").trim().toLowerCase();
    if (value) {
      if (value === "true") result.is_active = true;
      else if (value === "false") result.is_active = false;
      else addError(errors, rowNumber, "is_active", "INVALID_BOOLEAN", "is_active debe ser true o false.");
    }
  }

  return result;
}

export function parseCatalogCsv(
  input: Uint8Array | string,
  delimiter: CsvDelimiter = "auto",
): CatalogCsvParseResult {
  const text = decodeCsv(input);
  const resolved = resolveDelimiter(text, delimiter);
  const records = parseRecords(text, resolved);
  const nonEmpty = records.filter((record) => !isEmptyRecord(record));
  if (nonEmpty.length === 0) {
    throw new CatalogCsvError("MISSING_HEADER", "El CSV debe incluir una fila de encabezados.");
  }

  const rawHeaders = nonEmpty[0];
  const headers = rawHeaders.map(normalizeHeader);
  const seen = new Set<string>();
  for (const header of headers) {
    if (!header) throw new CatalogCsvError("EMPTY_HEADER", "El CSV contiene un encabezado vacío.");
    if (seen.has(header)) throw new CatalogCsvError("DUPLICATE_HEADER", `Encabezado duplicado después de normalizar: ${header}.`);
    seen.add(header);
    const folded = foldHeader(header);
    if (FORBIDDEN_HEADERS.has(folded)) {
      throw new CatalogCsvError("FORBIDDEN_COLUMN", `La columna ${header} está prohibida: el importador no modifica inventario.`);
    }
    if (!ALLOWED_HEADERS.has(header)) {
      throw new CatalogCsvError("UNKNOWN_COLUMN", `La columna ${header} no está soportada.`);
    }
  }
  if (!seen.has("sku")) throw new CatalogCsvError("SKU_HEADER_REQUIRED", "El encabezado sku es obligatorio.");

  const dataRecords = nonEmpty.slice(1);
  if (dataRecords.length > CSV_MAX_DATA_ROWS) {
    throw new CatalogCsvError("TOO_MANY_ROWS", `El CSV excede ${CSV_MAX_DATA_ROWS} filas de datos.`);
  }

  const rows: CatalogCsvRow[] = [];
  const errors: CatalogCsvRowError[] = [];
  const skuFirstRow = new Map<string, number>();
  const barcodeFirstRow = new Map<string, number>();

  dataRecords.forEach((cells, index) => {
    const rowNumber = index + 2;
    if (cells.length > headers.length) {
      addError(errors, rowNumber, "_row", "TOO_MANY_CELLS", "La fila contiene más celdas que encabezados.");
    }
    const row = validateRow(cells, headers, resolved, rowNumber, errors);
    rows.push(row);

    if (row.sku) {
      const previous = skuFirstRow.get(row.sku);
      if (previous !== undefined) {
        addError(errors, rowNumber, "sku", "DUPLICATE_SKU", `SKU repetido dentro del archivo (primera aparición en fila ${previous}).`);
      } else skuFirstRow.set(row.sku, rowNumber);
    }
    if (row.barcode) {
      const previous = barcodeFirstRow.get(row.barcode);
      if (previous !== undefined) {
        addError(errors, rowNumber, "barcode", "DUPLICATE_BARCODE", `Barcode repetido dentro del archivo (primera aparición en fila ${previous}).`);
      } else barcodeFirstRow.set(row.barcode, rowNumber);
    }
  });

  return { delimiter: resolved, headers, rows, errors, dataRowCount: dataRecords.length };
}

const VALIDATED_DECIMAL = /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;

export function neutralizeCsvFormula(value: string): string {
  if (VALIDATED_DECIMAL.test(value)) return value;
  if (/^\s*[=+\-@\t\r]/.test(value)) return "'" + value;
  return value;
}

export function formatSafeCsvCell(value: string, delimiter: ResolvedCsvDelimiter = ","): string {
  const safe = neutralizeCsvFormula(value);
  if (safe.includes(delimiter) || safe.includes('"') || /[\r\n]/.test(safe)) {
    return '"' + safe.replace(/"/g, '""') + '"';
  }
  return safe;
}

function stableCanonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(stableCanonical).join(",") + "]";
  const record = value as Record<string, unknown>;
  return "{" + Object.keys(record).sort().map((key) =>
    JSON.stringify(key) + ":" + stableCanonical(record[key]),
  ).join(",") + "}";
}

export async function computeCanonicalCsvHash(
  organizationId: string,
  options: Readonly<Record<string, unknown>>,
  rows: readonly CatalogCsvRow[],
): Promise<string> {
  const canonical = stableCanonical({
    scope: { organization_id: organizationId },
    options,
    rows: rows.map((row) => ({
      sku: row.sku,
      name: row.name ?? null,
      price_usd: row.price_usd ?? null,
      cost_usd: row.cost_usd ?? null,
      unit: row.unit ?? null,
      quantity_mode: row.quantity_mode ?? null,
      minimum_stock: row.minimum_stock ?? null,
      barcode: row.barcode ?? null,
      description: row.description ?? null,
      is_active: row.is_active ?? null,
    })),
  });
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
