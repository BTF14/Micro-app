import { useCallback, useEffect, useRef, useState } from "react";
import { convertUsdToVes, formatDecimal, parseNumeric } from "@micro-app/money";
import { apiRequest } from "./auth";
import "./catalog.css";
type RateStatus = "current" | "stale" | "unavailable";
type Branch = { id: string; name: string; slug: string };
type Warehouse = { id: string; code: string; name: string; is_active: boolean };
export type QuickLookupProduct = { product_id: string; is_active: boolean; sku: string; barcode: string | null; name: string; unit: string; price_usd: string; available_quantity: string };
type Props = { organizationId: string; exchangeRate: string | null; exchangeRateStatus: RateStatus; onSelect?: (product: QuickLookupProduct) => void };
type Page = { items: QuickLookupProduct[]; nextCursor: string | null; limit: number };
function localDecimal(value: string) { const [whole = "0", fraction] = value.split("."); const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, "."); return fraction ? grouped + "," + fraction : grouped; }
function usd(value: string) { try { return localDecimal(formatDecimal(parseNumeric(value, 14, 4), 4, 2)); } catch { return "No disponible"; } }
function ves(value: string, rate: string) { try { return localDecimal(convertUsdToVes(value, rate)); } catch { return "No disponible"; } }
function zero(value: string) { try { return parseNumeric(value, 14, 3) <= 0n; } catch { return true; } }
export default function QuickProductLookup({ organizationId, exchangeRate, exchangeRateStatus, onSelect }: Props) {
  const [branches,setBranches]=useState<Branch[]>([]),[branchId,setBranchId]=useState("");
  const [warehouses,setWarehouses]=useState<Warehouse[]>([]),[warehouseId,setWarehouseId]=useState("");
  const [query,setQuery]=useState(""),[items,setItems]=useState<QuickLookupProduct[]>([]),[nextCursor,setNextCursor]=useState<string|null>(null);
  const [loading,setLoading]=useState(false),[error,setError]=useState("");
  const sequence=useRef(0),debounceTimer=useRef<number|null>(null),base=`/api/orgs/${encodeURIComponent(organizationId)}`;
  const storageKey=branchId?`micro-app:quick-lookup:warehouse:${organizationId}:${branchId}`:"";
  useEffect(()=>{let live=true;setBranches([]);setBranchId("");setWarehouses([]);setWarehouseId("");setItems([]);setNextCursor(null);setError("");
    if(!organizationId)return;
    apiRequest<{branches:Branch[]}>(`${base}/branches`).then(r=>{if(live){setBranches(r.branches);if(r.branches.length===1)setBranchId(r.branches[0]!.id);}})
      .catch(e=>{if(live)setError(e instanceof Error?e.message:"No se pudieron consultar las sucursales.");});
    return()=>{live=false;sequence.current++;};
  },[organizationId,base]);
  useEffect(()=>{let live=true;setWarehouses([]);setWarehouseId("");setItems([]);setNextCursor(null);setQuery("");
    if(!branchId)return;
    apiRequest<{warehouses:Warehouse[]}>(`${base}/branches/${encodeURIComponent(branchId)}/warehouses`).then(r=>{if(!live)return;
      const active=r.warehouses.filter(w=>w.is_active);setWarehouses(active);
      if(active.length===1)setWarehouseId(active[0]!.id);
      else if(active.length>1){const saved=window.localStorage.getItem(`micro-app:quick-lookup:warehouse:${organizationId}:${branchId}`);if(saved&&active.some(w=>w.id===saved))setWarehouseId(saved);}
    }).catch(e=>{if(live)setError(e instanceof Error?e.message:"No se pudieron consultar los almacenes.");});
    return()=>{live=false;sequence.current++;};
  },[base,branchId,organizationId]);
  useEffect(()=>{if(storageKey&&warehouses.length>1&&warehouseId)window.localStorage.setItem(storageKey,warehouseId);},[storageKey,warehouses.length,warehouseId]);
  const search=useCallback(async(term:string)=>{if(!branchId||!warehouseId)return;const id=++sequence.current;setLoading(true);setError("");setItems([]);setNextCursor(null);
    const params=new URLSearchParams({limit:"30",active_only:"true",sort:"relevance"});if(term.trim())params.set("q",term.trim());
    try{const page=await apiRequest<Page>(`${base}/branches/${encodeURIComponent(branchId)}/warehouses/${encodeURIComponent(warehouseId)}/inventory?${params}`);
      if(id===sequence.current){setItems(page.items);setNextCursor(page.nextCursor);}
    }catch(e){if(id===sequence.current)setError(e instanceof Error?e.message:"No se pudo consultar el precio y las existencias.");}
    finally{if(id===sequence.current)setLoading(false);}
  },[base,branchId,warehouseId]);
  useEffect(()=>{if(!warehouseId)return;const term=query.trim();if(!term){sequence.current++;setItems([]);setNextCursor(null);setLoading(false);setError("");return;}
    const timer=window.setTimeout(()=>{debounceTimer.current=null;void search(term);},200);debounceTimer.current=timer;return()=>{window.clearTimeout(timer);if(debounceTimer.current===timer)debounceTimer.current=null;sequence.current++;};
  },[query,search,warehouseId]);
  const clear=()=>{if(debounceTimer.current!==null)window.clearTimeout(debounceTimer.current);debounceTimer.current=null;sequence.current++;setQuery("");setItems([]);setNextCursor(null);setError("");setLoading(false);};
  const chooseBranch=(id:string)=>{sequence.current++;setBranchId(id);setWarehouseId("");clear();};
  const chooseWarehouse=(id:string)=>{sequence.current++;setWarehouseId(id);clear();};
  const canConvert=exchangeRateStatus==="current"&&exchangeRate!==null;
  return <section className="catalog-section quick-lookup" aria-labelledby="quick-lookup-title">
    <div className="catalog-heading"><div><p className="eyebrow">CONSULTA DE MOSTRADOR</p><h1 id="quick-lookup-title">Consultar precio</h1><p className="catalog-intro">Busca por nombre, SKU o código de barras y consulta precio y disponibilidad en un único almacén.</p></div></div>
    {branches.length>1&&<label className="quick-lookup-scope">Sucursal<select value={branchId} onChange={e=>chooseBranch(e.target.value)}><option value="">Selecciona una sucursal</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    {branches.length===1&&<p className="quick-lookup-context">Sucursal: <strong>{branches[0]!.name}</strong></p>}
    {branchId&&warehouses.length>1&&<label className="quick-lookup-scope">Almacén<select value={warehouseId} onChange={e=>chooseWarehouse(e.target.value)}><option value="">Selecciona un almacén</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}
    {branchId&&warehouses.length===1&&<p className="quick-lookup-context">Almacén: <strong>{warehouses[0]!.name}</strong></p>}
    {error&&<p className="catalog-error" role="alert">{error}</p>}
    {branches.length===0&&!error&&<p className="quick-lookup-status" role="status">Cargando sucursales…</p>}
    {branches.length===0&&error=== ""?null:branches.length===0?<div className="catalog-empty"><strong>No tienes sucursales asignadas.</strong><span>Solicita acceso a una sucursal para consultar productos.</span></div>:null}
    {branchId&&warehouses.length===0&&!error&&<p className="quick-lookup-status" role="status">Cargando almacenes activos…</p>}
    {branchId&&warehouses.length===0&&error===""?null:branchId&&warehouses.length===0?<div className="catalog-empty"><strong>Esta sucursal no tiene almacenes activos.</strong><span>Solicita que habiliten un almacén.</span></div>:null}
    <form className="quick-lookup-search" role="search" onSubmit={e=>{e.preventDefault();if(debounceTimer.current!==null)window.clearTimeout(debounceTimer.current);debounceTimer.current=null;void search(query);}}>
      <label htmlFor="quick-product-search">Buscar producto</label><div className="quick-lookup-input-row">
        <input id="quick-product-search" type="search" enterKeyHint="search" autoComplete="off" maxLength={120} placeholder="Escanea un código o escribe nombre / SKU" value={query} disabled={!warehouseId} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")clear();}}/>
        {query&&<button type="button" className="catalog-search-clear" onClick={clear}>Limpiar</button>}
      </div>
    </form>
    {loading&&<p className="quick-lookup-status" role="status">Buscando productos…</p>}
    {!loading&&!error&&query.trim()&&items.length===0&&<p className="quick-lookup-status" role="status">No se encontraron productos activos.</p>}
    {items.length>0&&<div className="quick-lookup-results" aria-live="polite">{items.map(item=>{const out=zero(item.available_quantity);return <article className="quick-lookup-result" key={item.product_id}>
      <div className="quick-lookup-product"><strong>{item.name}</strong><span>{item.sku}{item.barcode?` · ${item.barcode}`:""}</span></div>
      <div className="quick-lookup-prices"><strong>US$ {usd(item.price_usd)}</strong>{canConvert?<span>Bs. {ves(item.price_usd,exchangeRate!)}</span>:<span className="catalog-price-unavailable">{exchangeRateStatus==="stale"?"Tasa BCV desactualizada; conversión suspendida":"Tasa BCV no disponible; conversión suspendida"}</span>}</div>
      <div className="quick-lookup-stock"><strong className={out?"out":""}>{out?"Agotado":`${localDecimal(formatDecimal(parseNumeric(item.available_quantity,14,3),3,0))} ${item.unit}`}</strong>{!out&&<span>Disponible</span>}</div>
      {onSelect&&<button type="button" className="catalog-edit" onClick={()=>onSelect(item)}>Seleccionar</button>}
    </article>;})}</div>}
    {nextCursor!==null&&<p className="quick-lookup-more">Hay más coincidencias. Afina la búsqueda para encontrar el producto.</p>}
  </section>;
}
