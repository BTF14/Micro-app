import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  calculateLineUsd,
  convertUsdToVes,
  formatNumeric,
  parseNumeric,
  sumNumeric,
} from "@micro-app/money";
import { apiRequest } from "./auth";
import { formatLocalizedDecimal, normalizeDecimalInput } from "./decimal";
import QuickProductLookup, { type QuickLookupProduct } from "./QuickProductLookup";
import "./sales-panel.css";

type Currency = "USD" | "VES";
type PaymentMethod = "cash" | "card" | "transfer" | "mobile_payment" | "other";
type ExchangeRateStatus = "current" | "scheduled" | "stale" | "unavailable";
type Shift = { shift_id?: string; id?: string; branch_id: string; branch_name?: string; register_name?: string; opened_at?: string };
type Warehouse = { id: string; name: string; code: string; is_active: boolean };
type FxPanelState = { commercial_enabled: boolean; authorization: { id: string; rate: string; expires_at: string } | null };
type CartLine = { product: QuickLookupProduct; quantity: string; quantityInput: string; quantityValid: boolean };
type PaymentLine = { id: string; method: PaymentMethod; amount: string; reference: string };
type SaleLineReceipt = { product_name_snapshot: string; sku_snapshot: string; unit_snapshot: string; quantity_mode_snapshot: "integer" | "fractional"; quantity: string; unit_price_usd: string; line_total_usd: string; line_total_ves: string };
type SalePaymentReceipt = { method: PaymentMethod; currency: Currency; amount: string; reference: string | null };
type SaleReceipt = {
  sale_number: string; created_at: string; currency: Currency; subtotal_usd: string;
  total_usd: string; total_ves: string; bcv_rate: string | null; fx_rate: string;
  fx_source: 'bcv_official' | 'manual_contingency'; fx_receipt_label: string;
  fx_authorization_id: string | null; operation_date: string | null; exchange_rate_effective_date: string | null;
  lines: SaleLineReceipt[]; payments: SalePaymentReceipt[];
};

type SalesPanelProps = {
  organizationId: string;
  exchangeRate: string | null;
  exchangeRateStatus: ExchangeRateStatus;
  exchangeRateEffectiveDate?: string | null;
  onGoToRegister: () => void;
  onRefreshRate?: () => Promise<void> | void;
};

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "cash", label: "Efectivo" },
  { value: "card", label: "Tarjeta / Punto" },
  { value: "transfer", label: "Transferencia" },
  { value: "mobile_payment", label: "Pago móvil" },
  { value: "other", label: "Otro" },
];

function localized(value: string, precision = 14, scale = 2, minFractionDigits = 2): string {
  try { return formatLocalizedDecimal(value, precision, scale, minFractionDigits); }
  catch { return "—"; }
}
function usd(value: string): string { return `US$ ${localized(value, 14, 4)}`; }
function ves(value: string): string { return `Bs. ${localized(value, 16, 2)}`; }
function formatEffectiveDate(value?: string | null): string {
  if (!value) return "una fecha futura";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
function dateTime(value: string): string {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(value));
}
function quantityUnits(value: string): bigint {
  return parseNumeric(value, 14, 3);
}
function paymentScale(currency: Currency): { precision: number; scale: number } {
  return currency === "USD" ? { precision: 14, scale: 4 } : { precision: 14, scale: 2 };
}
function newIdempotencyKey(): string { return crypto.randomUUID(); }
let paymentLineSequence = 0;
function nextPaymentLineId(): string { paymentLineSequence += 1; return `payment-${paymentLineSequence}`; }

