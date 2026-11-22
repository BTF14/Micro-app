import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { parseNumeric } from "@micro-app/money";
import { apiRequest } from "./auth";
import { formatLocalizedDecimal, normalizeDecimalInput } from "./decimal";
import "./catalog.css";
import BarcodeScanner from "./BarcodeScanner";

type Branch = { id: string; name: string; slug: string };
type Warehouse = { id: string; code: string; name: string; is_active: boolean };
type BalanceItem = {
  product_id: string;
  is_active: boolean;
  sku: string;
  barcode?: string | null;
  name: string;
  unit: string;
  quantity_mode: "integer" | "fractional";
  minimum_stock: string;
  on_hand_quantity: string;
  reserved_quantity: string;
  available_quantity: string;
  cost_usd?: string;
};
type BalancePage = { items: BalanceItem[]; nextCursor: string | null; limit: number };
type ReceiptItem = { id: string; reason: string; created_at: string; line_count: string };

// Quantities and costs remain exact NUMERIC strings; formatting is centralized.
function formatQuantity(value: string): string {
  try { return formatLocalizedDecimal(value, 14, 3, 0); }
  catch { return "No disponible"; }
}

function formatUsd(value: string): string {
  try { return formatLocalizedDecimal(value, 14, 4, 2); }
  catch { return "No disponible"; }
}

function isLowStock(item: BalanceItem): boolean {
  try {
    const minimum = parseNumeric(item.minimum_stock, 14, 3);
    return minimum > 0n && parseNumeric(item.available_quantity, 14, 3) <= minimum;
  } catch {
    return false;
  }
}

