import { useState, type ChangeEvent } from "react";
import { ApiError, apiRequest } from "./auth";

const MAX_CSV_BYTES = 256 * 1024;
type Delimiter = "auto" | "," | ";";
type RowError = { row: number; field: string; message: string };
type Summary = { total_rows: number; creates: number; updates: number; unchanged: number; errors: number };
type PreviewItem = { row: number; sku: string; action: "create" | "update" | "unchanged" | "invalid"; errors?: RowError[] };
type Preview = { delimiter: "," | ";"; canonical_hash: string; can_apply: boolean; summary: Summary; items: PreviewItem[]; errors: RowError[] };
type ApplyResult = { replayed: boolean; summary: Summary };
type Props = { organizationId: string; onCancel: () => void; onImported: () => void };

function rowErrors(value: unknown): RowError[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is RowError => Boolean(item) && typeof item === "object" &&
    typeof item.row === "number" && typeof item.field === "string" && typeof item.message === "string");
}
function actionLabel(action: PreviewItem["action"]): string {
  return action === "create" ? "Alta" : action === "update" ? "Actualizar" : action === "unchanged" ? "Sin cambios" : "Error";
}
function fieldLabel(field: string): string {
  const labels: Record<string, string> = {
    sku: "SKU", barcode: "Código de barras", name: "Nombre", description: "Descripción",
    unit: "Unidad", cost_usd: "Costo (USD)", price_usd: "Precio (USD)",
    minimum_stock: "Stock mínimo", quantity_mode: "Modo de cantidad", is_active: "Estado",
  };
  return labels[field] ?? "Dato";
}
function friendlyMessage(message: string): string {
  return message
    .replaceAll("price_usd", "precio (USD)")
    .replaceAll("cost_usd", "costo (USD)")
    .replaceAll("minimum_stock", "stock mínimo")
    .replaceAll("quantity_mode", "modo de cantidad")
    .replaceAll("barcode", "código de barras")
    .replaceAll("name", "nombre")
    .replaceAll("sku", "SKU");
}

