import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./auth";

type Warehouse = { id: string; name: string; code: string; is_active: boolean };
type Register = { id: string; name: string; code: string; is_active: boolean };
type Branch = { id: string; name: string; slug: string; is_active: boolean; warehouses: Warehouse[]; registers: Register[] };
type Member = { user_id: string; display_name: string; email: string; role: string; organization_active: boolean; branch_memberships: Record<string, boolean> };
type Structure = { branches: Branch[]; members: Member[] };

export default function OrganizationStructurePanel({ organizationId }: { organizationId: string }) {
  const [data, setData] = useState<Structure>({ branches: [], members: [] });
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

  async function submitBranch(event: React.FormEvent<HTMLFormElement>) {
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