export default function SalesPanel({
  organizationId, exchangeRate, exchangeRateStatus, exchangeRateEffectiveDate, onGoToRegister, onRefreshRate,
}: SalesPanelProps) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [shiftLoaded, setShiftLoaded] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseLoaded, setWarehouseLoaded] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const cartRef = useRef<CartLine[]>([]);
  const [currency, setCurrency] = useState<Currency>("USD");
  const [payments, setPayments] = useState<PaymentLine[]>(() => [{ id: nextPaymentLineId(), method: "cash", amount: "", reference: "" }]);
  const [loading, setLoading] = useState(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);
  const [fxState, setFxState] = useState<FxPanelState | null>(null);
  const [manualFxAcknowledgedRate, setManualFxAcknowledgedRate] = useState<string | null>(null);
  const [lookupReset, setLookupReset] = useState(0);
  const idempotencyKey = useRef(newIdempotencyKey());
  const requestFingerprint = useRef<string | null>(null);
  const loadSequence = useRef(0);
  const prevOrgRef = useRef(organizationId);
  const prevBranchRef = useRef<string | null>(null);

  const base = `/api/orgs/${encodeURIComponent(organizationId)}`;
  const bcvAvailable = exchangeRateStatus === "current" && exchangeRate !== null;
  const activeManualFx = fxState?.commercial_enabled === true && fxState.authorization &&
    new Date(fxState.authorization.expires_at).getTime() > Date.now() ? fxState.authorization : null;
  const usingManualFx = !bcvAvailable && activeManualFx !== null;
  const manualFxAcknowledged = activeManualFx !== null && usingManualFx && manualFxAcknowledgedRate === activeManualFx.rate;
  const effectiveRate = bcvAvailable ? exchangeRate : activeManualFx !== null && usingManualFx ? activeManualFx.rate : null;
  const canConvert = effectiveRate !== null;

  const computed = useMemo(() => {
    if (cart.length === 0) {
      return { lines: [] as Array<CartLine & { lineUsd: string; lineVes: string }>, subtotalUsd: "0.0000", totalVes: canConvert ? "0.00" : null as string | null };
    }
    const lines = cart.map((line) => {
      const lineUsd = calculateLineUsd(line.quantity, line.product.price_usd);
      const lineVes = canConvert && effectiveRate ? convertUsdToVes(lineUsd, effectiveRate) : "";
      return { ...line, lineUsd, lineVes };
    });
    return {
      lines,
      subtotalUsd: sumNumeric(lines.map((line) => line.lineUsd), 14, 4),
      totalVes: canConvert && effectiveRate ? sumNumeric(lines.map((line) => line.lineVes), 16, 2) : null,
    };
  }, [cart, canConvert, effectiveRate]);

  const expectedPayment = currency === "USD" ? computed.subtotalUsd : computed.totalVes ?? "0.00";
  const paymentTotal = useMemo(() => {
    const { precision, scale } = paymentScale(currency);
    try { return sumNumeric(payments.filter((p) => p.amount.trim() !== "").map((p) => p.amount), precision, scale); } catch { return currency === "USD" ? "0.0000" : "0.00"; }
  }, [currency, payments]);
  const paymentMatches = useMemo(() => {
    try {
      const { precision, scale } = paymentScale(currency);
      if (currency === "VES" && computed.totalVes === null) return false;
      const total = parseNumeric(paymentTotal, precision, scale);
      const expected = currency === "USD"
        ? parseNumeric(computed.subtotalUsd, 14, 4)
        : parseNumeric(computed.totalVes!, 16, 2);
      return total === expected && expected > 0n && payments.every((p) => {
        try { return parseNumeric(p.amount, precision, scale) > 0n && p.reference.length <= 128 && !/[\u0000-\u001F\u007F]/.test(p.reference); }
        catch { return false; }
      });
    } catch { return false; }
  }, [computed.subtotalUsd, computed.totalVes, currency, paymentTotal, payments]);

  const commitCart = (next: CartLine[]) => { cartRef.current = next; setCart(next); };

  const resetIdempotency = () => {
    idempotencyKey.current = newIdempotencyKey();
    requestFingerprint.current = null;
  };

  const loadShiftAndWarehouses = useCallback(async () => {
    const requestId = ++loadSequence.current;
    setLoading(true);
    setError("");
    setNotice("");
    setShiftLoaded(false);
    setWarehouseLoaded(false);
    try {
      const result = await apiRequest<{ shift: Shift | null }>(`${base}/register-shifts/current`);
      if (requestId !== loadSequence.current) return;
      const nextBranchId = result.shift?.branch_id ?? null;
      if (prevBranchRef.current !== null && prevBranchRef.current !== nextBranchId) {
        const hadCart = cartRef.current.length > 0;
        commitCart([]);
        setReceipt(null);
        setFxState(null);
        setManualFxAcknowledgedRate(null);
        setCurrency("USD");
        setPayments([{ id: nextPaymentLineId(), method: "cash", amount: "", reference: "" }]);
        setLookupReset((value) => value + 1);
        resetIdempotency();
        if (hadCart) setNotice("Cambió la sucursal o el turno activo. Se limpió el carrito.");
      }
      prevBranchRef.current = nextBranchId;
      setShift(result.shift);
      setShiftLoaded(true);
      setWarehouses([]);
      setWarehouseId("");
      if (!result.shift) {
        setWarehouseLoaded(true);
        return;
      }
      const warehouseResult = await apiRequest<{ warehouses: Warehouse[] }>(
        `${base}/branches/${encodeURIComponent(result.shift.branch_id)}/warehouses`,
      );
      if (exchangeRateStatus !== "current" || !exchangeRate) {
        const fxResult = await apiRequest<FxPanelState>(
          `${base}/branches/${encodeURIComponent(result.shift.branch_id)}/fx-contingency`,
        );
        if (requestId !== loadSequence.current) return;
        setFxState(fxResult ?? null);
      } else {
        setFxState(null);
      }
      setManualFxAcknowledgedRate(null);
      if (requestId !== loadSequence.current) return;
      const active = warehouseResult.warehouses.filter((warehouse) => warehouse.is_active === true);
      setWarehouses(active);
      setWarehouseLoaded(true);
      if (active.length === 1) setWarehouseId(active[0]!.id);
      else if (active.length > 1) {
        let saved = "";
        try {
          saved = window.localStorage.getItem(`micro-app:sales:warehouse:${organizationId}:${result.shift.branch_id}`) ?? "";
        } catch { /* Selection remains manual when storage is blocked. */ }
        setWarehouseId(active.some((warehouse) => warehouse.id === saved) ? saved : "");
      }
    } catch (reason) {
      if (requestId !== loadSequence.current) return;
      setShiftLoaded(true);
      setWarehouseLoaded(true);
      setError(reason instanceof Error ? reason.message : "No se pudo consultar el turno y los almacenes.");
    } finally {
      if (requestId === loadSequence.current) setLoading(false);
    }
  }, [base, organizationId, exchangeRateStatus, exchangeRate]);

  useEffect(() => {
    if (prevOrgRef.current !== organizationId) {
      prevOrgRef.current = organizationId;
      prevBranchRef.current = null;
      commitCart([]);
      setReceipt(null);
      setCurrency("USD");
      setPayments([{ id: nextPaymentLineId(), method: "cash", amount: "", reference: "" }]);
      resetIdempotency();
    }
    void loadShiftAndWarehouses();
  }, [loadShiftAndWarehouses, organizationId]);

  useEffect(() => {
    if (shift?.branch_id && warehouses.length > 1 && warehouseId) {
      try {
        window.localStorage.setItem(`micro-app:sales:warehouse:${organizationId}:${shift.branch_id}`, warehouseId);
      } catch { /* POS remains usable without persistent selection. */ }
    }
  }, [organizationId, shift?.branch_id, warehouseId, warehouses.length]);

  function changeWarehouse(nextId: string) {
    if (nextId === warehouseId) return;
    setWarehouseId(nextId);
    if (cart.length > 0) {
      commitCart([]);
      setPayments([{ id: nextPaymentLineId(), method: "cash", amount: "", reference: "" }]);
      setNotice("Cambiaste de almacén. Se limpió el carrito para evitar mezclar existencias.");
    }
    resetIdempotency();
  }

  function addProduct(product: QuickLookupProduct) {
    const available = quantityUnits(product.available_quantity);
    const step = 1000n;
    if (available <= 0n) {
      setNotice(product.name + " está agotado en este almacén y no se agregó.");
      return;
    }
    const currentCart = cartRef.current;
    const existing = currentCart.find((line) => line.product.product_id === product.product_id);
    if (!existing) {
      const initialQty = formatNumeric(available < 1000n ? available : 1000n, 14, 3);
      commitCart([...currentCart, { product, quantity: initialQty, quantityInput: initialQty, quantityValid: true }]);
      resetIdempotency();
      setNotice(product.name + " agregado al carrito.");
    } else if (quantityUnits(existing.quantity) + step > available) {
      setNotice("No puedes superar la existencia disponible de " + product.name + ".");
    } else {
      const nextQty = formatNumeric(quantityUnits(existing.quantity) + step, 14, 3);
      commitCart(currentCart.map((line) => line.product.product_id === product.product_id
        ? { ...line, product, quantity: nextQty, quantityInput: nextQty, quantityValid: true }
        : line));
      resetIdempotency();
      setNotice("Se actualizó la cantidad de " + product.name + ".");
    }
    setError("");
  }

  function updateQuantity(productId: string, value: string) {
    const raw = normalizeDecimalInput(value);
    const trimmed = raw.trim();
    const line = cartRef.current.find((item) => item.product.product_id === productId);
    if (!line) return;
    const isIntermediate = trimmed === "" || /^(?:0|[1-9][0-9]*)\.$/.test(trimmed) || /^0(?:\.0*)?$/.test(trimmed);
    try {
      const normalized = formatNumeric(parseNumeric(trimmed, 14, 3), 14, 3);
      if (parseNumeric(normalized, 14, 3) <= 0n) throw new Error("La cantidad debe ser mayor que cero.");
      if (line.product.quantity_mode === "integer" && parseNumeric(normalized, 14, 3) % 1000n !== 0n) throw new Error("Este producto solo admite cantidades enteras.");
      if (quantityUnits(normalized) > quantityUnits(line.product.available_quantity)) {
        throw new Error("La cantidad supera la existencia disponible de " + line.product.name + ".");
      }
      commitCart(cartRef.current.map((item) => item.product.product_id === productId
        ? { ...item, quantity: normalized, quantityInput: raw, quantityValid: true }
        : item));
      resetIdempotency();
      setError("");
    } catch (reason) {
      commitCart(cartRef.current.map((item) => item.product.product_id === productId
        ? { ...item, quantityInput: raw, quantityValid: false }
        : item));
      if (isIntermediate) setError("");
      else setError(reason instanceof Error ? reason.message : "La cantidad debe ser positiva y tener hasta 3 decimales.");
    }
  }

  function commitQuantityBlur(productId: string) {
    const line = cartRef.current.find((item) => item.product.product_id === productId);
    if (!line) return;
    const trimmed = line.quantityInput.replace(",", ".").trim();
    if (/^[1-9][0-9]*\.$/.test(trimmed)) {
      const candidate = trimmed.slice(0, -1);
      try {
        const normalized = formatNumeric(parseNumeric(candidate, 14, 3), 14, 3);
        if (line.product.quantity_mode === "integer" && parseNumeric(normalized, 14, 3) % 1000n !== 0n) throw new Error("Este producto solo admite cantidades enteras.");
        if (quantityUnits(normalized) > quantityUnits(line.product.available_quantity)) {
          setError("La cantidad supera la existencia disponible de " + line.product.name + ".");
          return;
        }
        commitCart(cartRef.current.map((item) => item.product.product_id === productId
          ? { ...item, quantity: normalized, quantityInput: normalized, quantityValid: true }
          : item));
        resetIdempotency();
        setError("");
        return;
      } catch { /* Fall through to standard invalid message. */ }
    }
    if (line.quantityValid) {
      if (line.quantityInput !== line.quantity) {
        commitCart(cartRef.current.map((item) => item.product.product_id === productId
          ? { ...item, quantityInput: line.quantity }
          : item));
      }
      return;
    }
    setError("Revisa la cantidad de " + line.product.name + ": debe ser mayor que cero y no superar el disponible.");
  }

  function removeLine(productId: string) {
    commitCart(cartRef.current.filter((line) => line.product.product_id !== productId));
    resetIdempotency();
  }

  function updatePayment(id: string, patch: Partial<PaymentLine>) {
    setPayments((current) => current.map((payment) => payment.id === id ? { ...payment, ...patch } : payment));
    resetIdempotency();
  }
  function addPayment() {
    if (payments.length >= 10) return;
    setPayments((current) => [...current, { id: nextPaymentLineId(), method: "cash", amount: "", reference: "" }]);
    resetIdempotency();
  }
  function removePayment(id: string) {
    if (payments.length <= 1) return;
    setPayments((current) => current.filter((payment) => payment.id !== id));
    resetIdempotency();
  }
  function setPaymentCurrency(next: Currency) {
    setCurrency(next);
    setPayments((current) => current.map((payment) => ({ ...payment, amount: "" })));
    resetIdempotency();
  }
  function fillExactAmount() {
    const { precision, scale } = paymentScale(currency);
    try {
      const alreadyPaid = sumNumeric(payments.slice(0, -1).filter((p) => p.amount.trim()).map((p) => p.amount), precision, scale);
      const remaining = parseNumeric(expectedPayment, currency === "USD" ? 14 : 16, scale) - parseNumeric(alreadyPaid, precision, scale);
      const formatted = formatNumeric(remaining > 0n ? remaining : 0n, precision, scale);
      const last = payments[payments.length - 1]!;
      updatePayment(last.id, { amount: formatted });
    } catch {
      const last = payments[payments.length - 1]!;
      updatePayment(last.id, { amount: expectedPayment });
    }
  }

  async function checkout() {
    if (!shift || !warehouseId || !canConvert || !effectiveRate || computed.totalVes === null || !allQuantitiesValid) return;
    if (usingManualFx && !manualFxAcknowledged) {
      setError("Confirma que comunicaste al cliente la tasa manual de contingencia antes de cobrar.");
      return;
    }
    if (!paymentMatches) {
      setError(`Los pagos deben sumar exactamente ${expectedPayment} ${currency}.`);
      return;
    }
    const body = {
      warehouse_id: warehouseId,
      lines: cart.map((line) => ({ product_id: line.product.product_id, quantity: line.quantity })),
      manual_fx_acknowledged: usingManualFx && manualFxAcknowledged,
      manual_fx_acknowledged_rate: usingManualFx && manualFxAcknowledged ? effectiveRate : null,
      payments: payments.map((payment) => ({
        method: payment.method,
        currency,
        amount: normalizeDecimalInput(payment.amount),
        reference: payment.reference.trim() ? payment.reference.trim() : null,
      })),
    };
    const fingerprint = JSON.stringify(body);
    if (requestFingerprint.current !== fingerprint) {
      idempotencyKey.current = newIdempotencyKey();
      requestFingerprint.current = fingerprint;
    }
    setCheckoutBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await apiRequest<SaleReceipt>(
        `${base}/branches/${encodeURIComponent(shift.branch_id)}/checkout`,
        { method: "POST", headers: { "Idempotency-Key": idempotencyKey.current }, body: JSON.stringify(body) },
      );
      setReceipt(result);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo completar la venta. Puedes reintentar sin cambiar el cobro.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  function newSale() {
    setReceipt(null);
    commitCart([]);
    setLookupReset((value) => value + 1);
    setPayments([{ id: nextPaymentLineId(), method: "cash", amount: "", reference: "" }]);
    setCurrency("USD");
    setManualFxAcknowledgedRate(null);
    setNotice("Venta nueva lista.");
    setError("");
    resetIdempotency();
  }

  const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === warehouseId);
  const allQuantitiesValid = cart.length > 0 && cart.every((line) => line.quantityValid);
  const readyToCharge = Boolean(shift && warehouseId && allQuantitiesValid && canConvert && paymentMatches && (!usingManualFx || manualFxAcknowledged) && !checkoutBusy && !receipt);

  return (
    <section className="sales-panel" aria-labelledby="sales-title">
      <header className="sales-heading">
        <div><p className="eyebrow">PUNTO DE VENTA</p><h1 id="sales-title">Ventas</h1><p>Registra una venta en tu turno activo, con existencias y precios del almacén seleccionado.</p></div>
        <button className="sales-secondary-button" type="button" onClick={() => { void loadShiftAndWarehouses(); void onRefreshRate?.(); }} disabled={loading || checkoutBusy}>{loading ? "Actualizando…" : "Actualizar"}</button>
      </header>

      {error && <p className="sales-alert error" role="alert">{error}</p>}
      {notice && <p className="sales-alert notice" role="status">{notice}</p>}

      {!shiftLoaded || loading ? <p className="sales-loading" role="status">Consultando tu turno de caja…</p> : !shift ? (
        <div className="sales-prerequisite"><span className="sales-state warning">Turno requerido</span><h2>Abre tu turno antes de vender</h2><p>Para registrar una venta necesitas tener tu propio turno de caja abierto.</p><button type="button" className="sales-primary-button" onClick={onGoToRegister}>Ir a Caja y turnos</button></div>
      ) : (
        <>
          <div className="sales-context">
            <div><span>Turno activo</span><strong>{shift.register_name ?? "Caja abierta"}</strong>{shift.opened_at && <small>Desde {dateTime(shift.opened_at)}</small>}</div>
            <div><span>Sucursal de la venta</span><strong>{shift.branch_name ?? shift.branch_id}</strong></div>
            {warehouses.length > 1 ? <label><span>Almacén</span><select value={warehouseId} disabled={Boolean(receipt)} onChange={(event) => changeWarehouse(event.target.value)}><option value="">Selecciona un almacén</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label> : <div><span>Almacén</span><strong>{selectedWarehouse?.name ?? (warehouseLoaded ? "Sin almacén activo" : "Consultando…")}</strong></div>}
          </div>

          {warehouseLoaded && warehouses.length === 0 && <p className="sales-alert warning" role="status">Esta sucursal no tiene almacenes activos. Habilita uno antes de vender.</p>}
          {warehouseLoaded && warehouses.length > 1 && !warehouseId && <p className="sales-alert warning" role="status">Selecciona el almacén que surtirá esta venta.</p>}
          {exchangeRateStatus === "scheduled" ? <p className="sales-alert warning" role="status">La tasa BCV fue publicada para {formatEffectiveDate(exchangeRateEffectiveDate)}, pero aún no es aplicable a la operación de hoy. No se habilita el cobro con esa tasa.</p> : !canConvert && <p className="sales-alert warning" role="alert">El cobro se habilita cuando exista una tasa BCV vigente o una contingencia autorizada y habilitada.</p>}

          {warehouseId && !receipt && (
            <div className="sales-workspace">
              <div className="sales-products"><QuickProductLookup
                organizationId={organizationId}
                exchangeRate={exchangeRate}
                exchangeRateStatus={exchangeRateStatus}
                exchangeRateEffectiveDate={exchangeRateEffectiveDate}
                lockedBranchId={shift.branch_id}
                lockedWarehouseId={warehouseId}
                resetSignal={lookupReset}
                selectLabel="+ Agregar"
                onSelect={addProduct}
              /></div>

              <aside className="sales-checkout">
                <div className="sales-cart-heading"><div><p className="eyebrow">RESUMEN DE VENTA</p><h2>Carrito</h2></div><span>{cart.length} {cart.length === 1 ? "producto" : "productos"}</span></div>
                {cart.length === 0 ? <div className="sales-cart-empty"><strong>Tu carrito está vacío</strong><span>Busca un producto y pulsa “+ Agregar”.</span></div> : (
                  <div className="sales-cart-lines">
                    {computed.lines.map((line) => <article className="sales-cart-line" key={line.product.product_id}>
                      <div className="sales-cart-product"><strong>{line.product.name}</strong><small>{line.product.sku} · {usd(line.product.price_usd)} c/u</small></div>
                      <label className="sales-quantity"><span>Cantidad</span><input aria-label={`Cantidad de ${line.product.name}`} inputMode={line.product.quantity_mode === "integer" ? "numeric" : "decimal"} step={line.product.quantity_mode === "integer" ? "1" : "0.001"} value={line.quantityInput} onChange={(event) => updateQuantity(line.product.product_id, event.target.value)} onBlur={() => commitQuantityBlur(line.product.product_id)} /></label>
                      <div className="sales-line-total"><strong>{usd(line.lineUsd)}</strong><small>{line.lineVes ? ves(line.lineVes) : "Conversión no disponible"}</small></div>
                      <div className="sales-line-actions"><button type="button" disabled={quantityUnits(line.quantity) <= 1000n} onClick={() => updateQuantity(line.product.product_id, formatNumeric(quantityUnits(line.quantity) - 1000n, 14, 3))} aria-label={`Restar ${line.product.name}`}>−</button><button type="button" onClick={() => addProduct(line.product)} aria-label={`Sumar ${line.product.name}`}>+</button><button type="button" onClick={() => removeLine(line.product.product_id)}>Quitar</button></div>
                    </article>)}
                  </div>
                )}

                <div className="sales-totals"><div><span>Subtotal USD</span><strong>{usd(computed.subtotalUsd)}</strong></div><div><span>Total VES</span><strong>{computed.totalVes === null ? "No disponible" : ves(computed.totalVes)}</strong></div><small>{usingManualFx ? `Tasa manual de contingencia (no oficial BCV): ${localized(effectiveRate!, 18, 8)} Bs./USD` : canConvert ? `Tasa BCV aplicada: ${localized(effectiveRate!, 18, 8)} Bs./USD` : "Conversión no disponible"}</small></div>

                <section className="sales-payments" aria-labelledby="sales-payments-title">
                  <div className="sales-payments-heading"><h3 id="sales-payments-title">Forma de pago</h3><label>Moneda<select value={currency} onChange={(event) => setPaymentCurrency(event.target.value as Currency)}><option value="USD">USD</option><option value="VES">VES</option></select></label></div>
                  {payments.map((payment, index) => <div className="sales-payment-row" key={payment.id}>
                    <label><span>Método</span><select value={payment.method} onChange={(event) => updatePayment(payment.id, { method: event.target.value as PaymentMethod })}>{PAYMENT_METHODS.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</select></label>
                    <label><span>Monto ({currency})</span><input inputMode="decimal" value={payment.amount} placeholder={currency === "USD" ? "0,0000" : "0,00"} onChange={(event) => updatePayment(payment.id, { amount: normalizeDecimalInput(event.target.value) })} /></label>
                    <label className="sales-payment-reference"><span>Referencia (opcional)</span><input maxLength={128} value={payment.reference} onChange={(event) => updatePayment(payment.id, { reference: event.target.value })} /></label>
                    {payments.length > 1 && <button type="button" className="sales-remove-payment" onClick={() => removePayment(payment.id)} aria-label={`Quitar pago ${index + 1}`}>Quitar</button>}
                  </div>)}
                  <div className="sales-payment-actions"><button type="button" className="sales-secondary-button" onClick={addPayment} disabled={payments.length >= 10}>Agregar pago</button><button type="button" className="sales-secondary-button" onClick={fillExactAmount}>Monto exacto</button></div>
                  <p className={paymentMatches ? "sales-payment-match" : "sales-payment-pending"} role="status">Pagos: {currency === "USD" ? usd(paymentTotal) : ves(paymentTotal)} · Total requerido: {currency === "USD" ? usd(expectedPayment) : ves(expectedPayment)}</p>
                </section>
                {usingManualFx && <label className="sales-manual-fx-ack"><input type="checkbox" checked={manualFxAcknowledged} onChange={(event) => setManualFxAcknowledgedRate(event.target.checked ? effectiveRate : null)} /> Confirmo que comuniqué al cliente la tasa manual de contingencia (no oficial BCV) antes de cobrar.</label>}
                <button type="button" className="sales-primary-button sales-charge-button" onClick={() => void checkout()} disabled={!readyToCharge}>{checkoutBusy ? "Procesando venta…" : "Cobrar venta"}</button>
                {!canConvert && <small className="sales-disabled-reason">El cobro se habilita cuando exista una tasa BCV vigente o una contingencia autorizada y habilitada.</small>}
                {canConvert && cart.length > 0 && !allQuantitiesValid && <small className="sales-disabled-reason">Corrige las cantidades del carrito antes de cobrar.</small>}
                {canConvert && cart.length > 0 && !paymentMatches && <small className="sales-disabled-reason">Completa los pagos hasta cubrir exactamente el total en una sola moneda.</small>}
              </aside>
            </div>
          )}
        </>
      )}

      {receipt && <section className="sales-receipt" aria-labelledby="sales-receipt-title">
        <div className="sales-receipt-head"><div><p className="eyebrow">OPERACIÓN CONFIRMADA</p><h2 id="sales-receipt-title">Comprobante de venta</h2></div><span className="sales-state success">Completada</span></div>
        <div className="sales-receipt-number"><span>Número de venta</span><strong>{receipt.sale_number}</strong></div>
        <p className="sales-receipt-date">{dateTime(receipt.created_at)} · {receipt.fx_receipt_label}: {localized(receipt.fx_rate, 18, 8)} Bs./USD</p>
        <p className="sales-receipt-date">Fecha de operación Caracas: {receipt.operation_date ?? "—"} · Fecha valor BCV: {receipt.exchange_rate_effective_date ?? "No aplica a tasa manual"}</p>
        {receipt.fx_source === 'manual_contingency' && receipt.fx_authorization_id && (
          <p className="sales-receipt-date">Referencia de autorización: {receipt.fx_authorization_id}</p>
        )}
        <div className="sales-receipt-lines">{receipt.lines.map((line, index) => <div key={`${line.sku_snapshot}-${index}`}><div><strong>{line.product_name_snapshot}</strong><small>{line.sku_snapshot} · {line.unit_snapshot} · {line.quantity} × {usd(line.unit_price_usd)}</small></div><span>{usd(line.line_total_usd)}<small>{ves(line.line_total_ves)}</small></span></div>)}</div>
        <div className="sales-receipt-payments"><h3>Pagos recibidos</h3>{receipt.payments.map((payment, index) => <div key={index}><span>{PAYMENT_METHODS.find((method) => method.value === payment.method)?.label ?? payment.method}{payment.reference ? ` · Ref. ${payment.reference}` : ""}</span><strong>{payment.currency === "USD" ? usd(payment.amount) : ves(payment.amount)}</strong></div>)}</div>
        <div className="sales-receipt-totals"><div><span>Total USD</span><strong>{usd(receipt.total_usd)}</strong></div><div><span>Total VES</span><strong>{ves(receipt.total_ves)}</strong></div></div>
        <button type="button" className="sales-primary-button" onClick={newSale}>Nueva venta</button>
      </section>}
    </section>
  );
}
