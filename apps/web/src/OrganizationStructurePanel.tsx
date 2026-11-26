import { useCallback, useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "./auth";

type Warehouse = { id: string; name: string; code: string; is_active: boolean };
type Register = { id: string; name: string; code: string; is_active: boolean };
type Branch = { id: string; name: string; slug: string; is_active: boolean; warehouses: Warehouse[]; registers: Register[] };
type Member = { user_id: string; display_name: string; email: string; role: string; organization_active: boolean; branch_memberships: Record<string, boolean> };
type Invitation = { id: string; email: string; role: string; note: string | null; created_at: string };
type Structure = { branches: Branch[]; members: Member[]; invitations: Invitation[] };

export default function OrganizationStructurePanel({ organizationId, organizationName, organizationSlug, onOrganizationRenamed }: { organizationId: string; organizationName: string; organizationSlug: string; onOrganizationRenamed: (name: string, slug: string) => void }) {
  const [data, setData] = useState<Structure>({ branches: [], members: [], invitations: [] });
  const [selectedBranch, setSelectedBranch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [branchName, setBranchName] = useState("");
  const [branchSlug, setBranchSlug] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [warehouseCode, setWarehouseCode] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerCode, setRegisterCode] = useState("");
  const [organizationNameDraft, setOrganizationNameDraft] = useState(organizationName);
  const [organizationSlugDraft, setOrganizationSlugDraft] = useState(organizationSlug);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("cashier");
  const [inviteNote, setInviteNote] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<Structure>(`/api/orgs/${encodeURIComponent(organizationId)}/structure`);
      setData(result);
      setSelectedBranch((current) => result.branches.some((branch) => branch.id === current) ? current : result.branches[0]?.id ?? "");
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo cargar la estructura.");
    } finally { setLoading(false); }
  }, [organizationId]);

  useEffect(() => { void refresh(); }, [refresh]);
  useEffect(() => { setOrganizationNameDraft(organizationName); setOrganizationSlugDraft(organizationSlug); }, [organizationName, organizationSlug]);

  async function mutate(path: string, method: "POST" | "PATCH", body: unknown, success: string) {
    setSaving(true); setError(""); setNotice("");
    try {
      await apiRequest(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      await refresh();
      setNotice(success);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No se pudo guardar el cambio.");
      return false;
    } finally { setSaving(false); }
  }


  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ok = await mutate(`/api/orgs/${encodeURIComponent(organizationId)}`, "PATCH",
      { name: organizationNameDraft, slug: organizationSlugDraft.toLowerCase().trim() }, "Nombre del negocio actualizado.");
    if (ok) onOrganizationRenamed(organizationNameDraft.trim(), organizationSlugDraft.toLowerCase().trim());
  }
  async function submitInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await mutate(`/api/orgs/${encodeURIComponent(organizationId)}/members/invite`, "POST",
      { email: inviteEmail.trim().toLowerCase(), role: inviteRole, note: inviteNote.trim() || null },
      "Invitación o acceso del miembro actualizado.")) {
      setInviteEmail(""); setInviteNote("");
    }
  }
  async function updateMember(member: Member, role: string, active: boolean) {
    await mutate(`/api/orgs/${encodeURIComponent(organizationId)}/members/${member.user_id}`, "PATCH",
      { role, is_active: active }, active ? "Acceso del miembro actualizado." : "Miembro desactivado.");
  }
  async function revokeInvitation(invitation: Invitation) {
    await mutate(`/api/orgs/${encodeURIComponent(organizationId)}/invitations/${invitation.id}/revoke`, "POST", {},
      "Invitación revocada.");
  }

  async function submitBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await mutate(`/api/orgs/${encodeURIComponent(organizationId)}/branches`, "POST", { name: branchName, slug: branchSlug }, "Sucursal creada.")) {
      setBranchName(""); setBranchSlug("");
    }
  }
  async function submitChild(kind: "warehouses" | "registers", event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedBranch) return;
    const isWarehouse = kind === "warehouses";
    const ok = await mutate(
      `/api/orgs/${encodeURIComponent(organizationId)}/branches/${selectedBranch}/${kind}`,
      "POST",
      { name: isWarehouse ? warehouseName : registerName, code: isWarehouse ? warehouseCode : registerCode },
      isWarehouse ? "Almacén creado." : "Caja creada.",
    );
    if (ok && isWarehouse) { setWarehouseName(""); setWarehouseCode(""); }
    if (ok && !isWarehouse) { setRegisterName(""); setRegisterCode(""); }
  }
  async function setAssignment(member: Member, active: boolean) {
    if (!selectedBranch) return;
    await mutate(
      `/api/orgs/${encodeURIComponent(organizationId)}/branches/${selectedBranch}/members/${member.user_id}`,
      "PATCH", { is_active: active },
      active ? "Asignación activada." : "Asignación desactivada.",
    );
  }

  const branch = data.branches.find((item) => item.id === selectedBranch) ?? null;

  return (
    <section className="organization-structure" aria-labelledby="organization-structure-title">
      <header className="organization-structure-header">
        <div><p className="eyebrow">ADMINISTRACIÓN DEL NEGOCIO</p><h1 id="organization-structure-title">Estructura organizacional</h1>
          <p>Configura sucursales, almacenes, cajas y acceso de cada miembro por sucursal.</p></div>
        <button type="button" className="secondary-button" onClick={() => void refresh()} disabled={loading || saving}>Actualizar</button>
      </header>
      {error && <p className="form-alert error-alert" role="alert">{error}</p>}
      {notice && <p className="form-alert success-alert" role="status">{notice}</p>}
      {loading ? <p aria-live="polite">Cargando estructura…</p> : (
        <>
          <section className="structure-card">
            <h2>Nombre del local</h2>
            <form className="structure-form" onSubmit={submitOrganization}>
              <label>Nombre del negocio<input required maxLength={120} value={organizationNameDraft} onChange={e=>setOrganizationNameDraft(e.target.value)} /></label>
              <label>Código del negocio<input required maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={organizationSlugDraft} onChange={e=>setOrganizationSlugDraft(e.target.value.toLowerCase())} /></label>
              <button type="submit" disabled={saving}>Guardar nombre</button>
            </form>
          </section>
          <section className="structure-card">
            <h2>Equipo e invitaciones</h2>
            <form className="structure-form" onSubmit={submitInvitation}>
              <label>Correo electrónico<input type="email" required maxLength={320} value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)} placeholder="persona@negocio.com" /></label>
              <label>Rol<select value={inviteRole} onChange={e=>setInviteRole(e.target.value)}><option value="admin">Admin</option><option value="cashier">Cajero</option><option value="inventory">Inventario</option></select></label>
              <label>Nota opcional<input maxLength={500} value={inviteNote} onChange={e=>setInviteNote(e.target.value)} /></label>
              <button type="submit" disabled={saving}>Invitar miembro</button>
            </form>
            <h3>Miembros</h3>
            <div className="structure-members">
              {data.members.map(member=><div className="structure-member" key={member.user_id}>
                <span><strong>{member.display_name}</strong><small>{member.email} · {member.role}{member.organization_active ? " · Activo" : " · Inactivo"}</small></span>
                {member.role!=="owner" && <span className="structure-member-actions">
                  <select aria-label={`Rol de ${member.display_name}`} value={member.role} disabled={saving||!member.organization_active}
                    onChange={e=>void updateMember(member,e.target.value,member.organization_active)}>
                    <option value="admin">Admin</option><option value="cashier">Cajero</option><option value="inventory">Inventario</option>
                  </select>
                  <button type="button" className={member.organization_active?"secondary-button":"primary-button"} disabled={saving}
                    onClick={()=>void updateMember(member,member.role,!member.organization_active)}>{member.organization_active?"Desactivar":"Activar"}</button>
                </span>}
              </div>)}
            </div>
            <h3>Invitaciones pendientes</h3>
            <ul className="structure-list">
              {data.invitations.map(inv=><li key={inv.id}><span>{inv.email}<small>{inv.role}{inv.note? ` · ${inv.note}`:""}</small></span>
                <button type="button" className="secondary-button" disabled={saving} onClick={()=>void revokeInvitation(inv)}>Revocar</button></li>)}
            </ul>
            {data.invitations.length===0&&<p className="structure-empty">No hay invitaciones pendientes.</p>}
          </section>
          {data.branches.length === 0 && (
            <div className="structure-onboarding">
              <p className="eyebrow">PRIMER PASO</p><h2>Comienza creando tu primera sucursal</h2>
              <p>Después podrás agregar sus almacenes y cajas, y asignar miembros para que operen únicamente donde corresponda.</p>
            </div>
          )}
          <section className="structure-card">
            <h2>1. Sucursales</h2>
            <form className="structure-form" onSubmit={submitBranch}>
              <label>Nombre de la sucursal<input required maxLength={120} value={branchName} onChange={(e) => setBranchName(e.target.value)} placeholder="Ej. Sucursal Centro" /></label>
              <label>Código / slug<input required maxLength={80} value={branchSlug} onChange={(e) => setBranchSlug(e.target.value)} placeholder="sucursal-centro" /></label>
              <button type="submit" disabled={saving}>Crear sucursal</button>
            </form>
            {data.branches.length > 0 && <label className="structure-branch-select">Sucursal activa en esta vista
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}>
                {data.branches.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.slug}</option>)}
              </select>
            </label>}
          </section>
          {branch && <>
            <div className="structure-two-column">
              <section className="structure-card">
                <h2>2. Almacenes · {branch.name}</h2>
                <form className="structure-form" onSubmit={(e) => void submitChild("warehouses", e)}>
                  <label>Nombre<input required maxLength={120} value={warehouseName} onChange={(e) => setWarehouseName(e.target.value)} placeholder="Almacén principal" /></label>
                  <label>Código<input required maxLength={80} value={warehouseCode} onChange={(e) => setWarehouseCode(e.target.value)} placeholder="principal" /></label>
                  <button type="submit" disabled={saving}>Crear almacén</button>
                </form>
                <ul className="structure-list">{branch.warehouses.map((item) => <li key={item.id}><span>{item.name}<small>{item.code}</small></span><span>{item.is_active ? "Activo" : "Inactivo"}</span></li>)}</ul>
                {branch.warehouses.length === 0 && <p className="structure-empty">Aún no hay almacenes en esta sucursal.</p>}
              </section>
              <section className="structure-card">
                <h2>3. Cajas · {branch.name}</h2>
                <form className="structure-form" onSubmit={(e) => void submitChild("registers", e)}>
                  <label>Nombre<input required maxLength={120} value={registerName} onChange={(e) => setRegisterName(e.target.value)} placeholder="Caja principal" /></label>
                  <label>Código<input required maxLength={80} value={registerCode} onChange={(e) => setRegisterCode(e.target.value)} placeholder="caja-principal" /></label>
                  <button type="submit" disabled={saving}>Crear caja</button>
                </form>
                <ul className="structure-list">{branch.registers.map((item) => <li key={item.id}><span>{item.name}<small>{item.code}</small></span><span>{item.is_active ? "Activa" : "Inactiva"}</span></li>)}</ul>
                {branch.registers.length === 0 && <p className="structure-empty">Aún no hay cajas en esta sucursal.</p>}
              </section>
            </div>
            <section className="structure-card">
              <h2>4. Miembros y asignaciones · {branch.name}</h2>
              <p>Activa o desactiva el acceso de cada miembro a esta sucursal. Un miembro con un turno abierto no puede ser desasignado.</p>
              <div className="structure-members">
                {data.members.filter((member) => member.organization_active).map((member) => {
                  const active = member.branch_memberships[branch.id] === true;
                  return <div className="structure-member" key={member.user_id}>
                    <span><strong>{member.display_name}</strong><small>{member.email} · {member.role}</small></span>
                    <button type="button" className={active ? "secondary-button" : "primary-button"} disabled={saving}
                      onClick={() => void setAssignment(member, !active)}>{active ? "Quitar de sucursal" : "Asignar a sucursal"}</button>
                  </div>;
                })}
                {data.members.filter((member) => member.organization_active).length === 0 && <p className="structure-empty">No hay miembros activos para asignar.</p>}
              </div>
            </section>
          </>}
        </>
      )}
    </section>
  );
}
