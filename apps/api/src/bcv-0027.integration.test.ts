import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {Client} from "pg";
const env=(globalThis as typeof globalThis & {process?:{env?:Record<string,string|undefined>}}).process?.env;
const adminUrl=env?.DATABASE_URL_ADMIN,ci=Boolean(env?.CI);
function safe(url:string|undefined):boolean{if(!url)return false;try{const u=new URL(url);return ["localhost","127.0.0.1","[::1]"].includes(u.hostname)&&u.pathname==="/microapp_test"&&u.username==="microapp"&&["postgres:","postgresql:"].includes(u.protocol)}catch{return false}}
if(ci&&!safe(adminUrl))throw new Error("BCV 0027 integration matrix requires disposable localhost PostgreSQL 18 admin connection.");
const enabled=safe(adminUrl);
function addDays(date:string,n:number):string{return new Date(Date.parse(date+"T12:00:00.000Z")+n*86400000).toISOString().slice(0,10)}
function nextWeekday(day:number):string{const d=new Date();d.setUTCHours(12,0,0,0);for(let i=0;i<8;i++){if(d.getUTCDay()===day){if(i===0)d.setUTCDate(d.getUTCDate()+7);return d.toISOString().slice(0,10)}d.setUTCDate(d.getUTCDate()+1)}throw new Error("weekday calculation failed")}
describe.skipIf(!enabled)("BCV 0027 PostgreSQL 18 effective-date matrix",()=>{
 let db:Client;const friday=nextWeekday(5),saturday=addDays(friday,1),sunday=addDays(friday,2),monday=addDays(friday,3),tuesday=addDays(friday,4);
 beforeAll(async()=>{db=new Client({connectionString:adminUrl});await db.connect();await db.query("BEGIN")});
 afterAll(async()=>{if(db){await db.query("ROLLBACK");await db.end()}});
 async function prepare(rows:string[],syncDate:string,successAt:string,outcome="inserted",error:string|null=null){
  await db.query("DELETE FROM public.exchange_rates WHERE source='BCV_OFFICIAL_HTML_V1' AND effective_date=ANY($1::date[])",[rows]);
  for(const date of rows)await db.query("INSERT INTO public.exchange_rates(base_currency,quote_currency,rate,source,effective_date,validation_status) VALUES('USD','VES','500.12345678','BCV_OFFICIAL_HTML_V1',$1::date,'valid')",[date]);
  await db.query("UPDATE public.bcv_sync_state SET last_success_at=$1::timestamptz,last_outcome=$2,last_error_code=$3,last_effective_date=$4::date,updated_at=clock_timestamp() WHERE singleton=true",[successAt,outcome,error,syncDate]);
 }
 async function select(date:string){const r=await db.query("SELECT exchange_rate_id::text,rate::text,effective_date::text,priority FROM public.select_bcv_rate_for_operation($1::date)",[date]);return r.rows[0]??null}
 it("Friday exact row wins over Monday prepublication",async()=>{await prepare([friday,monday],monday,friday+"T16:00:00Z");expect(await select(friday)).toMatchObject({effective_date:friday,priority:"today_exact"})});
 it("Saturday and Sunday use nearest future published row with healthy prior sync",async()=>{await prepare([monday],monday,friday+"T16:00:00Z");expect(await select(saturday)).toMatchObject({effective_date:monday,priority:"weekend_prepublished"});await prepare([monday],monday,friday+"T16:00:00Z","unchanged");expect(await select(sunday)).toMatchObject({effective_date:monday,priority:"weekend_prepublished"})});
 it("weekday holiday requires a successful sync on that Caracas day",async()=>{await prepare([tuesday],tuesday,monday+"T05:00:00Z","unchanged");expect(await select(monday)).toMatchObject({effective_date:tuesday,priority:"weekday_same_day_sync"});await prepare([tuesday],tuesday,friday+"T16:00:00Z");expect(await select(monday)).toBeNull()});
 it("rejects failed, running, errored, uncovered, stale and beyond-five-day candidates",async()=>{
  await prepare([monday],monday,friday+"T16:00:00Z","failed");expect(await select(saturday)).toBeNull();
  await prepare([monday],monday,friday+"T16:00:00Z","running");expect(await select(saturday)).toBeNull();
  await prepare([monday],monday,friday+"T16:00:00Z","inserted","SOURCE_ERROR");expect(await select(saturday)).toBeNull();
  await prepare([monday],friday,friday+"T16:00:00Z");expect(await select(saturday)).toBeNull();
  const outside=addDays(saturday,6);await prepare([outside],outside,friday+"T16:00:00Z");expect(await select(saturday)).toBeNull();
  await prepare([monday],monday,friday+"T16:00:00Z");await db.query("UPDATE public.exchange_rates SET validation_status='stale' WHERE source='BCV_OFFICIAL_HTML_V1' AND effective_date=$1::date",[monday]);expect(await select(saturday)).toBeNull();
 });
});
