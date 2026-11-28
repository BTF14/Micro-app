import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "./auth";

type Overview = {
  organizations: Array<{id:string;name:string;slug:string;is_active:boolean;member_count:number;branch_count:number;owner:{email:string;display_name:string}|null;pending_owner_invitation:{email:string}|null}>;
  admins: Array<{user_id:string;email:string;display_name:string;is_active:boolean;note:string|null}>;
  audit_logs: Array<{id:number;action:string;actor_email:string;created_at:string;metadata:Record<string,unknown>}>;
};
function auditDetail(action:string,metadata:Record<string,unknown>):string {
 const text=(key:string)=>typeof metadata[key]==="string"?String(metadata[key]):"";
 switch(action){case "organization.created":return `Organización creada${text("owner_email")?` para ${text("owner_email")}`:""}.`;case "organization.active_updated":return `Estado de organización actualizado: ${metadata.is_active===true?"activa":"suspendida"}.`;case "platform_admin.access_updated":return `Acceso de administrador ${metadata.is_active===true?"concedido o activado":"revocado"}.`;default:return action.replaceAll("_"," ").replaceAll("."," · ");}
}
function auditDate(value:string):string{return new Intl.DateTimeFormat("es-VE",{dateStyle:"short",timeStyle:"short",timeZone:"America/Caracas"}).format(new Date(value));}
export default function PlatformAdminPanel({onOrganizationsChanged}:{onOrganizationsChanged?:()=>Promise<void>|void}={}){
 const [data,setData]=useState<Overview|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const [name,setName]=useState(""),[slug,setSlug]=useState(""),[ownerEmail,setOwnerEmail]=useState(""),[note,setNote]=useState("");
 const [adminEmail,setAdminEmail]=useState("");
 async function refresh(){setError("");try{setData(await apiRequest<Overview>("/api/platform/overview"));setError("");}catch(e){setError(e instanceof Error?e.message:"No se pudo cargar la plataforma.");}}
 useEffect(()=>{void refresh();},[]);
 async function submitOrganization(event:FormEvent){event.preventDefault();setError("");setBusy(true);try{await apiRequest("/api/platform/organizations",{method:"POST",body:JSON.stringify({name,slug,owner_email:ownerEmail,note:note||null})});setName("");setSlug("");setOwnerEmail("");setNote("");await refresh();await onOrganizationsChanged?.();}catch(e){setError(e instanceof Error?e.message:"No se pudo crear la organización.");}finally{setBusy(false);}}
 async function setOrganizationActive(id:string,is_active:boolean){setError("");setBusy(true);try{await apiRequest("/api/platform/organizations/"+encodeURIComponent(id),{method:"PATCH",body:JSON.stringify({is_active})});await refresh();await onOrganizationsChanged?.();}catch(e){setError(e instanceof Error?e.message:"No se pudo actualizar la organización.");}finally{setBusy(false);}}
 async function setAdminActive(email:string,is_active:boolean){setError("");setBusy(true);try{await apiRequest("/api/platform/admins",{method:"POST",body:JSON.stringify({email,is_active})});await refresh();}catch(e){setError(e instanceof Error?e.message:"No se pudo actualizar el administrador.");}finally{setBusy(false);}}
 return <section className="platform-admin" aria-labelledby="platform-admin-title">
  <header><p className="eyebrow">CONTROL GLOBAL</p><h1 id="platform-admin-title">Administración de plataforma</h1><p className="platform-muted">Gestiona organizaciones y administradores. La vista no expone datos operativos de ventas.</p></header>
  {error&&<p className="platform-alert" role="alert">{error}</p>}
  <section className="platform-admin-card"><h2>Crear organización</h2><form className="platform-admin-form" onSubmit={submitOrganization}>
   <label>Nombre<input required maxLength={120} value={name} onChange={e=>setName(e.target.value)}/></label>
   <label>Código<input required maxLength={80} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={e=>setSlug(e.target.value)}/></label>
   <label>Correo del Owner<input required type="email" maxLength={320} value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)}/></label>
   <label>Nota (opcional)<input maxLength={500} value={note} onChange={e=>setNote(e.target.value)}/></label>
   <button type="submit" disabled={busy}>Crear organización</button>
  </form></section>
  <section className="platform-admin-card"><h2>Organizaciones</h2><div className="platform-admin-table-wrap"><table><thead><tr><th>Negocio</th><th>Estado</th><th>Miembros</th><th>Sucursales</th><th>Owner</th><th>Acción</th></tr></thead><tbody>{data?.organizations.map(o=><tr key={o.id}><td>{o.name}<br/><small>{o.slug}</small></td><td>{o.is_active?"Activa":"Suspendida"}</td><td>{o.member_count}</td><td>{o.branch_count}</td><td>{o.owner?.email??o.pending_owner_invitation?.email??"Pendiente"}</td><td><button type="button" disabled={busy} onClick={()=>void setOrganizationActive(o.id,!o.is_active)}>{o.is_active?"Suspender":"Reactivar"}</button></td></tr>)}</tbody></table></div></section>
  <section className="platform-admin-card"><h2>Administradores de plataforma</h2><form className="platform-admin-form" onSubmit={async e=>{e.preventDefault();const email=adminEmail.trim();if(!email)return;setError("");setBusy(true);try{await apiRequest("/api/platform/admins",{method:"POST",body:JSON.stringify({email,is_active:true})});setAdminEmail("");await refresh();}catch(reason){setError(reason instanceof Error?reason.message:"No se pudo actualizar el administrador.");}finally{setBusy(false);}}}><label>Correo Google existente<input type="email" required value={adminEmail} onChange={e=>setAdminEmail(e.target.value)}/></label><button disabled={busy}>Conceder acceso</button></form><div className="platform-admin-table-wrap"><table><thead><tr><th>Cuenta</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{data?.admins.map(a=><tr key={a.user_id}><td>{a.display_name}<br/><small>{a.email}</small></td><td>{a.is_active?"Activo":"Inactivo"}</td><td><button type="button" disabled={busy} onClick={()=>void setAdminActive(a.email,!a.is_active)}>{a.is_active?"Revocar":"Activar"}</button></td></tr>)}</tbody></table></div></section>
  <section className="platform-admin-card"><h2>Auditoría reciente</h2><div className="platform-admin-table-wrap"><table><thead><tr><th>Fecha</th><th>Actor</th><th>Acción</th><th>Detalle</th></tr></thead><tbody>{data?.audit_logs.map(a=><tr key={a.id}><td>{auditDate(a.created_at)}</td><td>{a.actor_email}</td><td>{a.action}</td><td>{auditDetail(a.action,a.metadata)}</td></tr>)}</tbody></table></div></section>
 </section>;
}
