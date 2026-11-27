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
});
