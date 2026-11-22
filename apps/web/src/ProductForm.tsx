import { useState, type FormEvent } from "react";
import { formatMoneyForDisplay, parseNumeric } from "@micro-app/money";
import { apiRequest } from "./auth";
import { normalizeDecimalInput } from "./decimal";
import BarcodeScanner from "./BarcodeScanner";

type CatalogProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  quantity_mode: "integer" | "fractional";
  cost_usd?: string;
  price_usd: string;
  is_active: boolean;
};

type ProductDraft = {
  sku: string;
  barcode: string;
  name: string;
  description: string;
  unit: string;
  cost_usd: string;
  price_usd: string;
  minimum_stock: string;
  quantity_mode: "integer" | "fractional";
  is_active: boolean;
};

type ProductFormProps = {
  organizationId: string;
  product?: CatalogProduct;
  onCancel: () => void;
  onSaved: () => void;
};

function initialDraft(product?: CatalogProduct): ProductDraft {
  return {
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    name: product?.name ?? "",
    description: product?.description ?? "",
    unit: product?.unit ?? "unidad",
    quantity_mode: product?.quantity_mode ?? "integer",
    cost_usd: product?.cost_usd ? formatMoneyForDisplay(product.cost_usd) : "0.00",
    price_usd: product?.price_usd ? formatMoneyForDisplay(product.price_usd) : "",
    minimum_stock: product ? "" : "0",
    is_active: product?.is_active ?? true,
  };
}

