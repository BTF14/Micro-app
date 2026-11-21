import { useCallback, useEffect, useRef, useState } from "react";
import { convertUsdToVes, parseNumeric } from "@micro-app/money";
import { formatLocalizedDecimal } from "./decimal";
import { apiRequest } from "./auth";
import "./catalog.css";
import BarcodeScanner from "./BarcodeScanner";

type ExchangeRateStatus = "current" | "scheduled" | "stale" | "unavailable";
type Branch = { id: string; name: string; slug: string };
type Warehouse = { id: string; code: string; name: string; is_active: boolean };

export type QuickLookupProduct = {
  product_id: string;
  is_active: boolean;
  sku: string;
  barcode: string | null;
  name: string;
  unit: string;
  quantity_mode: "integer" | "fractional";
  price_usd: string;
  available_quantity: string;
};

type InventoryPage = {
  items: QuickLookupProduct[];
  nextCursor: string | null;
  limit: number;
};

type QuickProductLookupProps = {
  organizationId: string;
  exchangeRate: string | null;
  exchangeRateStatus: ExchangeRateStatus;
  exchangeRateEffectiveDate?: string | null;
  onSelect?: (product: QuickLookupProduct) => void;
  lockedBranchId?: string;
  lockedWarehouseId?: string;
  selectLabel?: string;
  resetSignal?: number;
};