export default function CatalogCsvImportPanel({ organizationId, onCancel, onImported }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<Delimiter>("auto");
  const [csv, setCsv] = useState<string | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState("");
  const [serverErrors, setServerErrors] = useState<RowError[]>([]);
  const [applied, setApplied] = useState<ApplyResult | null>(null);

  function resetPreview() {
    setCsv(null); setPreview(null); setIdempotencyKey(null); setServerErrors([]); setApplied(null); setAlert("");
  }
  function changeFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null); resetPreview();
  }
  function changeDelimiter(event: ChangeEvent<HTMLSelectElement>) {
    setDelimiter(event.target.value as Delimiter); resetPreview();
  }
  async function readCsv(): Promise<string | null> {
    if (!file) { setAlert("Selecciona un archivo CSV antes de continuar."); return null; }
    if (file.size > MAX_CSV_BYTES) { setAlert("El archivo supera el límite de 256 KiB. Selecciona un archivo más pequeño."); return null; }
    try { return new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); }
    catch { setAlert("El archivo no contiene texto UTF-8 válido. Guarda el CSV como UTF-8 e inténtalo de nuevo."); return null; }
  }
  async function handlePreview() {
    setAlert(""); setPreview(null); setIdempotencyKey(null); setServerErrors([]); setApplied(null);
    const contents = await readCsv();
    if (contents === null) return;
    setBusy(true);
    try {
      const result = await apiRequest<Preview>(`/api/orgs/${encodeURIComponent(organizationId)}/catalog/imports/preview`,
        { method: "POST", body: JSON.stringify({ csv: contents, delimiter }) });
      setCsv(contents); setPreview(result); setIdempotencyKey(`csv-${crypto.randomUUID()}`);
    } catch (reason) {
      setAlert(reason instanceof Error ? reason.message : "No se pudo preparar la importación.");
      if (reason instanceof ApiError) setServerErrors(rowErrors((reason.data as { errors?: unknown } | undefined)?.errors));
    } finally { setBusy(false); }
  }
  async function handleApply() {
    if (!preview || csv === null || !idempotencyKey || preview.can_apply !== true || preview.errors.length > 0) return;
    setAlert(""); setServerErrors([]); setBusy(true);
    try {
      const result = await apiRequest<ApplyResult>(`/api/orgs/${encodeURIComponent(organizationId)}/catalog/imports/apply`, {
        method: "POST", headers: { "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ csv, delimiter: preview.delimiter, expected_hash: preview.canonical_hash }),
      });
      setApplied(result); onImported();
    } catch (reason) {
      setAlert(reason instanceof Error ? reason.message : "No se pudo aplicar la importación. Puedes intentarlo de nuevo.");
      if (reason instanceof ApiError) setServerErrors(rowErrors((reason.data as { errors?: unknown } | undefined)?.errors));
    } finally { setBusy(false); }
  }
  const errors = [...(preview?.errors ?? []), ...(preview?.items.flatMap(item => item.errors ?? []) ?? []), ...serverErrors]
    .filter((item, index, all) => all.findIndex(other => other.row === item.row && other.field === item.field && other.message === item.message) === index);

  return (
    <section className="catalog-import" aria-labelledby="catalog-import-title">
      <div className="catalog-import-heading">
        <div><p className="eyebrow">CATÁLOGO</p><h2 id="catalog-import-title">Importar productos desde CSV</h2>
          <p>Selecciona un archivo para revisar los cambios antes de aplicarlos.</p></div>
        <button className="catalog-import-secondary" type="button" onClick={onCancel} disabled={busy}>Cancelar</button>
      </div>
      <div className="catalog-import-fields">
        <label>Archivo CSV<input type="file" accept=".csv,text/csv" onChange={changeFile} />
          <span className="catalog-import-hint">Tamaño máximo: 256 KiB. El archivo debe estar guardado en UTF-8.</span></label>
        <label>Separador de columnas<select value={delimiter} onChange={changeDelimiter}>
          <option value="auto">Detección automática</option><option value=",">Coma (,)</option><option value=";">Punto y coma (;)</option>
        </select></label>
      </div>
      {alert && <p className="catalog-import-alert" role="alert">{alert}</p>}
      <div className="catalog-import-actions"><button className="catalog-import-primary" type="button" onClick={() => void handlePreview()} disabled={busy}>
        {busy && !preview ? "Preparando…" : "Previsualizar importación"}</button></div>
      {preview && <div className="catalog-import-preview" aria-live="polite">
        <h3>Resumen de la revisión</h3>
        <dl className="catalog-import-summary">
          <div><dt>Filas</dt><dd>{preview.summary.total_rows}</dd></div><div><dt>Altas</dt><dd>{preview.summary.creates}</dd></div>
          <div><dt>Actualizaciones</dt><dd>{preview.summary.updates}</dd></div><div><dt>Sin cambios</dt><dd>{preview.summary.unchanged}</dd></div>
          <div><dt>Errores</dt><dd>{preview.summary.errors}</dd></div>
        </dl>
        <h3>Filas del archivo</h3><div className="catalog-import-rows">{preview.items.map(item =>
          <article className="catalog-import-row" key={item.row}>
            <div><strong>Fila {item.row}</strong><span>{item.sku}</span></div>
            <span className={item.action === "invalid" ? "catalog-import-row-error" : "catalog-import-row-action"}>{actionLabel(item.action)}</span>
          </article>)}</div>
        {errors.length > 0 && <div className="catalog-import-errors" role="alert"><h3>Detalles que debes revisar</h3>
          <ul>{errors.map((item, index) => <li key={item.row + "-" + item.field + "-" + index}>Fila {item.row}, {fieldLabel(item.field)}: {friendlyMessage(item.message)}</li>)}</ul></div>}
        <div className="catalog-import-actions"><button className="catalog-import-primary" type="button" onClick={() => void handleApply()}
          disabled={busy || preview.can_apply !== true || preview.errors.length > 0 || errors.length > 0}>
          {busy && preview ? "Aplicando…" : "Confirmar importación"}</button></div>
      </div>}
      {applied && <p className="catalog-import-success" role="status">
        Importación completada: {applied.summary.total_rows} filas revisadas, {applied.summary.creates} altas, {applied.summary.updates} actualizaciones y {applied.summary.unchanged} sin cambios.
        {applied.replayed ? " La confirmación se recuperó de forma segura; no se duplicaron cambios." : ""}
      </p>}
    </section>
  );
}
