// @vitest-environment jsdom
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {act} from "react";
import {createRoot,type Root} from "react-dom/client";
import ReportsPanel from "./ReportsPanel";
import {apiDownload,apiRequest} from "./auth";
vi.mock("./auth",()=>({apiRequest:vi.fn(),apiDownload:vi.fn()}));
const org="11111111-1111-4111-8111-111111111111",branch="22222222-2222-4222-8222-222222222222",shift="33333333-3333-4333-8333-333333333333";
let root:Root,container:HTMLDivElement,currentRole:"owner"|"admin"|"inventory"|"cashier"="owner";
const closed={id:shift,branch_id:branch,branch_name:"Principal",register_name:"Caja 1",cashier_name:"Ana",opened_at:"2026-11-21T12:00:00Z",closed_at:"2026-11-21T13:00:00Z",opening_cash_usd:"10.0000",opening_cash_ves:"100.00",closing_cash_usd:"8.0000",closing_cash_ves:"90.00"};
beforeEach(()=>{container=document.createElement("div");document.body.appendChild(container);root=createRoot(container);vi.mocked(apiRequest).mockImplementation(async(p:string)=>{if(p.includes("/register-shifts?"))return{items:[closed]} as never;if(p.includes("closure-summary"))return{shift:closed,completed_sales_count:"2",non_completed_sales_count:"1",total_usd:"20.0000",total_ves_snapshot:"2000.00",payments:[],fx_breakdown:[],sale_snapshots:[{settlement_currency:"VES",fx_source:"bcv_official",exchange_rate_snapshot:"918.76620000",exchange_rate_effective_date:"2026-11-20"},{settlement_currency:"VES",fx_source:"bcv_official",exchange_rate_snapshot:"918.76620000",exchange_rate_effective_date:"2026-11-20"},{settlement_currency:"VES",fx_source:"bcv_official",exchange_rate_snapshot:"918.76620000",exchange_rate_effective_date:"2026-11-20"}],expected_cash_usd:"10.0000",expected_cash_ves:"100.00",difference_cash_usd:"-2.0000",difference_cash_ves:"-10.00"} as never;if(p.includes("/reports/sales"))return{items:[],total_usd:"0",total_ves_snapshot:"0",excluded_non_completed_count:"0"} as never;if(p.includes("/branches"))return{items:[]} as never;return{items:[],include_valuation:currentRole==="owner",total_retail_valuation_usd:"0",total_cost_valuation_usd:"0"} as never})});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();vi.unstubAllGlobals();vi.restoreAllMocks()});
async function render(role:"owner"|"admin"|"inventory"|"cashier"){currentRole=role;await act(async()=>root.render(<ReportsPanel organizationId={org} role={role} initialShift={{branchId:branch,shiftId:shift}}/>))}
function button(name:string){const b=Array.from(container.querySelectorAll("button")).find(x=>x.textContent?.trim()===name);if(!b)throw new Error("Missing button "+name);return b}
describe("ReportsPanel",()=>{
 it("shows valuation to Owner",async()=>{await render("owner");await act(async()=>button("Inventario y valoración").click());expect(container.textContent).toContain("Valoración al costo")});
 it("hides cost valuation for Admin",async()=>{await render("admin");await act(async()=>button("Inventario").click());expect(container.textContent).toContain("Inventario");expect(container.textContent).not.toContain("Valoración al costo")});
 it("limits Inventory to inventory reports",async()=>{await render("inventory");expect(container.textContent).not.toContain("Cierres de caja");expect(container.textContent).not.toContain("Ventas")});
 it("limits Cashier to own shifts and sales",async()=>{await render("cashier");expect(container.textContent).toContain("Mis ventas");expect(container.textContent).not.toContain("Inventario")});
 it("formats negative differences and FISC-01 notice",async()=>{await render("owner");expect(container.textContent).toContain("−2,00");expect(container.textContent).toContain("COMPROBANTE DE CONTROL INTERNO — NO ES FACTURA FISCAL")});
 it("does not warn or render an empty sales table before custom dates are submitted",async()=>{
  await render("owner");
  await act(async()=>button("Ventas").click());
  const period=container.querySelector<HTMLSelectElement>(".reports-filters select");
  await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")!.set!.call(period,"custom");period!.dispatchEvent(new Event("change",{bubbles:true}))});
  expect(container.querySelector('[role="alert"]')).toBeNull();
  expect(container.querySelector(".reports-table-wrap")).toBeNull();
  await act(async()=>button("Consultar período").click());
  expect(container.querySelector('[role="alert"]')?.textContent).toContain("Indica las fechas y horas Desde y Hasta.");
 });
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
  vi.mocked(apiDownload).mockResolvedValue(new Blob(["csv"]));
  Object.defineProperty(URL,"createObjectURL",{configurable:true,value:vi.fn(()=>"blob:test")});
  Object.defineProperty(URL,"revokeObjectURL",{configurable:true,value:vi.fn()});
  const click=vi.spyOn(HTMLAnchorElement.prototype,"click").mockImplementation(()=>{});
  await act(async()=>button("Exportar CSV").click());
  expect(apiDownload).toHaveBeenCalledWith(expect.stringContaining("/reports/sales.csv"));
  expect(click.mock.instances[0].download).toMatch(/^reporte-ventas-diario-\d{4}-\d{2}-\d{2}\.csv$/);
  expect(click).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
 });

 it("hides Fecha base for custom periods",async()=>{await render("owner");await act(async()=>button("Ventas").click());const p=container.querySelector<HTMLSelectElement>(".reports-filters select");await act(async()=>{Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value")!.set!.call(p,"custom");p!.dispatchEvent(new Event("change",{bubbles:true}))});expect([...container.querySelectorAll(".reports-field span")].some(x=>x.textContent==="Fecha base")).toBe(false);expect([...container.querySelectorAll(".reports-field span")].map(x=>x.textContent)).toEqual(expect.arrayContaining(["Desde","Hasta"]))});
 it("shows explicit empty states for sales and inventory",async()=>{await render("owner");await act(async()=>button("Ventas").click());expect(container.textContent).toContain("No hay ventas completadas para el período seleccionado.");await act(async()=>button("Inventario y valoración").click());expect(container.textContent).toContain("No hay productos con inventario registrado en este alcance.")});
 it("shows empty payment and FX history messages instead of empty tables",async()=>{
  vi.mocked(apiRequest).mockImplementation(async(p:string)=>{if(p.includes("/register-shifts?"))return{items:[closed]} as never;if(p.includes("closure-summary"))return{shift:closed,completed_sales_count:"0",non_completed_sales_count:"0",total_usd:"0",total_ves_snapshot:"0",payments:[],fx_breakdown:[],sale_snapshots:[],expected_cash_usd:"10.0000",expected_cash_ves:"100.00",difference_cash_usd:"0",difference_cash_ves:"0"} as never;if(p.includes("/branches"))return{items:[]} as never;return{items:[],include_valuation:false,total_retail_valuation_usd:"0"} as never});
  await render("owner");expect(container.textContent).toContain("Sin pagos registrados en este turno.");expect(container.textContent).toContain("Sin movimientos cambiarios registrados en este turno.");expect(container.querySelector(".reports-payments-table")).toBeNull();
 });
 it("temporarily changes the PDF title and restores it after afterprint",async()=>{
  await render("owner");const originalTitle=document.title;const print=vi.spyOn(window,"print").mockImplementation(()=>{});
  await act(async()=>button("Imprimir / PDF").click());expect(print).toHaveBeenCalledOnce();expect(document.title).toMatch(/^cierre-caja-principal-\d{4}-\d{2}-\d{2}$/);
  window.dispatchEvent(new Event("afterprint"));expect(document.title).toBe(originalTitle);
 });
 it("groups identical snapshots and formats their effective date in es-VE",async()=>{await render("owner");expect(container.textContent).toContain("3 ventas · VES · 20/11/2026 · Tasa histórica: 918,7662 Bs./USD")});
 it("uses two decimals for commercial amounts and four for costs",async()=>{vi.mocked(apiRequest).mockImplementation(async(p:string)=>{if(p.includes("/register-shifts?"))return{items:[closed]} as never;if(p.includes("closure-summary"))return{shift:closed,completed_sales_count:"1",non_completed_sales_count:"0",total_usd:"12.3456",total_ves_snapshot:"1234.567",payments:[],fx_breakdown:[],sale_snapshots:[],expected_cash_usd:"10.9876",expected_cash_ves:"100",difference_cash_usd:"1.2345",difference_cash_ves:"0"} as never;if(p.includes("/reports/sales"))return{items:[{sale_number:"V-1",completed_at:"2026-11-20T12:00:00Z",branch_name:"Principal",cashier_name:"Ana",total_usd:"9.8765",total_ves_snapshot:"900"}],total_usd:"12.3456",total_ves_snapshot:"1234.567",excluded_non_completed_count:"0"} as never;if(p.includes("/branches"))return{items:[]} as never;return{items:[{branch_name:"Principal",warehouse_name:"General",sku:"SKU-1",product_name:"Producto",on_hand:"17.000",reserved:"2.750",available:"14.250",price_usd:"5.6789",retail_valuation_usd:"5.6789",cost_usd:"1.23456",cost_valuation_usd:"2.34567"}],include_valuation:true,total_retail_valuation_usd:"5.6789",total_cost_valuation_usd:"2.34567"} as never});await render("owner");expect(container.textContent).toContain("US$ 10,99");expect(container.textContent).toContain("US$ 1,23");await act(async()=>button("Ventas").click());expect(container.textContent).toContain("US$ 12,35");expect(container.textContent).toContain("9,88");await act(async()=>button("Inventario y valoración").click());expect(container.textContent).toContain("17");expect(container.textContent).toContain("2,75");expect(container.textContent).toContain("1,2346");expect(container.textContent).toContain("2,3457");expect(container.textContent).not.toContain("17,000")});
 it("uses singular wording in the FX currency breakdown",async()=>{
  vi.mocked(apiRequest).mockImplementation(async(p:string)=>{if(p.includes("/register-shifts?"))return{items:[closed]} as never;if(p.includes("closure-summary"))return{shift:closed,completed_sales_count:"1",non_completed_sales_count:"0",total_usd:"1",total_ves_snapshot:"1",payments:[],fx_breakdown:[{settlement_currency:"USD",fx_source:"bcv_official",sales_count:"1",total_usd:"1",total_ves_snapshot:"1"}],expected_cash_usd:"0",expected_cash_ves:"0",difference_cash_usd:"0",difference_cash_ves:"0"} as never;if(p.includes("/branches"))return{items:[]} as never;return{items:[],include_valuation:false,total_retail_valuation_usd:"0"} as never});
  await render("owner"); expect(container.textContent).toContain("1 venta · US$"); expect(container.textContent).not.toContain("1 ventas");
 });
 it("uses singular snapshot wording and never displays negative rounded zero",async()=>{
  vi.mocked(apiRequest).mockImplementation(async(p:string)=>{if(p.includes("/register-shifts?"))return{items:[closed]} as never;if(p.includes("closure-summary"))return{shift:closed,completed_sales_count:"1",non_completed_sales_count:"0",total_usd:"0",total_ves_snapshot:"0",payments:[],fx_breakdown:[],sale_snapshots:[{settlement_currency:"USD",fx_source:"bcv_official",exchange_rate_snapshot:"1.00000000",exchange_rate_effective_date:"2026-11-20"}],expected_cash_usd:"0",expected_cash_ves:"0",difference_cash_usd:"-0.001",difference_cash_ves:"0"} as never;if(p.includes("/branches"))return{items:[]} as never;return{items:[],include_valuation:false,total_retail_valuation_usd:"0"} as never});
  await render("owner");
  expect(container.textContent).toContain("1 venta · USD");
  expect(container.textContent).not.toContain("1 ventas");
  expect(container.textContent).toContain("0,00");
  expect(container.textContent).not.toContain("−0,00");
 });

});
