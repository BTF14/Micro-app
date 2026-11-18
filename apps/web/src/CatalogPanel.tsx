import { useCallback, useEffect, useRef, useState } from "react";
import { convertUsdToVes } from "@micro-app/money";
import { formatLocalizedDecimal } from "./decimal";
import { apiRequest } from "./auth";
import ProductForm from "./ProductForm";
import "./catalog.css";

type ExchangeRateStatus = "current" | "scheduled" | "stale" | "unavailable";

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

function formatUsd(value: string): string {
  try {
    return formatLocalizedDecimal(value, 14, 4, 2);
  } catch {
    return "No disponible";
  }
}

function formatVes(valueUsd: string, rate: string): string {
  try {
    return formatLocalizedDecimal(convertUsdToVes(valueUsd, rate), 16, 2, 2);
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
  const [searchText, setSearchText] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const requestSequence = useRef(0);

  const fetchPage = useCallback(async (cursor?: string, append = false, searchTerm = "") => {
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
    if (searchTerm.trim()) query.set("q", searchTerm.trim());

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
          <button className="catalog-refresh" type="button" onClick={() => void fetchPage(undefined, false, activeSearch)} disabled={loading}>
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
            void fetchPage(undefined, false, activeSearch);
          }}
        />
      )}

      <form className="catalog-search" role="search" onSubmit={(event) => { event.preventDefault(); const term = searchText.trim(); setActiveSearch(term); void fetchPage(undefined, false, term); }}>
        <label className="catalog-search-label" htmlFor="catalog-quick-search">Buscar productos</label>
        <input id="catalog-quick-search" type="search" enterKeyHint="search" maxLength={120} placeholder="Buscar por nombre, SKU o código de barras…" value={searchText} onChange={(event) => setSearchText(event.target.value)} />
        <button className="catalog-search-submit" type="submit" disabled={loading}>Buscar</button>
        {activeSearch && <button className="catalog-search-clear" type="button" onClick={() => { setSearchText(""); setActiveSearch(""); void fetchPage(); }}>Limpiar</button>}
      </form>

      <div className="catalog-summary">
        <span>{items.length} {items.length === 1 ? "producto cargado" : "productos cargados"}</span>
        <span>Máximo 100 por página</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="catalog-empty" role="status">Cargando catálogo…</div>
      ) : !error && items.length === 0 ? (
        <div className="catalog-empty">
          <strong>{activeSearch ? "No se encontraron productos." : "El catálogo todavía está vacío."}</strong>
          <span>{activeSearch ? "Prueba con otro nombre, SKU o código de barras." : "Cuando registres productos, aparecerán aquí con sus precios exactos."}</span>
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
                    <td data-label="Producto">
                      <strong>{item.name}</strong>
                      <span className="catalog-product-meta">{item.sku}{item.barcode ? ` · ${item.barcode}` : ""}{item.unit ? ` · ${item.unit}` : ""}</span>
                    </td>
                    <td data-label="Precio USD" className="catalog-money"><span className="catalog-price-usd">US$ {formatUsd(item.price_usd)}</span></td>
                    <td data-label="Equivalente VES" className="catalog-money">
                      {canConvert ? <span className="catalog-price-ves">Bs. {formatVes(item.price_usd, exchangeRate!)}</span> : <span className="catalog-price-unavailable">Tasa BCV no validada</span>}
                    </td>
                    {canReadCosts && (
                      <td data-label="Costo USD" className="catalog-money">
                        {item.cost_usd === undefined ? "—" : `US$ ${formatUsd(item.cost_usd)}`}
                      </td>
                    )}
                    <td data-label="Estado">
                      <span className={`catalog-product-status ${item.is_active ? "active" : "inactive"}`}>
                        {item.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    {canManage && (
                      <td data-label="Acciones">
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
              <button type="button" className="catalog-load-more" onClick={() => void fetchPage(nextCursor, true, activeSearch)} disabled={loading}>
                {loading ? "Cargando…" : "Cargar más productos"}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