export default function InventoryPanel({ organizationId, canManageInventory }: { organizationId: string; canManageInventory: boolean }) {
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [branchId, setBranchId] = useState("");
  const [warehouses, setWarehouses] = useState<Warehouse[] | null>(null);
  const [warehouseId, setWarehouseId] = useState("");
  const [items, setItems] = useState<BalanceItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [receiptReason, setReceiptReason] = useState("");
  const [receiptProductId, setReceiptProductId] = useState("");
  const [receiptQuantity, setReceiptQuantity] = useState("1");
  const [receiptCost, setReceiptCost] = useState("0.00");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [countReason, setCountReason] = useState("");
  const [countProductId, setCountProductId] = useState("");
  const [countQuantity, setCountQuantity] = useState("0");
  const [countBusy, setCountBusy] = useState(false);
  const sequence = useRef(0);

  const base = `/api/orgs/${encodeURIComponent(organizationId)}`;
  const manageableProducts = items.filter((item) => item.is_active);
  const selectedReceiptProduct = manageableProducts.find((item) => item.product_id === receiptProductId) ?? manageableProducts[0];
  const selectedCountProduct = manageableProducts.find((item) => item.product_id === countProductId) ?? manageableProducts[0];

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

  const fetchBalances = useCallback(async (cursor?: string, searchTerm = "") => {
    if (!branchId || !warehouseId) return;
    const requestId = ++sequence.current;
    setLoading(true); setError("");
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) query.set("cursor", cursor);
    if (searchTerm.trim()) query.set("q", searchTerm.trim());
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
    setItems([]); setNextCursor(null); setReceiptProductId(""); setCountProductId("");
    void fetchBalances();
  }, [fetchBalances]);

  const fetchReceipts = useCallback(async () => {
    if (!branchId || !warehouseId) { setReceipts([]); return; }
    try {
      const result = await apiRequest<{ receipts: ReceiptItem[] }>(
        `${base}/branches/${encodeURIComponent(branchId)}/warehouses/${encodeURIComponent(warehouseId)}/receipts`,
      );
      setReceipts(result.receipts);
    } catch (reason) {
      fail(reason, "No se pudieron consultar las recepciones.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, warehouseId, organizationId]);

  useEffect(() => { void fetchReceipts(); }, [fetchReceipts]);

  async function submitReceipt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedProductId = receiptProductId || manageableProducts[0]?.product_id || "";
    if (!branchId || !warehouseId || !selectedProductId) return;
    const quantity = normalizeDecimalInput(receiptQuantity);
    const unitCost = normalizeDecimalInput(receiptCost);
    try {
      const quantityUnits = parseNumeric(quantity, 14, 3);
      if (quantityUnits <= 0n || parseNumeric(unitCost, 14, 4) < 0n) throw new Error("La cantidad debe ser mayor que cero y el costo no puede ser negativo.");
      const selectedProduct = manageableProducts.find((item) => item.product_id === selectedProductId);
      if (selectedProduct?.quantity_mode === "integer" && quantityUnits % 1000n !== 0n) {
        setError("Los productos de unidad entera solo admiten cantidades enteras en la recepción.");
        return;
      }
    } catch {
      setError("Usa una cantidad válida (hasta 3 decimales) y un costo USD válido (hasta 4 decimales).");
      return;
    }
    setReceiptBusy(true); setError(""); setNotice("");
    try {
      const path = `${base}/branches/${encodeURIComponent(branchId)}/warehouses/${encodeURIComponent(warehouseId)}/receipts`;
      const result = await apiRequest<{ id: string; replayed: boolean }>(path, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ reason: receiptReason, lines: [{ product_id: selectedProductId, quantity, unit_cost_usd: unitCost }] }),
      });
      setNotice(result.replayed ? "La recepción ya estaba registrada." : "Recepción registrada y existencias actualizadas.");
      setReceiptReason("");
      await Promise.all([fetchBalances(), fetchReceipts()]);
    } catch (reason) {
      fail(reason, "No se pudo registrar la recepción.");
    } finally { setReceiptBusy(false); }
  }

  async function submitPhysicalCount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedProductId = countProductId || manageableProducts[0]?.product_id || "";
    if (!branchId || !warehouseId || !selectedProductId) return;
    const countedQuantity = normalizeDecimalInput(countQuantity);
    try {
      const quantityUnits = parseNumeric(countedQuantity, 14, 3);
      if (quantityUnits < 0n) throw new Error("El conteo no puede ser negativo.");
      const selectedProduct = manageableProducts.find((item) => item.product_id === selectedProductId);
      if (selectedProduct?.quantity_mode === "integer" && quantityUnits % 1000n !== 0n) {
        setError("Los productos de unidad entera solo admiten cantidades enteras en el conteo.");
        return;
      }
    } catch {
      setError("Usa una cantidad válida de hasta 3 decimales, sin valores negativos.");
      return;
    }
    setCountBusy(true); setError(""); setNotice("");
    try {
      const prefix = `${base}/branches/${encodeURIComponent(branchId)}/warehouses/${encodeURIComponent(warehouseId)}`;
      const created = await apiRequest<{ id: string }>(`${prefix}/counts/physical`, {
        method: "POST",
        headers: { "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ reason: countReason, lines: [{ product_id: selectedProductId, counted_quantity: countedQuantity }] }),
      });
      await apiRequest(`${prefix}/counts/${encodeURIComponent(created.id)}/confirm`, { method: "POST" });
      setNotice("Conteo físico confirmado y existencias actualizadas.");
      setCountReason("");
      await Promise.all([fetchBalances(), fetchReceipts()]);
    } catch (reason) {
      fail(reason, "No se pudo confirmar el conteo físico.");
    } finally { setCountBusy(false); }
  }

  const canReadCosts = items.some((item) => item.cost_usd !== undefined);
  const noBranches = branches !== null && branches.length === 0 && !error;
  const noWarehouses = warehouses !== null && warehouses.length === 0 && !error;

  return (
    <section className="catalog-section" aria-labelledby="inventory-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">EXISTENCIAS</p>
          <h1 id="inventory-title">Inventario</h1>
          <p className="catalog-intro">Consulta de existencias por sucursal y almacén. Las cantidades provienen del libro de movimientos.</p>
        </div>
        <div className="catalog-heading-actions">
          {branches && branches.length > 1 ? (
            <label>
              <span className="product-field-hint">Sucursal </span>
              <select value={branchId} onChange={(event) => { setWarehouseId(""); setBranchId(event.target.value); }} aria-label="Sucursal">
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
          ) : branches && branches.length === 1 ? (
            <span className="product-field-hint" aria-label={`Sucursal: ${branches[0]?.name}`}>
              Sucursal: <strong>{branches[0]?.name}</strong>
            </span>
          ) : null}
          {warehouses && warehouses.length > 1 ? (
            <label>
              <span className="product-field-hint">Almacén </span>
              <select value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} aria-label="Almacén">
                {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
              </select>
            </label>
          ) : warehouses && warehouses.length === 1 ? (
            <span className="product-field-hint" aria-label={`Almacén: ${warehouses[0]?.name}`}>
              Almacén: <strong>{warehouses[0]?.name}</strong>
            </span>
          ) : null}
          <button className="catalog-refresh" type="button" onClick={() => void fetchBalances(undefined, inventorySearch)} disabled={loading || !warehouseId}>
            {loading ? "Actualizando…" : "Actualizar"}
          </button>
        </div>
      </div>

      <form className="catalog-search" role="search" onSubmit={(event) => { event.preventDefault(); setReceiptProductId(""); setCountProductId(""); void fetchBalances(undefined, inventorySearch); }}>
        <label className="catalog-search-label" htmlFor="inventory-quick-search">Buscar en este almacén</label>
        <input id="inventory-quick-search" type="search" enterKeyHint="search" maxLength={120} placeholder="Buscar por nombre, SKU o código de barras…" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} />
        <button className="catalog-search-submit" type="submit" disabled={loading}>Buscar</button>
        <button className="catalog-search-scan" type="button" onClick={() => setScannerOpen(true)} disabled={!warehouseId || loading}>Escanear</button>
        {inventorySearch && <button className="catalog-search-clear" type="button" onClick={() => { setInventorySearch(""); setReceiptProductId(""); setCountProductId(""); void fetchBalances(); }}>Limpiar</button>}
      </form>
      {error && <p className="catalog-error" role="alert">{error}</p>}
      {notice && <p className="catalog-success" role="status">{notice}</p>}
      {canManageInventory && warehouseId && manageableProducts.length > 0 && (
        <div className="inventory-operations">
          <p className="inventory-batch-note">El catálogo y el inventario no tienen un límite total de 1.000 productos. Cada envío o tanda admite hasta 500 productos. Si necesitas registrar más de 500 productos, divídelos en tandas de hasta 500 productos cada una.</p>
          <form className="inventory-operation-form" onSubmit={submitReceipt}>
            <h2>Recibir mercancía</h2>
            <label>Producto
              <select value={receiptProductId || manageableProducts[0]!.product_id} onChange={(event) => setReceiptProductId(event.target.value)}>
                {manageableProducts.map((item) => <option key={item.product_id} value={item.product_id}>{item.name} · {item.sku} · {item.quantity_mode === "fractional" ? "Fraccionable" : "Entero"}</option>)}
              </select>
            </label>
            <label>Cantidad
              <input required inputMode={selectedReceiptProduct?.quantity_mode === "integer" ? "numeric" : "decimal"} step={selectedReceiptProduct?.quantity_mode === "integer" ? "1" : "0.001"} value={receiptQuantity} onChange={(event) => setReceiptQuantity(normalizeDecimalInput(event.target.value))} />
            </label>
            <label>Costo unitario USD
              <input required inputMode="decimal" value={receiptCost} onChange={(event) => setReceiptCost(normalizeDecimalInput(event.target.value))} />
            </label>
            <label>Motivo
              <input required maxLength={500} value={receiptReason} onChange={(event) => setReceiptReason(event.target.value)} />
            </label>
            <button type="submit" disabled={receiptBusy || !receiptReason.trim()}>{receiptBusy ? "Registrando…" : "Registrar recepción"}</button>
          </form>
          <form className="inventory-operation-form" onSubmit={submitPhysicalCount}>
            <h2>Conteo físico / ajuste</h2>
            <label>Producto
              <select value={countProductId || manageableProducts[0]!.product_id} onChange={(event) => setCountProductId(event.target.value)}>
                {manageableProducts.map((item) => <option key={item.product_id} value={item.product_id}>{item.name} · {item.sku}</option>)}
              </select>
            </label>
            <label>Cantidad contada
              <input required inputMode={selectedCountProduct?.quantity_mode === "integer" ? "numeric" : "decimal"} step={selectedCountProduct?.quantity_mode === "integer" ? "1" : "0.001"} value={countQuantity} onChange={(event) => setCountQuantity(normalizeDecimalInput(event.target.value))} />
            </label>
            <label>Motivo
              <input required maxLength={500} value={countReason} onChange={(event) => setCountReason(event.target.value)} />
            </label>
            <button type="submit" disabled={countBusy || !countReason.trim()}>{countBusy ? "Confirmando…" : "Crear y confirmar conteo"}</button>
          </form>
        </div>
      )}
      {canManageInventory && receipts.length > 0 && (
        <section className="inventory-receipt-history" aria-label="Recepciones recientes">
          <h2>Recepciones recientes</h2>
          <ul>{receipts.map((receipt) => <li key={receipt.id}><strong>{receipt.reason}</strong><span>{Number(receipt.line_count) === 1 ? "1 línea" : `${receipt.line_count} líneas`} · {new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(receipt.created_at))}</span></li>)}</ul>
        </section>
      )}

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
          <strong>{inventorySearch ? "No se encontraron productos." : "No hay productos con existencias registradas."}</strong>
          <span>{inventorySearch ? "Prueba con otro nombre, SKU o código de barras." : "Los conteos de apertura y físicos aparecerán aquí una vez confirmados."}</span>
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="catalog-summary">
            <span>{items.length} {items.length === 1 ? "producto cargado" : "productos cargados"}</span>
            <span>Máximo 100 por página</span>
          </div>
          <div className="catalog-table-wrap">
            <table className="catalog-table inventory-table">
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
                    <td data-label="Producto">
                      <strong>{item.name}</strong>
                      <span className="catalog-product-meta">{item.sku}{item.barcode ? ` · ${item.barcode}` : ""}{item.unit ? ` · ${item.unit}` : ""}</span>
                    </td>
                    <td className="catalog-money" data-label="En existencia">{formatQuantity(item.on_hand_quantity)}</td>
                    <td className="catalog-money" data-label="Reservado">{formatQuantity(item.reserved_quantity)}</td>
                    <td className="catalog-money" data-label="Disponible">{formatQuantity(item.available_quantity)}</td>
                    {canReadCosts && (
                      <td className="catalog-money" data-label="Costo USD">{item.cost_usd === undefined ? "—" : `US$ ${formatUsd(item.cost_usd)}`}</td>
                    )}
                    <td data-label="Estado">
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
              <button type="button" className="catalog-load-more" onClick={() => void fetchBalances(nextCursor, inventorySearch)} disabled={loading}>
                {loading ? "Cargando…" : "Cargar más productos"}
              </button>
            </div>
          )}
        </>
      ) : null}
      {scannerOpen && <BarcodeScanner onDetected={(code) => { setScannerOpen(false); setInventorySearch(code); setReceiptProductId(""); setCountProductId(""); void fetchBalances(undefined, code); }} onClose={() => setScannerOpen(false)} />}
    </section>
  );
}
