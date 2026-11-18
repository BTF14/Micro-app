import {afterAll,afterEach,beforeAll,beforeEach,describe,expect,it} from "vitest";
import {Client} from "pg";
const env=(globalThis as typeof globalThis & {process?:{env?:Record<string,string|undefined>}}).process?.env;
const adminUrl=env?.DATABASE_URL_ADMIN,ci=Boolean(env?.CI);
function safe(url:string|undefined):boolean{if(!url)return false;try{const u=new URL(url);return (["localhost","127.0.0.1","[::1]"].includes(u.hostname)||(ci&&u.hostname==="postgres"))&&u.port==="5432"&&u.pathname==="/microapp_test"&&u.username==="microapp"&&["postgres:","postgresql:"].includes(u.protocol)}catch{return false}}
if(ci&&!safe(adminUrl))throw new Error("BCV 0027 integration matrix requires disposable localhost PostgreSQL 18 admin connection.");
const enabled=safe(adminUrl);
function addDays(date:string,n:number):string{return new Date(Date.parse(date+"T12:00:00.000Z")+n*86400000).toISOString().slice(0,10)}
function previousWeekday(day:number):string{const d=new Date();d.setUTCHours(12,0,0,0);for(let i=1;i<=7;i++){d.setUTCDate(d.getUTCDate()-1);if(d.getUTCDay()===day)return d.toISOString().slice(0,10)}throw new Error("previous weekday calculation failed")}
describe.skipIf(!enabled)("BCV 0027 PostgreSQL 18 effective-date matrix",()=>{
 let db:Client;let syncSequence=0;const friday=previousWeekday(5),saturday=addDays(friday,1),sunday=addDays(friday,2),monday=addDays(friday,3),tuesday=addDays(friday,4);
 beforeAll(async()=>{db=new Client({connectionString:adminUrl});await db.connect();await db.query("BEGIN")});
 beforeEach(async()=>{await db.query("SAVEPOINT bcv_0027_case")});
 afterEach(async()=>{await db.query("ROLLBACK TO SAVEPOINT bcv_0027_case")});
 afterAll(async()=>{if(db){await db.query("ROLLBACK");await db.end()}});
 async function prepare(rows:string[],syncDate:string,successAt:string,outcome="inserted",error:string|null=null,validationStatus="valid"){
  for(const date of rows){
   const existing=await db.query("SELECT id FROM public.exchange_rates WHERE source='BCV_OFFICIAL_HTML_V1' AND effective_date=$1::date",[date]);
   if(!existing.rows.length)await db.query("INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES','500.12345678','BCV_OFFICIAL_HTML_V1',$1::date,$2)",[date,validationStatus]);
  }
  const previous=await db.query<{last_success_at:string|null}>("SELECT last_success_at::text FROM public.bcv_sync_state WHERE singleton=true");
  const nextSuccessAt=(outcome === "inserted" || outcome === "unchanged") ? new Date(Date.parse(successAt)+(++syncSequence)*1000).toISOString() : previous.rows[0]?.last_success_at ?? null;
  await db.query("UPDATE public.bcv_sync_state SET last_success_at=$1::timestamptz,last_outcome=$2,last_error_code=$3,last_effective_date=$4::date,updated_at=clock_timestamp() WHERE singleton=true",[nextSuccessAt,outcome,error,syncDate]);
 }
 async function select(date:string){const r=await db.query("SELECT exchange_rate_id::text,rate::text,effective_date::text,priority FROM public.select_bcv_rate_for_operation($1::date)",[date]);return r.rows[0]??null}
 it("Friday exact row wins over Monday prepublication",async()=>{await prepare([friday,monday],monday,friday+"T16:00:00Z");expect(await select(friday)).toMatchObject({effective_date:friday,priority:"today_exact"})});
 it("Saturday and Sunday use nearest future published row with healthy prior sync",async()=>{await prepare([monday],monday,friday+"T16:00:00Z");expect(await select(saturday)).toMatchObject({effective_date:monday,priority:"weekend_prepublished"});await prepare([monday],monday,friday+"T16:00:00Z","unchanged");expect(await select(sunday)).toMatchObject({effective_date:monday,priority:"weekend_prepublished"})});
 it("weekday holiday requires a successful sync on that Caracas day",async()=>{await prepare([tuesday],tuesday,monday+"T05:00:00Z","unchanged");expect(await select(monday)).toMatchObject({effective_date:tuesday,priority:"weekday_same_day_sync"});await prepare([tuesday],tuesday,friday+"T16:00:00Z");expect(await select(monday)).toBeNull()});
 it("requires an append-only observation matching the current sync snapshot",async()=>{
  await prepare([monday,tuesday],monday,friday+"T16:00:00Z");
  await db.query("UPDATE public.bcv_sync_state SET last_effective_date=$1::date WHERE singleton=true",[tuesday]);
  expect(await select(saturday)).toBeNull();
 });
 it("rejects failed, running, errored, uncovered, stale and beyond-five-day candidates",async()=>{
  await prepare([monday],monday,friday+"T16:00:00Z","failed");expect(await select(saturday)).toBeNull();
  await prepare([monday],monday,friday+"T16:00:00Z","running");expect(await select(saturday)).toBeNull();
  await prepare([monday],friday,friday+"T16:00:00Z");expect(await select(saturday)).toBeNull();
  const boundary=addDays(saturday,5);await prepare([boundary],boundary,friday+"T16:00:00Z");expect(await select(saturday)).toMatchObject({effective_date:boundary,priority:"weekend_prepublished"});
  const outside=addDays(saturday,6);await prepare([outside],outside,friday+"T16:00:00Z");expect(await select(saturday)).toBeNull();
  const staleDate=addDays(saturday,4);await prepare([staleDate],staleDate,friday+"T16:00:00Z","inserted",null,"stale");expect(await select(saturday)).toBeNull();
 });
});
