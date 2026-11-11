import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest, ApiError } from "./auth";
import "./register-shifts.css";

type Branch = { id: string; name: string; slug: string };
type Register = { id: string; name: string; code: string };
type Shift = { id: string; organizationId: string; branchId: string; registerId: string; cashierUserId: string; openedAt: string; openingCashUsd: string; openingCashVes: string };
type RegisterShiftsPanelProps = { organizationId: string; userName: string };

function money(value: string): string {
  const [integer = "0", fraction] = value.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return fraction ? grouped + "," + fraction : grouped;
}
function dateTime(value: string): string {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(value));
}

export default function RegisterShiftsPanel({ organizationId, userName }: RegisterShiftsPanelProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [registers, setRegisters] = useState<Register[]>([]);
  const [registerId, setRegisterId] = useState("");
  const [shift, setShift] = useState<Shift | null>(null);
  const [openingUsd, setOpeningUsd] = useState("0.0000");
  const [openingVes, setOpeningVes] = useState("0.00");
  const [closingUsd, setClosingUsd] = useState("");
  const [closingVes, setClosingVes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadBranchState = useCallback(async (selectedBranchId: string) => {
    if (!selectedBranchId) return;
    const root = `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(selectedBranchId)}`;
    const [registerResult, shiftResult] = await Promise.all([
      apiRequest<{ items: Register[] }>(root + "/registers"),
      apiRequest<{ shift: Shift | null }>(root + "/register-shifts/current"),
    ]);
    setRegisters(registerResult.items);
    setShift(shiftResult.shift);
    setRegisterId(registerResult.items[0]?.id ?? "");
    setClosingUsd(shiftResult.shift?.openingCashUsd ?? "");
    setClosingVes(shiftResult.shift?.openingCashVes ?? "");
  }, [organizationId]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [branchResult, currentResult] = await Promise.all([
        apiRequest<{ items: Branch[] }>(`/api/orgs/${encodeURIComponent(organizationId)}/branches`),
        apiRequest<{ shift: { branch_id: string } | null }>(`/api/orgs/${encodeURIComponent(organizationId)}/register-shifts/current`),
      ]);
      setBranches(branchResult.items);
      const preferred = currentResult.shift?.branch_id ?? branchResult.items[0]?.id ?? "";
      setBranchId(preferred);
      if (preferred) await loadBranchState(preferred);
      else { setRegisters([]); setShift(null); }
    } catch (reason) {
      setError(reason instanceof ApiError && reason.status === 403
        ? "Tu cuenta no tiene una sucursal habilitada para gestionar turnos de caja."
        : reason instanceof Error ? reason.message : "No se pudo cargar el estado de caja.");
    } finally { setLoading(false); }
  }, [organizationId, loadBranchState]);

  useEffect(() => { void load(); }, [load]);

  async function changeBranch(nextBranchId: string) {
    setBranchId(nextBranchId); setShift(null); setRegisters([]); setError(""); setNotice(""); setLoading(true);
    try { await loadBranchState(nextBranchId); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo consultar la sucursal."); }
    finally { setLoading(false); }
  }

  async function openShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId || !registerId) return;
    setSaving(true); setError(""); setNotice("");
    try {
      const response = await apiRequest<{ shift: Shift }>(
        `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(branchId)}/register-shifts`,
        { method: "POST", body: JSON.stringify({ register_id: registerId, opening_cash_usd: openingUsd, opening_cash_ves: openingVes }) },
      );
      setShift(response.shift); setClosingUsd(response.shift.openingCashUsd); setClosingVes(response.shift.openingCashVes);
      setNotice("Turno abierto correctamente. La apertura quedó registrada en auditoría.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo abrir el turno."); }
    finally { setSaving(false); }
  }

  async function closeShift(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!branchId || !shift) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(
        `/api/orgs/${encodeURIComponent(organizationId)}/branches/${encodeURIComponent(branchId)}/register-shifts/${encodeURIComponent(shift.id)}/close`,
        { method: "POST", body: JSON.stringify({ closing_cash_usd: closingUsd, closing_cash_ves: closingVes }) },
      );
      setShift(null); setNotice("Turno cerrado y registrado en auditoría.");
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
      {error && <p className="register-shifts-alert error" role="alert">{error}</p>}
      {notice && <p className="register-shifts-alert success" role="status">{notice}</p>}
      {loading ? <p className="register-shifts-loading">Consultando sucursales y estado del turno…</p> : (
        <>
          {branches.length > 0 && <label className="register-shifts-field"><span>Sucursal</span><select value={branchId} onChange={(event) => void changeBranch(event.target.value)} disabled={saving}>{branches.map((branch) => <option value={branch.id} key={branch.id}>{branch.name}</option>)}</select></label>}
          {branches.length === 0 && !error && <p className="register-shifts-empty">No hay sucursales activas asignadas a tu usuario.</p>}
          {branchId && !error && (shift ? (
            <div className="register-shift-card">
              <div className="register-shift-card-head"><div><span className="register-shift-state open">Turno abierto</span><h2>Tu caja está en operación</h2></div><span className="register-shift-time">Desde {dateTime(shift.openedAt)}</span></div>
              <dl className="register-shift-values"><div><dt>Fondo inicial USD</dt><dd>$ {money(shift.openingCashUsd)}</dd></div><div><dt>Fondo inicial VES</dt><dd>Bs. {money(shift.openingCashVes)}</dd></div></dl>
              <form className="register-shift-form" onSubmit={closeShift}>
                <h3>Cierre de turno</h3><p>Introduce el efectivo contado al cierre en cada moneda. Este registro no calcula diferencias ni efectivo esperado.</p>
                <label className="register-shifts-field"><span>Conteo final USD</span><input inputMode="decimal" required value={closingUsd} onChange={(event) => setClosingUsd(event.target.value)} /></label>
                <label className="register-shifts-field"><span>Conteo final VES</span><input inputMode="decimal" required value={closingVes} onChange={(event) => setClosingVes(event.target.value)} /></label>
                <button className="register-shifts-primary" type="submit" disabled={saving}>{saving ? "Guardando…" : "Cerrar turno"}</button>
              </form>
            </div>
          ) : (
            <div className="register-shift-card"><span className="register-shift-state closed">Sin turno abierto</span><h2>Prepara tu caja</h2>
              {registers.length === 0 ? <p className="register-shifts-empty">No hay cajas activas en esta sucursal. Un administrador debe configurar una caja antes de abrir un turno.</p> : (
                <form className="register-shift-form" onSubmit={openShift}>
                  <label className="register-shifts-field"><span>Caja</span><select required value={registerId} onChange={(event) => setRegisterId(event.target.value)}>{registers.map((register) => <option value={register.id} key={register.id}>{register.name} · {register.code}</option>)}</select></label>
                  <div className="register-shift-form-grid">
                    <label className="register-shifts-field"><span>Fondo inicial USD</span><input inputMode="decimal" required value={openingUsd} onChange={(event) => setOpeningUsd(event.target.value)} /></label>
                    <label className="register-shifts-field"><span>Fondo inicial VES</span><input inputMode="decimal" required value={openingVes} onChange={(event) => setOpeningVes(event.target.value)} /></label>
                  </div>
                  <button className="register-shifts-primary" type="submit" disabled={saving || !registerId}>{saving ? "Abriendo…" : "Abrir turno"}</button>
                </form>
              )}
            </div>
          ))}
        </>
      )}
      <p className="register-shifts-footnote">Responsable: {userName}. Esta primera versión registra apertura y cierre; no sustituye el arqueo, las ventas, los cobros ni el reporte de diferencias.</p>
    </section>
  );
}
