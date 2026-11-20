// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import QuickProductLookup from "./QuickProductLookup";
let container:HTMLDivElement,root:Root;
const ORG="11111111-2222-4333-8444-555555555555",BRANCH="22222222-3333-4444-8555-666666666666",WAREHOUSE="33333333-4444-4555-8666-777777777777";
const product={product_id:"00000000-0000-4000-8000-000000000001",is_active:true,sku:"SKU-1",barcode:"750123",name:"Café molido",unit:"bolsa",quantity_mode:"fractional",price_usd:"4.2500",available_quantity:"0.000",cost_usd:"0.7500"};
const json=(body:unknown)=>new Response(JSON.stringify(body),{status:200,headers:{"Content-Type":"application/json"}});
const settle=()=>act(async()=>{await new Promise(r=>setTimeout(r,0));});
async function render(status:"current"|"stale"|"unavailable",rate:string|null){await act(async()=>{root.render(<QuickProductLookup organizationId={ORG} exchangeRate={rate} exchangeRateStatus={status}/>);});await settle();await settle();}
async function search(){const input=container.querySelector<HTMLInputElement>("#quick-product-search");if(!input)throw Error("lookup input missing");const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;await act(async()=>{setter?.call(input,"750123");input.dispatchEvent(new Event("input",{bubbles:true}));});await act(async()=>{await new Promise(r=>setTimeout(r,220));});await settle();}
beforeEach(()=>{container=document.createElement("div");document.body.appendChild(container);root=createRoot(container);window.localStorage.clear();vi.stubGlobal("fetch",vi.fn());});
afterEach(async()=>{vi.useRealTimers();await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();window.localStorage.clear();});
describe("QuickProductLookup",()=>{
 it("renders Agotado and a current BCV conversion without exposing cost_usd",async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(json({branches:[{id:BRANCH,name:"Central",slug:"central"}]})).mockResolvedValueOnce(json({warehouses:[{id:WAREHOUSE,code:"main",name:"Principal",is_active:true}]})).mockResolvedValueOnce(json({items:[product],nextCursor:null,limit:30}));
  await render("current","36.50000000");expect(document.activeElement).toBe(container.querySelector("#quick-product-search"));await search();expect(container.textContent).toContain("Café molido");expect(container.textContent).toContain("US$ 4,25");expect(container.textContent).toContain("Bs. 155,13");expect(container.textContent).toContain("Agotado");expect(container.textContent).not.toContain("0,75");expect(container.textContent).not.toContain("cost_usd");
  const url=String(vi.mocked(fetch).mock.calls[2]?.[0]);expect(url).toContain("limit=30");expect(url).toContain("active_only=true");expect(url).toContain("sort=relevance");
 });
 it.each(["stale","unavailable"] as const)("does not convert with %s BCV status",async status=>{
  vi.mocked(fetch).mockResolvedValueOnce(json({branches:[{id:BRANCH,name:"Central",slug:"central"}]})).mockResolvedValueOnce(json({warehouses:[{id:WAREHOUSE,code:"main",name:"Principal",is_active:true}]})).mockResolvedValueOnce(json({items:[product],nextCursor:null,limit:30}));
  await render(status,"36.50000000");await search();expect(container.textContent).toContain(status==="stale"?"Tasa BCV desactualizada":"Tasa BCV no disponible");expect(container.textContent).not.toContain("Bs. 155,13");
 });
 it("filters inactive warehouses and presents a selector for multiple active warehouses",async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(json({branches:[{id:BRANCH,name:"Central",slug:"central"}]})).mockResolvedValueOnce(json({warehouses:[{id:WAREHOUSE,code:"main",name:"Principal",is_active:true},{id:"44444444-5555-4666-8777-888888888888",code:"closed",name:"Cerrado",is_active:false},{id:"55555555-6666-4777-8888-999999999999",code:"second",name:"Secundario",is_active:true}]}));
  await render("unavailable",null);const select=container.querySelector<HTMLSelectElement>(".quick-lookup-scope select");expect(select).not.toBeNull();expect([...select!.options].map(o=>o.textContent)).toEqual(["Selecciona un almacén","Principal","Secundario"]);
 });

 it("does not show an empty-result message during the debounce window",async()=>{
  vi.mocked(fetch).mockResolvedValueOnce(json({branches:[{id:BRANCH,name:"Central",slug:"central"}]})).mockResolvedValueOnce(json({warehouses:[{id:WAREHOUSE,code:"main",name:"Principal",is_active:true}]})).mockResolvedValueOnce(json({items:[],nextCursor:null,limit:30}));
  await render("unavailable",null);
  vi.useFakeTimers();
  const input=container.querySelector<HTMLInputElement>("#quick-product-search")!;
  const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set;
  await act(async()=>{setter?.call(input,"sin-coincidencia");input.dispatchEvent(new Event("input",{bubbles:true}));});
  expect(container.textContent).not.toContain("No se encontraron productos activos.");
  await act(async()=>{await vi.advanceTimersByTimeAsync(199);});
  expect(container.textContent).not.toContain("No se encontraron productos activos.");
  await act(async()=>{await vi.advanceTimersByTimeAsync(1);});
  expect(container.textContent).toContain("No se encontraron productos activos.");
  vi.useRealTimers();
 });
 it("remains usable when localStorage access throws",async()=>{
  vi.spyOn(Storage.prototype,"getItem").mockImplementation(()=>{throw new Error("storage blocked");});
  vi.mocked(fetch).mockResolvedValueOnce(json({branches:[{id:BRANCH,name:"Central",slug:"central"}]})).mockResolvedValueOnce(json({warehouses:[{id:WAREHOUSE,code:"main",name:"Principal",is_active:true},{id:"55555555-6666-4777-8888-999999999999",code:"second",name:"Secundario",is_active:true}]}));
  await render("unavailable",null);
  expect(container.querySelector(".quick-lookup-scope select")).not.toBeNull();
  expect(container.textContent).not.toContain("storage blocked");
 });
});
