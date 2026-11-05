import { useState, type FormEvent } from "react";
import { parseNumeric } from "@micro-app/money";
import { apiRequest } from "./auth";

type CatalogProduct = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
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
    cost_usd: product?.cost_usd ?? "0.0000",
    price_usd: product?.price_usd ?? "",
    minimum_stock: "0.000",
    is_active: product?.is_active ?? true,
  };
}

export default function ProductForm({ organizationId, product, onCancel, onSaved }: ProductFormProps) {
  const [draft, setDraft] = useState<ProductDraft>(() => initialDraft(product));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

    try {
      const cost = parseNumeric(draft.cost_usd, 14, 4);
      const price = parseNumeric(draft.price_usd, 14, 4);
      const minimumStock = parseNumeric(draft.minimum_stock, 14, 3);
      if (cost < 0n || price < 0n || minimumStock < 0n) {
        setError("Los costos, precios y mínimos de inventario no pueden ser negativos.");
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
      cost_usd: draft.cost_usd,
      price_usd: draft.price_usd,
      minimum_stock: draft.minimum_stock,
      ...(product ? { is_active: draft.is_active } : {}),
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
          <input value={draft.barcode} onChange={(event) => update("barcode", event.target.value)} maxLength={128} />
        </label>
        <label>
          Unidad
          <input value={draft.unit} onChange={(event) => update("unit", event.target.value)} maxLength={40} required />
        </label>
        <label className="product-form-wide">
          Descripción
          <textarea value={draft.description} onChange={(event) => update("description", event.target.value)} maxLength={2000} rows={2} />
        </label>
        <label>
          Precio USD
          <input value={draft.price_usd} onChange={(event) => update("price_usd", event.target.value)} inputMode="decimal" autoComplete="off" placeholder="0.0000" required />
          <span className="product-field-hint">Hasta 4 decimales. Ejemplo: 23.8500</span>
        </label>
        <label>
          Costo USD
          <input value={draft.cost_usd} onChange={(event) => update("cost_usd", event.target.value)} inputMode="decimal" autoComplete="off" placeholder="0.0000" required />
          <span className="product-field-hint">Hasta 4 decimales.</span>
        </label>
        <label>
          Stock mínimo
          <input value={draft.minimum_stock} onChange={(event) => update("minimum_stock", event.target.value)} inputMode="decimal" autoComplete="off" placeholder="0.000" required />
          <span className="product-field-hint">Cantidad con hasta 3 decimales.</span>
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
          <button className="product-editor-cancel" type="button" onClick={onCancel} disabled={saving}>Cancelar</button>
        </div>
      </form>
    </section>
  );
}