function formatEffectiveDate(value?: string | null): string {
  if (!value) return "una fecha futura";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function formatUsd(value: string): string {
  try {
    return formatLocalizedDecimal(value, 14, 4, 2);
  } catch {
    return "No disponible";
  }
}

function formatVes(value: string, rate: string): string {
  try {
    return formatLocalizedDecimal(convertUsdToVes(value, rate), 16, 2, 2);
  } catch {
    return "No disponible";
  }
}

function isOutOfStock(value: string): boolean {
  try {
    return parseNumeric(value, 14, 3) <= 0n;
  } catch {
    return true;
  }
}

function formatAvailableQuantity(value: string, unit: string): string {
  return `${formatLocalizedDecimal(value, 14, 3, 0)} ${unit}`;
}

export default function QuickProductLookup({
  organizationId,
  exchangeRate,
  exchangeRateStatus,
  exchangeRateEffectiveDate,
  onSelect,
  lockedBranchId,
  lockedWarehouseId,
  selectLabel = "Seleccionar",
  resetSignal = 0,
}: QuickProductLookupProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [branchesLoaded, setBranchesLoaded] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehousesLoaded, setWarehousesLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<QuickLookupProduct[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const requestSequence = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<number | null>(null);
  const previousResetSignal = useRef(resetSignal);
  const skipNextQueryDebounce = useRef<string | null>(null);

  const base = `/api/orgs/${encodeURIComponent(organizationId)}`;
  const warehouseStorageKey = branchId
    ? `micro-app:quick-lookup:warehouse:${organizationId}:${branchId}`
    : "";

  useEffect(() => {
    let active = true;
    setScannerOpen(false);
    setBranches([]);
    setBranchId(lockedBranchId ?? "");
    setBranchesLoaded(false);
    setScannerOpen(false);
    setWarehouses([]);
    setWarehouseId("");
    setWarehousesLoaded(false);
    setItems([]);
    setNextCursor(null);
    setHasSearched(false);
    setError("");

    if (!organizationId) {
      setBranchesLoaded(true);
      return;
    }

    apiRequest<{ branches: Branch[] }>(`${base}/branches`)
      .then((result) => {
        if (!active) return;
        setBranches(result.branches);
        setBranchesLoaded(true);
        if (lockedBranchId) setBranchId(lockedBranchId);
        else if (result.branches.length === 1) setBranchId(result.branches[0]!.id);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setBranchesLoaded(true);
        setError(reason instanceof Error ? reason.message : "No se pudieron consultar las sucursales.");
      });

    return () => {
      active = false;
      requestSequence.current += 1;
    };
  }, [base, lockedBranchId, organizationId]);

  useEffect(() => {
    let active = true;
    setScannerOpen(false);
    setWarehouses([]);
    setWarehouseId("");
    setWarehousesLoaded(false);
    setItems([]);
    setNextCursor(null);
    setHasSearched(false);
    setQuery("");

    if (!branchId) return;

    apiRequest<{ warehouses: Warehouse[] }>(
      `${base}/branches/${encodeURIComponent(branchId)}/warehouses`,
    )
      .then((result) => {
        if (!active) return;
        const activeWarehouses = result.warehouses.filter((warehouse) => warehouse.is_active);
        setWarehouses(activeWarehouses);
        setWarehousesLoaded(true);

        if (lockedWarehouseId) {
          setWarehouseId(activeWarehouses.some((warehouse) => warehouse.id === lockedWarehouseId) ? lockedWarehouseId : "");
        } else if (activeWarehouses.length === 1) {
          setWarehouseId(activeWarehouses[0]!.id);
        } else if (activeWarehouses.length > 1) {
          try {
            const savedWarehouseId = window.localStorage.getItem(
              `micro-app:quick-lookup:warehouse:${organizationId}:${branchId}`,
            );
            if (savedWarehouseId && activeWarehouses.some((warehouse) => warehouse.id === savedWarehouseId)) {
              setWarehouseId(savedWarehouseId);
            }
          } catch {
            // Storage may be disabled by browser privacy settings; selection remains manual.
          }
        }
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setWarehousesLoaded(true);
        setError(reason instanceof Error ? reason.message : "No se pudieron consultar los almacenes.");
      });

    return () => {
      active = false;
      requestSequence.current += 1;
    };
  }, [base, branchId, lockedWarehouseId, organizationId]);

  useEffect(() => {
    if (warehouseStorageKey && warehouses.length > 1 && warehouseId) {
      try {
        window.localStorage.setItem(warehouseStorageKey, warehouseId);
      } catch {
        // The lookup remains usable when persistent storage is unavailable.
      }
    }
  }, [warehouseId, warehouseStorageKey, warehouses.length]);

  const search = useCallback(async (term: string) => {
    const normalizedTerm = term.trim();
    if (!branchId || !warehouseId || !normalizedTerm) return;

    const requestId = ++requestSequence.current;
    setLoading(true);
    setHasSearched(false);
    setError("");
    setItems([]);
    setNextCursor(null);

    const params = new URLSearchParams({
      limit: "30",
      active_only: "true",
      sort: "relevance",
      q: normalizedTerm,
    });

    try {
      const result = await apiRequest<InventoryPage>(
        `${base}/branches/${encodeURIComponent(branchId)}/warehouses/${encodeURIComponent(warehouseId)}/inventory?${params.toString()}`,
      );
      if (requestId !== requestSequence.current) return;
      setItems(result.items);
      setNextCursor(result.nextCursor);
      setHasSearched(true);
    } catch (reason) {
      if (requestId === requestSequence.current) {
        setError(reason instanceof Error ? reason.message : "No se pudo consultar el precio y las existencias.");
      }
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [base, branchId, warehouseId]);

  useEffect(() => {
    if (!warehouseId) return;
    const normalizedTerm = query.trim();

    if (!normalizedTerm) {
      requestSequence.current += 1;
      setItems([]);
      setNextCursor(null);
      setHasSearched(false);
      setLoading(false);
      setError("");
      return;
    }

    if (skipNextQueryDebounce.current !== null) {
      const isScannedValue = skipNextQueryDebounce.current === normalizedTerm;
      skipNextQueryDebounce.current = null;
      if (isScannedValue) return;
    }

    const timer = window.setTimeout(() => {
      debounceTimer.current = null;
      void search(normalizedTerm);
    }, 200);
    debounceTimer.current = timer;

    return () => {
      window.clearTimeout(timer);
      if (debounceTimer.current === timer) debounceTimer.current = null;
      requestSequence.current += 1;
    };
  }, [query, search, warehouseId]);

  const clearSearch = () => {
    setScannerOpen(false);
    skipNextQueryDebounce.current = null;
    if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    requestSequence.current += 1;
    setQuery("");
    setItems([]);
    setNextCursor(null);
    setHasSearched(false);
    setError("");
    setLoading(false);
  };

  useEffect(() => {
    if (previousResetSignal.current !== resetSignal) {
      previousResetSignal.current = resetSignal;
      clearSearch();
    }
  }, [resetSignal]);
  const selectBranch = (value: string) => {
    setScannerOpen(false);
    requestSequence.current += 1;
    setBranchId(value);
    setWarehouseId("");
    clearSearch();
  };

  const selectWarehouse = (value: string) => {
    setScannerOpen(false);
    requestSequence.current += 1;
    setWarehouseId(value);
    clearSearch();
  };

  useEffect(() => {
    if (warehouseId) searchInputRef.current?.focus();
  }, [warehouseId]);

  const handleScannedBarcode = (scannedCode: string) => {
    setScannerOpen(false);
    if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
    debounceTimer.current = null;
    skipNextQueryDebounce.current = query.trim() === scannedCode.trim() ? null : scannedCode.trim();
    setHasSearched(false);
    setQuery(scannedCode);
    void search(scannedCode);
    searchInputRef.current?.focus();
  };

  const canConvert = exchangeRateStatus === "current" && exchangeRate !== null;

  return (
    <section className="catalog-section quick-lookup" aria-labelledby="quick-lookup-title">
      <div className="catalog-heading">
        <div>
          <p className="eyebrow">CONSULTA DE MOSTRADOR</p>
          <h1 id="quick-lookup-title">Consultar precio</h1>
          <p className="catalog-intro">
            Busca por nombre, SKU o código de barras y consulta precio y disponibilidad en un único almacén.
          </p>
        </div>
      </div>

      {!lockedBranchId && branches.length > 1 && (
        <label className="quick-lookup-scope">
          Sucursal
          <select value={branchId} onChange={(event) => selectBranch(event.target.value)}>
            <option value="">Selecciona una sucursal</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        </label>
      )}
      {!lockedBranchId && branches.length === 1 && (
        <p className="quick-lookup-context">Sucursal: <strong>{branches[0]!.name}</strong></p>
      )}
      {!lockedWarehouseId && branchId && warehouses.length > 1 && (
        <label className="quick-lookup-scope">
          Almacén
          <select value={warehouseId} onChange={(event) => selectWarehouse(event.target.value)}>
            <option value="">Selecciona un almacén</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
            ))}
          </select>
        </label>
      )}
      {!lockedWarehouseId && branchId && warehouses.length === 1 && (
        <p className="quick-lookup-context">Almacén: <strong>{warehouses[0]!.name}</strong></p>
      )}

      {error && <p className="catalog-error" role="alert">{error}</p>}
      {!branchesLoaded && <p className="quick-lookup-status" role="status">Cargando sucursales…</p>}
      {!lockedBranchId && branchesLoaded && branches.length === 0 && !error && (
        <div className="catalog-empty">
          <strong>No tienes sucursales asignadas.</strong>
          <span>Solicita acceso a una sucursal para consultar productos.</span>
        </div>
      )}
      {branchId && !warehousesLoaded && (
        <p className="quick-lookup-status" role="status">Cargando almacenes activos…</p>
      )}
      {branchId && warehousesLoaded && warehouses.length === 0 && !error && (
        <div className="catalog-empty">
          <strong>Esta sucursal no tiene almacenes activos.</strong>
          <span>Solicita que habiliten un almacén.</span>
        </div>
      )}

      <form
        className="quick-lookup-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (debounceTimer.current !== null) window.clearTimeout(debounceTimer.current);
          debounceTimer.current = null;
          void search(query);
        }}
      >
        <label htmlFor="quick-product-search">Buscar producto</label>
        <div className="quick-lookup-input-row">
          <input
            id="quick-product-search"
            ref={searchInputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            maxLength={120}
            placeholder="Escanea un código o escribe nombre / SKU"
            value={query}
            disabled={!warehouseId}
            onChange={(event) => { setHasSearched(false); setQuery(event.target.value); }}
            onKeyDown={(event) => {
              if (event.key === "Escape") clearSearch();
            }}
          />
          <button type="button" className="quick-lookup-scan-button" disabled={!warehouseId}
            aria-haspopup="dialog" aria-expanded={scannerOpen} onClick={() => setScannerOpen(true)}>
            Escanear
          </button>
          {query && (
            <button type="button" className="catalog-search-clear" onClick={clearSearch}>
              Limpiar
            </button>
          )}
        </div>
      </form>

      {scannerOpen && <BarcodeScanner onDetected={handleScannedBarcode} onClose={() => setScannerOpen(false)} />}

      {loading && <p className="quick-lookup-status" role="status">Buscando productos…</p>}
      {!loading && hasSearched && !error && query.trim() && items.length === 0 && (
        <p className="quick-lookup-status" role="status">No se encontraron productos activos.</p>
      )}

      {items.length > 0 && (
        <div className="quick-lookup-results" aria-live="polite">
          {items.map((item) => {
            const outOfStock = isOutOfStock(item.available_quantity);
            return (
              <article className="quick-lookup-result" key={item.product_id}>
                <div className="quick-lookup-product">
                  <strong>{item.name}</strong>
                  <span>{item.sku}{item.barcode ? ` · ${item.barcode}` : ""}</span>
                </div>
                <div className="quick-lookup-prices">
                  <strong>US$ {formatUsd(item.price_usd)}</strong>
                  {canConvert ? (
                    <span>Bs. {formatVes(item.price_usd, exchangeRate!)}</span>
                  ) : (
                    <span className="catalog-price-unavailable">
                      {exchangeRateStatus === "stale"
                        ? "Tasa BCV desactualizada; conversión suspendida"
                        : exchangeRateStatus === "scheduled"
                          ? `Tasa BCV publicada para ${formatEffectiveDate(exchangeRateEffectiveDate)}; aún no aplica`
                          : "Tasa BCV no disponible; conversión suspendida"}
                    </span>
                  )}
                </div>
                <div className="quick-lookup-stock">
                  <strong className={outOfStock ? "out" : ""}>
                    {outOfStock ? `Agotado · ${formatAvailableQuantity(item.available_quantity, item.unit)}` : formatAvailableQuantity(item.available_quantity, item.unit)}
                  </strong>
                  {!outOfStock && <span>{item.quantity_mode === "fractional" ? "Fraccionable" : "Unidad entera"} · Disponible</span>}
                </div>
                {onSelect && (
                  <button type="button" className="catalog-edit" onClick={() => onSelect(item)}>
                    {selectLabel}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      )}

      {nextCursor !== null && (
        <p className="quick-lookup-more">Hay más coincidencias. Afina la búsqueda para encontrar el producto.</p>
      )}
    </section>
  );
}
