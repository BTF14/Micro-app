import { useCallback, useEffect, useRef, useState } from "react";
import { formatDecimal, parseNumeric } from "@micro-app/money";
import { apiRequest } from "./auth";
import "./catalog.css";

type Branch = { id: string; name: string; slug: string };
type Warehouse = { id: string; code: string; name: string; is_active: boolean };
type BalanceItem = {
  product_id: string;
  is_active: boolean;
  sku: string;
  name: string;
  unit: string;
  minimum_stock: string;
  on_hand_quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  cost_usd?: string;
};
type BalancePage = { items: BalanceItem[]; nextCursor: string | null; limit: number };

function groupThousands(value: string): string {
  const [integerPart, fractionPart] = value.split(".");
  const grouped = (integerPart ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fractionPart ? `${grouped},${fractionPart}` : grouped;
}

// Quantities are numeric(14,3) strings from the API; never use floats.
function formatQuantity(value: string): string {
  try {
    return groupThousands(formatDecimal(parseNumeric(value, 14, 3), 3, 0));
  } catch {
    return "No disponible";
  }
}

function formatUsd(value: string): string {
  try {
    return groupThousands(formatDecimal(parseNumeric(value, 14, 4), 4, 2));
  } catch {
    return "No disponible";
  }
}

function isLowStock(item: BalanceItem): boolean {
  try {
    const minimum = parseNumeric(item.minimum_stock, 14, 3);
    return minimum > 0n && parseNumeric(item.available_quantity, 14, 3) <= minimum;
  } catch {
    return false;
  }
}

export default function InventoryPanel({ organizationId }: { organizationId: string }) {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [branchId, setBranchId] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const sequence = useRef(0);

  const base = `/api/orgs/${encodeURIComponent(organizationId)}`;
  const fail = (reason: unknown, fallback: string) => setError(reason instanceof Error ? reason.message : fallback);

  useEffect(() => {
    const requestId = ++sequence.current;
    setBranches(null); setBranchId(""); setWarehouses(null); setWarehouseId(""); setItems([]); setNextCursor(null);
    setError("");
    if (!organizationId) {
      setBranches([]); setLoading(false);
      return;
    }
    setLoading(true);
    apiRequest<{ branches: Branch[] }>(`${base}/branches`)
      .then((result) => {
        if (requestId !== sequence.current) return;
        setBranches(result.branches);
        setBranchId(result.branches[0]?.id ?? "");
        if (result.branches.length === 0) setLoading(false);
      })
      .catch((reason: unknown) => {
        if (requestId !== sequence.current) return;
        fail(reason, "No se pudieron consultar las sucursales.");
        setBranches([]); setLoading(false);
      });
    return () => { sequence.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  useEffect(() => {
    if (!branchId) return;
    const requestId = ++sequence.current;
    setWarehouses(null); setWarehouseId(""); setItems([]); setNextCursor(null); setError(""); setLoading(true);
    apiRequest<{ warehouses: Warehouse[] }>(`${base}/branches/${encodeURIComponent(branchId)}/warehouses`)
      .then((result) => {
        if (requestId !== sequence.current) return;
        const active = result.warehouses.filter((warehouse) => warehouse.is_active);
        setWarehouses(active);
        setWarehouseId(active[0]?.id ?? "");
        if (active.length === 0) setLoading(false);
      })
      .catch((reason: unknown) => {
        if (requestId !== sequence.current) return;
        fail(reason, "No se pudieron consultar los almacenes.");
        setWarehouses([]); setLoading(false);
      });
    return () => { sequence.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  const fetchBalances = useCallback(async (cursor?: string) => {
    if (!branchId || !warehouseId) return;
    const requestId = ++sequence.current;
    setLoading(true); setError("");
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("cursor", cursor);
    try {
      const result = await apiRequest<BalancePage>(
        `${base}/branches/${encodeURIComponent(branchId)}/warehouses/${encodeURIComponent(warehouseId)}/inventory?${query.toString()}`,
      );
      if (requestId !== sequence.current) return;
      setItems((current) => cursor ? [...current, ...result.items] : result.items);
      setNextCursor(result.nextCursor);
    } catch (reason) {
      if (requestId === sequence.current) fail(reason, "No se pudo consultar el inventario.");
    } finally {
      if (requestId === sequence.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, warehouseId, organizationId]);

  useEffect(() => {
    setItems([]); setNextCursor(null);
    void fetchBalances();
  }, [fetchBalances]);

  const canReadCosts = items.some((item) => item.cost_usd !== undefined);
  const noBranches = branches !== null && branches.length === 0 && !error;
  const noWarehouses = warehouses !== null && warehouses.length === 0 && !error;

  return (
    <section className="catalog-section" aria-labelledby="inventory-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">EXISTENCIAS</p>
          <h1 id="inventory-title">Inventario</h1>
          <p className="catalog-intro">Consulta de existencias por sucursal y almacén. Es una vista de solo lectura: las cantidades provienen del libro de movimientos.</p>
        </div>
        <div className="catalog-heading-actions">
          {branches && branches.length > 1 && (
            <label>
              <span className="product-field-hint">Sucursal </span>
              <select value={branchId} onChange={(event) => { setWarehouseId(""); setBranchId(event.target.value); }} aria-label="Sucursal">
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
          )}
          {warehouses && warehouses.length > 1 && (
            <label>
              <span className="product-field-hint">Almacén </span>
              <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} aria-label="Almacén">
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </label>
          )}
          <button className="catalog-refresh" type="button" onClick={() => void fetchBalances()} disabled={loading || !warehouseId}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      {error && <p className="catalog-error" role="alert">{error}</p>}

      {noBranches ? (
        <div className="catalog-empty">
          <strong>No tienes sucursales asignadas.</strong>
          <span>Pide al administrador que te asigne a una sucursal para consultar existencias.</span>
        </div>
      ) : noWarehouses ? (
        <div className="catalog-empty">
          <strong>Esta sucursal todavía no tiene almacenes activos.</strong>
          <span>Cuando se configure un almacén, sus existencias aparecerán aquí.</span>
        </div>
      ) : loading && items.length === 0 ? (
        <div className="catalog-empty" role="status">Cargando inventario…</div>
      ) : !error && warehouseId && items.length === 0 ? (
        <div className="catalog-empty">
          <strong>No hay productos con existencias registradas.</strong>
          <span>Los conteos de apertura y físicos aparecerán aquí una vez confirmados.</span>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="catalog-summary">
            <span>{items.length} {items.length === 1 ? "producto cargado" : "productos cargados"}</span>
            <span>Máximo 100 por página</span>
          </div>
          <div className="catalog-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th scope="col">Producto</th>
                  <th scope="col">En existencia</th>
                  <th scope="col">Reservado</th>
                  <th scope="col">Disponible</th>
                  {canReadCosts && <th scope="col">Costo USD</th>}
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.product_id}>
                    <td>
                      <strong>{item.name}</strong>
                      <span className="catalog-product-meta">{item.sku}{item.unit ? ` · ${item.unit}` : ""}</span>
                    </td>
                    <td className="catalog-money">{formatQuantity(item.on_hand_quantity)}</td>
                    <td className="catalog-money">{formatQuantity(item.reserved_quantity)}</td>
                    <td className="catalog-money">{formatQuantity(item.available_quantity)}</td>
                    {canReadCosts && (
                      <td className="catalog-money">{item.cost_usd === undefined ? "—" : `US$ ${formatUsd(item.cost_usd)}`}</td>
                    )}
                    <td>
                      {!item.is_active ? (
                        <span className="catalog-product-status inactive">Inactivo</span>
                      ) : isLowStock(item) ? (
                        <span className="catalog-product-status inactive">Stock bajo</span>
                      ) : (
                        <span className="catalog-product-status active">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {nextCursor && (
            <div className="catalog-pagination">
              <button type="button" className="catalog-load-more" onClick={() => void fetchBalances(nextCursor)} disabled={loading}>
                {loading ? "Cargando…" : "Cargar más productos"}
              </button>
            </div>
          )}
        </>
      ) : null}
    </section>
  );
}
