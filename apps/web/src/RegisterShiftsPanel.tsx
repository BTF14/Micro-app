import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatLocalizedDecimal, normalizeDecimalInput } from "./decimal";
import { apiRequest, ApiError } from "./auth";
import "./register-shifts.css";

type Branch = { id: string; name: string; slug: string };
type Register = { id: string; name: string; code: string };
type Shift = { id: string; organizationId: string; branchId: string; registerId: string; cashierUserId: string; openedAt: string; openingCashUsd: string; openingCashVes: string };
type OpenShift = { id: string; cashier_user_id: string; cashier_name: string; register_name: string; opened_at: string; opening_cash_usd: string; opening_cash_ves: string };
type RegisterShiftsPanelProps = { organizationId: string; role: string; userName: string; onOpenShiftClosure?: (branchId: string, shiftId: string) => void };

function money(value: string): string {
  try { return formatLocalizedDecimal(value, 18, 4, 2); }
  catch { return "No disponible"; }
}
function dateTime(value: string): string {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(value));
}

function normalizeOpenedShift(value: Record<string, unknown>): Shift {
  return {
    id: String(value.id), organizationId: String(value.organization_id ?? value.organizationId),
    branchId: String(value.branch_id ?? value.branchId), registerId: String(value.register_id ?? value.registerId),
    cashierUserId: String(value.cashier_user_id ?? value.cashierUserId), openedAt: String(value.opened_at ?? value.openedAt),
    openingCashUsd: String(value.opening_cash_usd ?? value.openingCashUsd), openingCashVes: String(value.opening_cash_ves ?? value.openingCashVes),
  };
}

