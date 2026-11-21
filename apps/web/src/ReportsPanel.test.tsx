// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import ReportsPanel from "./ReportsPanel";
import {apiRequest} from "./auth";
vi.mock("./auth",()=>({apiRequest:vi.fn()}));
const org="11111111-1111-4111-8111-111111111111",branch="22222222-2222-4222-8222-222222222222",shift="33333333-3333-4333-8333-333333333333";
let root:Root,container:HTMLDivElement,currentRole:"owner"|"admin"|"inventory"|"cashier"="owner";
const closed={id:shift,branch_id:branch,branch_name:"Principal",register_name:"Caja 1",cashier_name:"Ana",opened_at:"2026-11-21T12:00:00Z",closed_at:"2026-11-21T13:00:00Z",opening_cash_usd:"10.0000",opening_cash_ves:"100.00",closing_cash_usd:"8.0000",closing_cash_ves:"90.00"};
beforeEach(()=>{container=document.createElement("div");document.body.appendChild(container);root=createRoot(container);vi.mocked(apiRequest).mockImplementation(async(p:string)=>{if(p.includes("/register-shifts?"))return{items:[closed]} as never;if(p.includes("closure-summary"))return{shift:closed,completed_sales_count:"2",non_completed_sales_count:"1",total_usd:"20.0000",total_ves_snapshot:"2000.00",payments:[],fx_breakdown:[],expected_cash_usd:"10.0000",expected_cash_ves:"100.00",difference_cash_usd:"-2.0000",difference_cash_ves:"-10.00"} as never;if(p.includes("/reports/sales"))return{items:[],total_usd:"0",total_ves_snapshot:"0",excluded_non_completed_count:"0"} as never;if(p.includes("/branches"))return{items:[]} as never;return{items:[],include_valuation:currentRole==="owner",total_retail_valuation_usd:"0",total_cost_valuation_usd:"0"} as never})});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();vi.restoreAllMocks()});
async function render(role:"owner"|"admin"|"inventory"|"cashier"){currentRole=role;await act(async()=>root.render(<ReportsPanel organizationId={org} role={role} initialShift={{branchId:branch,shiftId:shift}}/>))}
function button(name:string){const b=Array.from(container.querySelectorAll("button")).find(x=>x.textContent?.trim()===name);if(!b)throw new Error("Missing button "+name);return b}
describe("ReportsPanel",()=>{
 it("shows valuation to Owner",async()=>{await render("owner");await act(async()=>button("Inventario y valoración").click());expect(container.textContent).toContain("Valoración al costo")});
 it("hides cost valuation for Admin",async()=>{await render("admin");await act(async()=>button("Inventario").click());expect(container.textContent).toContain("Inventario");expect(container.textContent).not.toContain("Valoración al costo")});
 it("limits Inventory to inventory reports",async()=>{await render("inventory");expect(container.textContent).not.toContain("Cierres de caja");expect(container.textContent).not.toContain("Ventas")});
 it("limits Cashier to own shifts and sales",async()=>{await render("cashier");expect(container.textContent).toContain("Mis ventas");expect(container.textContent).not.toContain("Inventario")});
 it("formats negative differences and FISC-01 notice",async()=>{await render("owner");expect(container.textContent).toContain("−2,00");expect(container.textContent).toContain("COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL")});
 it("supports custom Caracas period and authenticated CSV download",async()=>{
  await render("owner");
  await act(async()=>button("Ventas").click());
  const period=container.querySelector<HTMLSelectElement>(".reports-filters select");
  expect(period).toBeTruthy();
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")!.set!.call(period,"custom");period!.dispatchEvent(new Event("change",{bubbles:true}))});
  const dates=container.querySelectorAll<HTMLInputElement>('input[type="datetime-local"]');
  await act(async()=>{const setValue=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")!.set!;setValue.call(dates[0],"2026-11-20T08:00");dates[0].dispatchEvent(new Event("input",{bubbles:true}));setValue.call(dates[1],"2026-11-21T18:00");dates[1].dispatchEvent(new Event("input",{bubbles:true}))});
  await act(async()=>button("Consultar período").click());
  expect(vi.mocked(apiRequest).mock.calls.some(call=>String(call[0]).includes("period=custom")&&String(call[0]).includes("from=2026-11-20T08%3A00"))).toBe(true);
  const fetchMock=vi.fn().mockResolvedValue({ok:true,blob:async()=>new Blob(["csv"])});
  vi.stubGlobal("fetch",fetchMock);
  Object.defineProperty(URL,"createObjectURL",{configurable:true,value:vi.fn(()=>"blob:test")});
  Object.defineProperty(URL,"revokeObjectURL",{configurable:true,value:vi.fn()});
  const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});
  await act(async()=>button("Exportar CSV").click());
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/reports/sales.csv"),{credentials:"include",cache:"no-store"});
  expect(click).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
 });
});
