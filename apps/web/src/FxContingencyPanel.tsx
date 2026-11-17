import { useEffect, useState } from "react";
import { apiRequest } from "./auth";

type Branch = { id: string; name: string; slug: string };
type Authorization = {
  id: string; rate: string; reference_rate_value: string; deviation_bps: number;
  reason: string; starts_at: string; expires_at: string; status: string;
  authorized_by_user_id: string; elevated_confirmation_at: string | null;
};
type Member = {
  user_id: string; display_name: string; role: string; organization_active: boolean;
  branch_memberships: Record<string, boolean>;
};
type Delegation = { id: string; user_id: string; display_name: string; granted_by_user_id: string; created_at: string };
type FxState = {
  kind?: string; commercial_enabled: boolean; authorization: Authorization | null;
  bcv: { last_success_at: string | null; last_outcome: string | null; last_effective_date: string | null; rate: string | null; validation_status: string | null } | null;
};

function localExpiry(): string {
  const date = new Date(Date.now() + 4 * 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function FxContingencyPanel({ organizationId, role }: { organizationId: string; role: "owner" | "admin" }) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [state, setState] = useState<FxState | null>(null);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [delegateUserId, setDelegateUserId] = useState("");
  const [pin, setPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [rate, setRate] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState(localExpiry);
  const [elevatedReason, setElevatedReason] = useState("");
  const [elevatedConfirmed, setElevatedConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const base = `/api/orgs/${encodeURIComponent(organizationId)}`;

  async function refresh(branch = branchId) {
    if (!branch) return;
    setLoading(true);
    try {
      const fx = await apiRequest<FxState>(`${base}/branches/${encodeURIComponent(branch)}/fx-contingency`);
      setState(fx);
      if (role === "owner") {
        const list = await apiRequest<{ delegations: Delegation[] }>(
          `${base}/branches/${encodeURIComponent(branch)}/fx-delegations`,
        );
        setDelegations(list.delegations);
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo consultar la contingencia.");
    } finally { setLoading(false); }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const result = await apiRequest<{ branches: Branch[] }>(`${base}/fx-delegated-branches`);
        if (!active) return;
        setBranches(result.branches);
        setBranchId(result.branches[0]?.id ?? "");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "No se pudieron consultar las sucursales.");
      }
      if (role === "owner") {
        try {
          const structure = await apiRequest<{ members: Member[] }>(`${base}/structure`);
          if (active) setMembers(structure.members.filter((member) => member.role === "admin" && member.organization_active));
        } catch { /* Delegation remains unavailable if owner structure data cannot be read. */ }
      }
    })();
    return () => { active = false; };
  }, [base, role]);

  useEffect(() => { if (branchId) void refresh(branchId); }, [branchId]);

  async function savePin() {
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`${base}/fx-pin`, {
        method: "PUT", body: JSON.stringify({ pin: newPin, ...(currentPin ? { current_pin: currentPin } : {}) }),
      });
      setNewPin(""); setCurrentPin(""); setNotice("PIN configurado correctamente.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo guardar el PIN."); }
    finally { setSaving(false); }
  }

  async function authorize() {
    if (!branchId) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`${base}/branches/${encodeURIComponent(branchId)}/fx-contingency/authorizations`, {
        method: "POST",
        body: JSON.stringify({
          rate, reason, expires_at: new Date(expiresAt).toISOString(), pin,
          elevated_confirmation: elevatedConfirmed,
          ...(elevatedConfirmed ? { elevated_confirmation_reason: elevatedReason.trim() } : {}),
        }),
      });
      setPin(""); setRate(""); setReason(""); setElevatedReason(""); setElevatedConfirmed(false);
      setNotice("Autorización creada y registrada."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo autorizar la contingencia."); }
    finally { setSaving(false); }
  }

  async function renew() {
    if (!branchId || !state?.authorization || !pin || !expiresAt || !reason.trim()) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`${base}/branches/${encodeURIComponent(branchId)}/fx-contingency/authorizations/${encodeURIComponent(state.authorization.id)}/renew`, {
        method: "POST",
        body: JSON.stringify({
          rate: state.authorization.rate,
          reason: reason.trim(),
          expires_at: new Date(expiresAt).toISOString(),
          pin,
          elevated_confirmation: elevatedConfirmed,
          ...(elevatedConfirmed ? { elevated_confirmation_reason: elevatedReason.trim() } : {}),
        }),
      });
      setPin(""); setElevatedConfirmed(false); setElevatedReason("");
      setNotice("Autorización renovada; se creó un nuevo registro auditable.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo renovar la autorización."); }
    finally { setSaving(false); }
  }

  async function revoke() {
    if (!branchId || !state?.authorization) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`${base}/branches/${encodeURIComponent(branchId)}/fx-contingency/authorizations/${state.authorization.id}/revoke`, {
        method: "POST", body: JSON.stringify({ pin, reason: "Revocación manual desde Configuración" }),
      });
      setPin(""); setNotice("Contingencia revocada."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo revocar la contingencia."); }
    finally { setSaving(false); }
  }

  async function grantDelegation() {
    if (!branchId || !delegateUserId) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`${base}/branches/${encodeURIComponent(branchId)}/fx-delegations`, {
        method: "POST", body: JSON.stringify({ user_id: delegateUserId }),
      });
      setDelegateUserId(""); setNotice("Delegación otorgada."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo delegar el permiso."); }
    finally { setSaving(false); }
  }

  async function revokeDelegation(userId: string) {
    if (!branchId) return;
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(`${base}/branches/${encodeURIComponent(branchId)}/fx-delegations/${encodeURIComponent(userId)}`, { method: "DELETE", body: JSON.stringify({}) });
      setNotice("Delegación revocada."); await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "No se pudo revocar la delegación."); }
    finally { setSaving(false); }
  }

  const assignedAdmins = members.filter((member) => member.branch_memberships?.[branchId] === true);
  return (
    <section className="fx-contingency-panel" aria-labelledby="fx-contingency-title">
      <header><p className="eyebrow">CONFIGURACIÓN CAMBIARIA</p><h2 id="fx-contingency-title">Contingencia manual BCV</h2><p>Autorización temporal, individual y auditable. No representa una tasa oficial.</p></header>
      {error && <p role="alert" className="sales-alert error">{error}</p>}
      {notice && <p role="status" className="sales-alert notice">{notice}</p>}
      <label>Sucursal<select value={branchId} onChange={(event) => setBranchId(event.target.value)}>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      {loading ? <p>Consultando estado…</p> : state && <>
        <p>Estado BCV: {state.bcv?.last_outcome ?? "sin sincronización"} · fecha efectiva: {state.bcv?.last_effective_date ?? "—"}</p>
        {state.authorization ? <div className="fx-active-authorization">
          <strong>Autorización activa</strong>
          <p>{state.authorization.rate} Bs./USD · vence {new Date(state.authorization.expires_at).toLocaleString()}</p>
          <p>Motivo: {state.authorization.reason}</p>
          <label>Motivo de renovación<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></label>
          <label>Nuevo vencimiento para renovar (hora local)<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
          <label><input type="checkbox" checked={elevatedConfirmed} onChange={(event) => setElevatedConfirmed(event.target.checked)} /> Confirmo expresamente la desviación superior al 5% (si aplica).</label>
          {elevatedConfirmed && <label>Motivo específico de confirmación reforzada<textarea value={elevatedReason} onChange={(event) => setElevatedReason(event.target.value)} maxLength={500} /></label>}
          <label>PIN de autorización<input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} /></label>
          <button type="button" disabled={saving || pin.length < 8 || !expiresAt || !reason.trim()} onClick={() => void renew()}>Renovar contingencia</button>
          <button type="button" disabled={saving || pin.length < 8} onClick={() => void revoke()}>Revocar contingencia</button>
        </div> : <div className="fx-create-authorization">
          <h3>Autorizar tasa manual</h3>
          <label>Tasa VES por USD<input inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} placeholder="Ej. 450,00000000" /></label>
          <label>Motivo obligatorio<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></label>
          <label>Vencimiento (hora local)<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
          <label><input type="checkbox" checked={elevatedConfirmed} onChange={(event) => setElevatedConfirmed(event.target.checked)} /> Confirmo expresamente la desviación superior al 5% (si aplica).</label>
          {elevatedConfirmed && <label>Motivo específico de confirmación reforzada<textarea value={elevatedReason} onChange={(event) => setElevatedReason(event.target.value)} maxLength={500} /></label>}
          <label>PIN individual<input type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={(event) => setPin(event.target.value)} /></label>
          <button type="button" disabled={saving || !rate || !reason.trim() || pin.length < 8} onClick={() => void authorize()}>Autorizar contingencia</button>
        </div>}
        <p className="fx-commercial-gate">Habilitación comercial: {state.commercial_enabled ? "activada por configuración del entorno" : "deshabilitada. Requiere aprobación escrita contable/legal (AC-6)."}</p>
      </>}
      <div className="fx-pin-settings">
        <h3>PIN individual</h3>
        <label>PIN nuevo (8–32 dígitos)<input type="password" inputMode="numeric" autoComplete="new-password" value={newPin} onChange={(event) => setNewPin(event.target.value)} /></label>
        <label>PIN actual (solo si ya estaba configurado)<input type="password" inputMode="numeric" autoComplete="current-password" value={currentPin} onChange={(event) => setCurrentPin(event.target.value)} /></label>
        <button type="button" disabled={saving || newPin.length < 8} onClick={() => void savePin()}>Guardar PIN</button>
      </div>
      {role === "owner" && <div className="fx-delegations">
        <h3>Delegación de administradores</h3>
        <label>Administrador asignado<select value={delegateUserId} onChange={(event) => setDelegateUserId(event.target.value)}>
          <option value="">Seleccionar administrador</option>
          {assignedAdmins.map((member) => <option key={member.user_id} value={member.user_id}>{member.display_name}</option>)}
        </select></label>
        <button type="button" disabled={saving || !delegateUserId} onClick={() => void grantDelegation()}>Delegar fx.contingency.authorize</button>
        <ul>{delegations.map((delegation) => <li key={delegation.id}>{delegation.display_name} <button type="button" disabled={saving} onClick={() => void revokeDelegation(delegation.user_id)}>Revocar</button></li>)}</ul>
      </div>}
    </section>
  );
}
