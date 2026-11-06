import { useCallback, useEffect, useRef, useState } from "react";
import { convertUsdToVes, formatDecimal, parseNumeric } from "@micro-app/money";
import { apiRequest } from "./auth";
import ProductForm from "./ProductForm";
import "./catalog.css";

type ExchangeRateStatus = "current" | "stale" | "unavailable";

type CatalogProduct = {
  id: string;
  is_active: boolean;
  sku: string;
  barcode: string | null;
  name: string;
  description: string | null;
  unit: string;
  price_usd: string;
  cost_usd?: string;
};

type CatalogResponse = {
  items: CatalogProduct[];
  nextCursor: string | null;
  limit: number;
};

type CatalogPanelProps = {
  organizationId: string;
  exchangeRate: string | null;
  exchangeRateStatus: ExchangeRateStatus;
  canManage: boolean;
};

function formatLocalizedDecimal(value: string): string {
  const [integerPart, fractionPart] = value.split(".");
  const grouped = (integerPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fractionPart ? `${grouped},${fractionPart}` : grouped;
}

function formatUsd(value: string): string {
  try {
    return formatLocalizedDecimal(formatDecimal(parseNumeric(value, 14, 4), 4, 2));
  } catch {
    return "No disponible";
  }
}

function formatVes(valueUsd: string, rate: string): string {
  try {
    return formatLocalizedDecimal(convertUsdToVes(valueUsd, rate));
  } catch {
    return "—";
  }
}

export default function CatalogPanel({
  organizationId,
  exchangeRate,
  exchangeRateStatus,
  canManage,
}: CatalogPanelProps) {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const requestSequence = useRef(0);

  const fetchPage = useCallback(async (cursor?: string, append = false) => {
    const requestId = ++requestSequence.current;
    if (!organizationId) {
      setItems([]);
      setNextCursor(null);
      setError("No hay una organización activa para consultar el catálogo.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("cursor", cursor);

    try {
      const result = await apiRequest<CatalogResponse>(
        `/api/orgs/${encodeURIComponent(organizationId)}/catalog?${query.toString()}`,
      );
      if (requestId !== requestSequence.current) return;
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setNextCursor(result.nextCursor);
    } catch (reason) {
      if (requestId === requestSequence.current) {
        setError(reason instanceof Error ? reason.message : "No se pudo consultar el catálogo.");
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    setItems([]);
    setNextCursor(null);
    void fetchPage();
    return () => { requestSequence.current += 1; };
  }, [fetchPage]);

  const canConvert = exchangeRateStatus === "current" && exchangeRate !== null;
  const canReadCosts = items.some((item) => item.cost_usd !== undefined);

  return (
    <section className="catalog-section" aria-labelledby="catalog-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">GESTIÓN DE PRODUCTOS</p>
          <h1 id="catalog-title">Catálogo</h1>
          <p className="catalog-intro">Precios base en USD. La equivalencia en bolívares solo aparece cuando hay una tasa BCV vigente y validada.</p>
        </div>
        <div className="catalog-heading-actions">
          {canManage && (
            <button className="catalog-create" type="button" onClick={() => { setEditingProduct(null); setShowCreateForm(true); }}>
              Nuevo producto
            </button>
          )}
          <button className="catalog-refresh" type="button" onClick={() => void fetchPage()} disabled={loading}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {exchangeRateStatus === "stale" && (
        <p className="catalog-rate-warning" role="status">
          La última tasa BCV está desactualizada. La conversión a VES está suspendida hasta validar una tasa vigente.
        </p>
      )}
      {exchangeRateStatus === "unavailable" && (
        <p className="catalog-rate-warning" role="status">
          No hay una tasa BCV validada. Se muestran los precios base en USD sin inventar conversiones.
        </p>
      )}
      {error && <p className="catalog-error" role="alert">{error}</p>}

      {canManage && (showCreateForm || editingProduct) && (
        <ProductForm
          key={editingProduct?.id ?? "new"}
          organizationId={organizationId}
          product={editingProduct ?? undefined}
          onCancel={() => { setShowCreateForm(false); setEditingProduct(null); }}
          onSaved={() => {
            setShowCreateForm(false);
            setEditingProduct(null);
            void fetchPage();
          }}
        />
      )}

      <div className="catalog-summary">
        <span>{items.length} {items.length === 1 ? "producto cargado" : "productos cargados"}</span>
        <span>Máximo 100 por página</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="catalog-empty" role="status">Cargando catálogo…</div>
      ) : !error && items.length === 0 ? (
        <div className="catalog-empty">
          <strong>El catálogo todavía está vacío.</strong>
          <span>Cuando registres productos, aparecerán aquí con sus precios exactos.</span>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="catalog-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col">Precio USD</th>
                  <th scope="col">Equivalente VES</th>
                  {canReadCosts && <th scope="col">Costo USD</th>}
                  <th scope="col">Estado</th>
                  {canManage && <th scope="col">Acciones</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span className="catalog-product-meta">{item.sku}{item.unit ? ` · ${item.unit}` : ""}</span>
                    </td>
                    <td className="catalog-money">US$ {formatUsd(item.price_usd)}</td>
                    <td className="catalog-money">
                      {canConvert ? `Bs. ${formatVes(item.price_usd, exchangeRate!)}` : "—"}
                    </td>
                    {canReadCosts && (
                      <td className="catalog-money">
                        {item.cost_usd === undefined ? "—" : `US$ ${formatUsd(item.cost_usd)}`}
                      </td>
                    )}
                    <td>
                      <span className={`catalog-product-status ${item.is_active ? "active" : "inactive"}`}>
                        {item.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <button
                          className="catalog-edit"
                          type="button"
                          onClick={() => { setShowCreateForm(false); setEditingProduct(item); }}
                        >
                          Editar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextCursor && (
            <div className="catalog-pagination">
              <button type="button" className="catalog-load-more" onClick={() => void fetchPage(nextCursor, true)} disabled={loading}>
                {loading ? "Cargando…" : "Cargar más productos"}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