export default function RegisterShiftsPanel({ organizationId, role, userName, onOpenShiftClosure }: RegisterShiftsPanelProps) {
  const [lastClosedShift, setLastClosedShift] = useState<{ branchId: string; id: string } | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [registers, setRegisters] = useState<Register[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [shift, setShift] = useState<Shift | null>(null);
  const [openShifts, setOpenShifts] = useState<OpenShift[]>([]);
  const [forceDrafts, setForceDrafts] = useState<Record<string,{usd:string;ves:string;reason:string}>>({});
  const [openingUsd, setOpeningUsd] = useState("");
  const [openingVes, setOpeningVes] = useState("");
  const [closingUsd, setClosingUsd] = useState("");
  const [closingVes, setClosingVes] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBranchState = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) return;
    const root = `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(selectedBranchId)}`;
    const [registerResult, shiftResult, openResult] = await Promise.all([
      apiRequest<{ items: Register[] }>(root + "/registers"),
      apiRequest<{ shift: Shift | null }>(root + "/register-shifts/current"),
      role === "owner" || role === "admin" ? apiRequest<{ items: OpenShift[] }>(root + "/register-shifts/open") : Promise.resolve({ items: [] as OpenShift[] }),
    ]);
    setRegisters(registerResult.items);
    setShift(shiftResult.shift ? normalizeOpenedShift(shiftResult.shift as unknown as Record<string, unknown>) : null);
    setOpenShifts(openResult.items);
    setRegisterId(registerResult.items[0]?.id ?? "");
    setClosingUsd("");
    setClosingVes("");
  }, [organizationId, role]);

  const load = useCallback(async () => {
    setLoading(true); setError(""); setLoadError("");
    try {
      const [branchResult, currentResult] = await Promise.all([
        apiRequest<{ items: Branch[] }>(`/api/orgs/${encodeURIComponent(organizationId)}/register-shifts/branches`),
        apiRequest<{ shift: { branch_id: string } | null }>(`/api/orgs/${encodeURIComponent(organizationId)}/register-shifts/current`),
      ]);
      setBranches(branchResult.items);
      const preferred = currentResult.shift?.branch_id ?? branchResult.items[0]?.id ?? "";
      setBranchId(preferred);
      if (preferred) await loadBranchState(preferred);
      else { setRegisters([]); setShift(null); }
    } catch (reason) {
      setLoadError(reason instanceof ApiError && reason.status === 403
        ? "Tu cuenta no tiene una sucursal habilitada para gestionar turnos de caja."
        : reason instanceof Error ? reason.message : "No se pudo cargar el estado de caja.");
    } finally { setLoading(false); }
  }, [organizationId, loadBranchState]);

  useEffect(() => { void load(); }, [load]);

  async function changeBranch(nextBranchId: string) {
    const previousBranchId = branchId;
    setBranchId(nextBranchId); setError(""); setNotice(""); setLoading(true);
    try { await loadBranchState(nextBranchId); }
    catch (reason) { setBranchId(previousBranchId); setError(reason instanceof Error ? reason.message : "No se pudo consultar la sucursal."); }
    finally { setLoading(false); }
  }

  async function openShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId || !registerId) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await apiRequest<{ shift: Record<string, unknown> }>(
        `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(branchId)}/register-shifts`,
        { method: "POST", body: JSON.stringify({ register_id: registerId, opening_cash_usd: openingUsd.trim() ? normalizeDecimalInput(openingUsd) : "0.00", opening_cash_ves: openingVes.trim() ? normalizeDecimalInput(openingVes) : "0.00" }) },
      );
      const openedShift = normalizeOpenedShift(response.shift);
      setShift(openedShift); setClosingUsd(""); setClosingVes("");
      setOpeningUsd(""); setOpeningVes("");
      setNotice("Turno abierto correctamente. La apertura quedó registrada en auditoría.");
      await loadBranchState(branchId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo abrir el turno."); }
    finally { setSaving(false); }
  }


  function updateForceDraft(shiftId: string, field: "usd" | "ves" | "reason", value: string) {
    setForceDrafts(current => {
      const previous = current[shiftId] ?? { usd: "", ves: "", reason: "" };
      return { ...current, [shiftId]: { ...previous, [field]: value } };
    });
  }
  async function forceCloseShift(openShift: OpenShift, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const draft = forceDrafts[openShift.id] ?? { usd: "", ves: "", reason: "" };
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(
        `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(branchId)}/register-shifts/${encodeURIComponent(openShift.id)}/force-close`,
        { method: "POST", body: JSON.stringify({ closing_cash_usd: normalizeDecimalInput(draft.usd), closing_cash_ves: normalizeDecimalInput(draft.ves), reason: draft.reason.trim() }) },
      );
      setNotice(`Turno de ${openShift.cashier_name} cerrado de forma forzada y auditada.`);
      setForceDrafts(current => { const next = { ...current }; delete next[openShift.id]; return next; });
      await loadBranchState(branchId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo cerrar el turno de forma forzada."); }
    finally { setSaving(false); }
  }

  async function closeShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!confirmClose) { setConfirmClose(true); return; }
    if (!branchId || !shift) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(
        `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(branchId)}/register-shifts/${encodeURIComponent(shift.id)}/close`,
        { method: "POST", body: JSON.stringify({ closing_cash_usd: normalizeDecimalInput(closingUsd), closing_cash_ves: normalizeDecimalInput(closingVes) }) },
      );
      setLastClosedShift({ branchId, id: shift.id }); setShift(null); setConfirmClose(false); setNotice("Turno cerrado y registrado en auditoría.");
      await loadBranchState(branchId);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo cerrar el turno."); }
    finally { setSaving(false); }
  }

  return (
    <section className="register-shifts-panel" aria-labelledby="register-shifts-title">
      <div className="register-shifts-heading">
        <div><p className="eyebrow">OPERACIÓN DE CAJA</p><h1 id="register-shifts-title">Turnos de caja</h1><p>Abre tu turno con el fondo inicial y registra el conteo final al cerrar. Cada acción queda auditada.</p></div>
        <button type="button" className="register-shifts-refresh" onClick={() => void load()} disabled={loading || saving}>{loading ? "Consultando…" : "Actualizar"}</button>
      </div>
      {loadError && <p className="register-shifts-alert error" role="alert">{loadError}</p>}
      {error && <p className="register-shifts-alert error" role="alert">{error}</p>}
      {notice && <p className="register-shifts-alert success" role="status">{notice}</p>}
      {notice === "Turno cerrado y registrado en auditoría." && lastClosedShift && onOpenShiftClosure && <button type="button" className="register-shifts-refresh" onClick={() => onOpenShiftClosure(lastClosedShift.branchId, lastClosedShift.id)}>Ver resumen del cierre</button>}
      {loading ? <p className="register-shifts-loading">Consultando sucursales y estado del turno…</p> : (
        <>
          {branches.length > 0 && <label className="register-shifts-field"><span>Sucursal</span><select value={branchId} onChange={(event) => void changeBranch(event.target.value)} disabled={saving || Boolean(shift)}>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>}
          {branches.length === 0 && !loadError && <p className="register-shifts-empty">No hay sucursales activas asignadas a tu usuario.</p>}
          {branchId && !loadError && (role === "owner" || role === "admin") && (
            <section className="register-shift-card" aria-labelledby="open-shifts-title">
              <h2 id="open-shifts-title">Turnos abiertos de la sucursal</h2>
              {openShifts.length === 0 && <p className="register-shifts-empty">No hay turnos abiertos en esta sucursal.</p>}
              {openShifts.map(openShift => {
                const draft = forceDrafts[openShift.id] ?? { usd: "", ves: "", reason: "" };
                return <article className="register-shift-values" key={openShift.id}>
                  <div><dt>Cajero</dt><dd>{openShift.cashier_name}</dd></div>
                  <div><dt>Caja</dt><dd>{openShift.register_name}</dd></div>
                  <div><dt>Abierto</dt><dd>{dateTime(openShift.opened_at)}</dd></div>
                  <form className="register-shift-form" onSubmit={event => void forceCloseShift(openShift,event)}>
                    <h3>Cierre forzado</h3>
                    <label className="register-shifts-field"><span>Efectivo físico USD</span><input inputMode="decimal" required value={draft.usd} onChange={e=>updateForceDraft(openShift.id,"usd",e.target.value)} /></label>
                    <label className="register-shifts-field"><span>Efectivo físico VES</span><input inputMode="decimal" required value={draft.ves} onChange={e=>updateForceDraft(openShift.id,"ves",e.target.value)} /></label>
                    <label className="register-shifts-field"><span>Motivo obligatorio</span><textarea required minLength={3} maxLength={300} value={draft.reason} onChange={e=>updateForceDraft(openShift.id,"reason",e.target.value)} /></label>
                    <button type="submit" className="primary-button" disabled={saving}>Cerrar turno y auditar</button>
                  </form>
                </article>;
              })}
            </section>
          )}
          {branchId && !loadError && (shift ? (
            <div className="register-shift-card">
              <div className="register-shift-card-head"><div><span className="register-shift-state open">Turno abierto</span><h2>Tu caja está en operación</h2></div><span className="register-shift-time">Desde {dateTime(shift.openedAt)}</span></div>
              <dl className="register-shift-values"><div><dt>Fondo inicial USD</dt><dd>$ {money(shift.openingCashUsd)}</dd></div><div><dt>Fondo inicial VES</dt><dd>Bs. {money(shift.openingCashVes)}</dd></div></dl>
              <form className="register-shift-form" onSubmit={closeShift}>
                <h3>Cierre de turno</h3><p>Introduce el efectivo contado al cierre. Si tu tienda opera 100 % digital (Pago móvil, tarjeta o transferencia), puedes abrir y cerrar con $ 0,00 y Bs. 0,00. Si recibes efectivo y entregas vuelto, aunque abras con 0,00, Reportes suma las ventas en efectivo netas al efectivo esperado.</p>
                <label className="register-shifts-field"><span>Conteo final USD</span><input inputMode="decimal" required placeholder="0.00" value={closingUsd} onChange={(event) => { setClosingUsd(normalizeDecimalInput(event.target.value)); setConfirmClose(false); }} /></label>
                <label className="register-shifts-field"><span>Conteo final VES</span><input inputMode="decimal" required placeholder="0.00" value={closingVes} onChange={(event) => { setClosingVes(normalizeDecimalInput(event.target.value)); setConfirmClose(false); }} /></label>
                {confirmClose && <p className="register-shifts-confirm" role="status">Confirma que ambos importes corresponden al conteo físico final. El cierre no se puede editar después.</p>}
                <button className="register-shifts-primary" type="submit" disabled={saving}>{saving ? "Guardando…" : confirmClose ? "Confirmar cierre" : "Revisar cierre"}</button>
              </form>
            </div>
          ) : (role === "cashier" || role === "owner" || role === "admin") ? (
            <div className="register-shift-card"><span className="register-shift-state closed">Sin turno abierto</span><h2>Prepara tu caja</h2>
              {registers.length === 0 ? <p className="register-shifts-empty">No hay cajas activas en esta sucursal. Un administrador debe configurar una caja antes de abrir un turno.</p> : (
                <form className="register-shift-form" onSubmit={openShift}>
                  <label className="register-shifts-field"><span>Caja</span><select required value={registerId} onChange={(event) => setRegisterId(event.target.value)}>{registers.map((register) => <option value={register.id} key={register.id}>{register.name} · {register.code}</option>)}</select></label>
                  <div className="register-shift-form-grid">
                    <label className="register-shifts-field"><span>Fondo inicial USD</span><input inputMode="decimal" placeholder="0.00" value={openingUsd} onChange={(event) => setOpeningUsd(normalizeDecimalInput(event.target.value))} /></label>
                    <label className="register-shifts-field"><span>Fondo inicial VES</span><input inputMode="decimal" placeholder="0.00" value={openingVes} onChange={(event) => setOpeningVes(normalizeDecimalInput(event.target.value))} /></label>
                  </div>
                  <button className="register-shifts-primary" type="submit" disabled={saving || !registerId}>{saving ? "Abriendo…" : "Abrir turno"}</button>
                </form>
              )}
            </div>
          ) : (
            <div className="register-shift-card"><h2>Vista administrativa</h2><p>Owner y Admin pueden consultar los turnos abiertos de esta sucursal y ejecutar cierres forzados auditados desde el panel superior.</p></div>
          ))}
        </>
      )}
      <p className="register-shifts-footnote">Responsable: {userName}. Consulta Reportes → Cierres de caja para revisar el efectivo esperado, el desglose de pagos y las diferencias del turno.</p>
    </section>
  );
}