export default function ProductForm({ organizationId, product, onCancel, onSaved }: ProductFormProps) {
  const [draft, setDraft] = useState<ProductDraft>(() => initialDraft(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quantityModeManuallySet, setQuantityModeManuallySet] = useState(Boolean(product));
  const [scannerOpen, setScannerOpen] = useState(false);

  function update<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!draft.sku.trim() || !draft.name.trim() || !draft.unit.trim()) {
      setError("Completa el SKU, el nombre y la unidad.");
      return;
    }

    const costUsd = normalizeDecimalInput(draft.cost_usd);
    const priceUsd = normalizeDecimalInput(draft.price_usd);
    const minimumStockInput = normalizeDecimalInput(draft.minimum_stock);

    try {
      const cost = parseNumeric(costUsd, 14, 4);
      const price = parseNumeric(priceUsd, 14, 4);
      const minimumStock = minimumStockInput
        ? parseNumeric(minimumStockInput, 14, 3)
        : null;
      if (cost < 0n || price < 0n || minimumStock !== null && minimumStock < 0n) {
        setError("Los costos, precios y mínimos de inventario no pueden ser negativos.");
        return;
      }
      if (draft.quantity_mode === "integer" && minimumStock !== null && minimumStock % 1000n !== 0n) {
        setError("El stock mínimo debe ser entero para productos de unidad entera.");
        return;
      }
    } catch {
      setError("Usa decimales válidos: USD con hasta 4 decimales y mínimo de inventario con hasta 3.");
      return;
    }

    const payload = {
      sku: draft.sku.trim(),
      barcode: draft.barcode.trim() || null,
      name: draft.name.trim(),
      description: draft.description.trim() || null,
      unit: draft.unit.trim(),
      quantity_mode: draft.quantity_mode,
      cost_usd: costUsd,
      price_usd: priceUsd,
      ...(product
        ? {
            is_active: draft.is_active,
            ...(minimumStockInput ? { minimum_stock: minimumStockInput } : {}),
          }
        : { minimum_stock: minimumStockInput }),
    };

    setSaving(true);
    try {
      await apiRequest(
        product
          ? `/api/orgs/${encodeURIComponent(organizationId)}/catalog/${encodeURIComponent(product.id)}`
          : `/api/orgs/${encodeURIComponent(organizationId)}/catalog`,
        {
          method: product ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="product-editor" aria-labelledby="product-editor-title">
      <div className="product-editor-heading">
        <div>
          <p className="eyebrow">CATÁLOGO</p>
          <h2 id="product-editor-title">{product ? "Editar producto" : "Nuevo producto"}</h2>
        </div>
        <button className="product-editor-cancel" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
      </div>

      <form className="product-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          SKU
          <input value={draft.sku} onChange={(event) => update("sku", event.target.value)} maxLength={80} required autoComplete="off" />
        </label>
        <label>
          Nombre
          <input value={draft.name} onChange={(event) => update("name", event.target.value)} maxLength={240} required />
        </label>
        <label>
          Código de barras
          <div className="product-barcode-field"><input value={draft.barcode} onChange={(event) => update("barcode", event.target.value)} maxLength={128} autoComplete="off" /><button className="product-barcode-scan" type="button" onClick={() => setScannerOpen(true)} disabled={saving}>Escanear</button></div>
        </label>
        <label>
          Unidad
          <input value={draft.unit} onChange={(event) => {
            const unit = event.target.value;
            update("unit", unit);
            const metricUnits = new Set(["kg","kilogramo","kilogramos","g","gr","gramo","gramos","lb","libra","libras","oz","onza","onzas","l","lt","litro","litros","ml","mililitro","mililitros","m","mt","metro","metros","cm","centimetro","centimetros","granel"]);
            if (!quantityModeManuallySet) update("quantity_mode", metricUnits.has(unit.trim().toLowerCase()) ? "fractional" : "integer");
          }} maxLength={40} required />
        </label>
        <label>
          Modo de cantidad
          <select value={draft.quantity_mode} onChange={(event) => {
            setQuantityModeManuallySet(true);
            update("quantity_mode", event.target.value as ProductDraft["quantity_mode"]);
          }}>
            <option value="integer">Unidad entera</option>
            <option value="fractional">Fraccionable / peso / medida</option>
          </select>
          <span className="product-field-hint">Las unidades métricas conocidas sugieren modo fraccionable hasta que fijes el modo manualmente.</span>
        </label>
        <label className="product-form-wide">
          Descripción
          <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} maxLength={2000} rows={2} />
        </label>
        <label>
          Precio USD
          <input value={draft.price_usd} onChange={(event) => update("price_usd", normalizeDecimalInput(event.target.value))} inputMode="decimal" autoComplete="off" placeholder="0.00" required />
          <span className="product-field-hint">Ejemplo: 23.85 (hasta 4 decimales si hace falta)</span>
        </label>
        <label>
          Costo USD
          <input value={draft.cost_usd} onChange={(event) => update("cost_usd", normalizeDecimalInput(event.target.value))} inputMode="decimal" autoComplete="off" placeholder="0.00" required />
          <span className="product-field-hint">Ejemplo: 10.50 (hasta 4 decimales si hace falta).</span>
        </label>
        <label>
          Stock mínimo
          <input value={draft.minimum_stock} onChange={(event) => update("minimum_stock", normalizeDecimalInput(event.target.value))} inputMode={draft.quantity_mode === "integer" ? "numeric" : "decimal"} step={draft.quantity_mode === "integer" ? "1" : "0.001"} autoComplete="off" placeholder="0" required={!product} />
          <span className="product-field-hint">{draft.quantity_mode === "integer" ? "Debe ser un número entero." : "Cantidad con hasta 3 decimales."} {product ? "Déjalo vacío para conservar el mínimo actual." : ""}</span>
        </label>
        {product && (
          <label className="product-active-toggle">
            <input type="checkbox" checked={draft.is_active} onChange={(event) => update("is_active", event.target.checked)} />
            Producto activo
          </label>
        )}
        {error && <p className="product-form-error" role="alert">{error}</p>}
        <div className="product-form-actions">
          <button className="product-form-submit" type="submit" disabled={saving}>
            {saving ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
          </button>
        </div>
      </form>
      {scannerOpen && <BarcodeScanner onDetected={(code) => { update("barcode", code); setScannerOpen(false); }} onClose={() => setScannerOpen(false)} />}
    </section>
  );
}
