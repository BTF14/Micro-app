// @vitest-environment jsdom
import { act } from "react";
import { createRoot,type Root } from "react-dom/client";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import PlatformAdminPanel from "./PlatformAdminPanel";
function response(body:unknown){return new Response(JSON.stringify(body),{status:200,headers:{"Content-Type":"application/json"}});}
let root:Root;let host:HTMLDivElement;
beforeEach(()=>{host=document.createElement("div");document.body.append(host);root=createRoot(host);vi.stubGlobal("fetch",vi.fn().mockResolvedValue(response({organizations:[],admins:[],audit_logs:[]})));});
afterEach(async()=>{await act(async()=>root.unmount());host.remove();vi.unstubAllGlobals();});
describe("PlatformAdminPanel",()=>{
 it("loads the platform overview and exposes organization and administrator workflows",async()=>{
  await act(async()=>root.render(<PlatformAdminPanel/>));
  await act(async()=>{await Promise.resolve();});
  expect(host.textContent).toContain("Administración de plataforma");
  expect(host.textContent).toContain("Crear organización");
  expect(host.textContent).toContain("Administradores de plataforma");
  expect(host.textContent).toContain("Auditoría reciente");
 });

 it("clears a previous error on organization creation and refreshes the parent session",async()=>{
  vi.mocked(fetch)
   .mockResolvedValueOnce(new Response(JSON.stringify({message:"No se pudo cargar"}),{status:503,headers:{"Content-Type":"application/json"}}))
   .mockResolvedValueOnce(response({id:"org-2"}))
   .mockResolvedValueOnce(response({organizations:[],admins:[],audit_logs:[]}));
  const onOrganizationsChanged=vi.fn();
  await act(async()=>root.render(<PlatformAdminPanel onOrganizationsChanged={onOrganizationsChanged}/>));
  expect(host.querySelector('[role="alert"]')?.textContent).toBeTruthy();
  const values:Record<string,string>={"Nombre":"Nueva tienda","Código":"nueva-tienda","Correo del Owner":"owner@example.com"};
  for(const [label,value] of Object.entries(values)){
   const input=[...host.querySelectorAll("label")].find(x=>x.textContent?.includes(label))?.querySelector("input");
   if(!input)throw new Error(`Input ${label} not found`);
   const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
   setter?.call(input,value);
   input.dispatchEvent(new Event("input",{bubbles:true}));
  }
  const form=host.querySelector("form");
  if(!form)throw new Error("Organization form not found");
  await act(async()=>{form.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));});
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(onOrganizationsChanged).toHaveBeenCalledTimes(1);
 });

});
