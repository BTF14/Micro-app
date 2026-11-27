import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { Client } from "pg";

vi.mock("@neondatabase/serverless", async () => {
  const postgres = await import("pg");
  return { Client: class extends postgres.Client { constructor(connectionString: string) { super({ connectionString }); } } };
});
const app=(await import("./index")).default;
const env=(globalThis as typeof globalThis & {process?:{env?:Record<string,string|undefined>}}).process?.env;
const adminUrl=env?.DATABASE_URL_ADMIN??env?.DATABASE_URL;
const runtimeUrl=env?.DATABASE_URL_RUNTIME??env?.DATABASE_URL;
const isCi=Boolean(env?.CI);
if(isCi&&(!adminUrl||!runtimeUrl))throw new Error("CI requires direct admin and runtime PostgreSQL logins for platform administration tests.");
const origin="https://frontend.example";
async function hash(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");}
describe.skipIf(!adminUrl||!runtimeUrl)("platform administration API",()=>{
 let admin:Client;let runtime:Client;let actorId="";let targetId="";let actorToken="";let targetToken="";
 const actorEmail=`platform-admin-${crypto.randomUUID()}@example.test`;
 const targetEmail=`platform-target-${crypto.randomUUID()}@example.test`;
 const ownerEmail=`platform-owner-${crypto.randomUUID()}@example.test`;
 const organizationIds:string[]=[];
 let ip=10;
 beforeAll(async()=>{
  admin=new Client({connectionString:adminUrl});runtime=new Client({connectionString:runtimeUrl});await Promise.all([admin.connect(),runtime.connect()]);
  const actor=await admin.query<{id:string}>("INSERT INTO public.app_users(email,display_name,google_sub) VALUES($1,'Platform Actor',$2) RETURNING id",[actorEmail,"google-"+crypto.randomUUID()]);
  actorId=actor.rows[0]!.id;
  await admin.query("INSERT INTO public.platform_admins(user_id,is_active,note,granted_by_user_id) VALUES($1,true,'integration',$1)",[actorId]);
  await admin.query("INSERT INTO public.auth_allowlist(email,is_active,added_by,note) VALUES($1,true,'integration','platform test')",[actorEmail]);
  const target=await admin.query<{id:string}>("INSERT INTO public.app_users(email,display_name,google_sub) VALUES($1,'Platform Target',$2) RETURNING id",[targetEmail,"google-"+crypto.randomUUID()]);
  targetId=target.rows[0]!.id;
  await admin.query("INSERT INTO public.auth_allowlist(email,is_active,added_by,note) VALUES($1,true,'integration','platform test')",[targetEmail]);
  actorToken="platform-session-"+crypto.randomUUID();targetToken="platform-session-"+crypto.randomUUID();
  await admin.query("INSERT INTO public.auth_sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '1 day'),($3,$4,now()+interval '1 day')",[actorId,await hash(actorToken),targetId,await hash(targetToken)]);
 });
 afterAll(async()=>{
  if(runtime)await runtime.end();
  if(admin){
   if(organizationIds.length){
    await admin.query("DELETE FROM public.platform_audit_logs WHERE target_organization_id=ANY($1::uuid[])",[organizationIds]);
    await admin.query("DELETE FROM public.audit_logs WHERE organization_id=ANY($1::uuid[])",[organizationIds]);
    await admin.query("DELETE FROM public.organization_invitations WHERE organization_id=ANY($1::uuid[])",[organizationIds]);
    await admin.query("DELETE FROM public.organization_members WHERE organization_id=ANY($1::uuid[])",[organizationIds]);
    await admin.query("DELETE FROM public.organizations WHERE id=ANY($1::uuid[])",[organizationIds]);
   }
   if(actorId||targetId)await admin.query("DELETE FROM public.platform_audit_logs WHERE actor_user_id=ANY($1::uuid[]) OR target_user_id=ANY($1::uuid[])",[[actorId,targetId]]);
   await admin.query("DELETE FROM public.platform_admins WHERE user_id=ANY($1::uuid[])",[[actorId,targetId]]);
   await admin.query("DELETE FROM public.auth_sessions WHERE user_id=ANY($1::uuid[])",[[actorId,targetId]]);
   await admin.query("DELETE FROM public.auth_allowlist WHERE lower(email)=ANY($1::text[])",[[actorEmail,targetEmail,ownerEmail].map(x=>x.toLowerCase())]);
   await admin.query("DELETE FROM public.app_users WHERE id=ANY($1::uuid[])",[[actorId,targetId]]);
   await admin.end();
  }
 });
 function request(token:string,method:string,path:string,body?:unknown){
  return app.fetch(new Request("https://api.example"+path,{method,headers:{Cookie:"microapp_session="+token,"CF-Connecting-IP":`198.51.100.${ip++}`,...(method==="GET"?{}:{Origin:origin,"Content-Type":"application/json"})},...(body===undefined?{}:{body:JSON.stringify(body)})}),{DATABASE_URL:runtimeUrl,FRONTEND_ORIGIN:origin,GOOGLE_CLIENT_SECRET:"platform-test-secret-with-sufficient-length"});
 }
 it("allows an active platform admin with no organizations and protects overview from tenant users",async()=>{
  const me=await request(actorToken,"GET","/auth/me");expect(me.status).toBe(200);await expect(me.json()).resolves.toMatchObject({organizations:[],is_platform_admin:true});
  const overview=await request(actorToken,"GET","/api/platform/overview");expect(overview.status).toBe(200);await expect(overview.json()).resolves.toMatchObject({organizations:[],admins:expect.any(Array),audit_logs:expect.any(Array)});
  const denied=await request(targetToken,"GET","/api/platform/overview");expect(denied.status).toBe(403);await expect(denied.json()).resolves.toMatchObject({error:"PLATFORM_ADMIN_FORBIDDEN"});
 });
 it("creates and suspends an organization and grants a platform admin through SECURITY DEFINER functions",async()=>{
  const created=await request(actorToken,"POST","/api/platform/organizations",{name:"Platform Test Shop",slug:"platform-test-"+crypto.randomUUID().slice(0,8),owner_email:ownerEmail,note:"integration"});
  expect(created.status).toBe(201);
  const payload=await created.json() as {organization:{id:string;owner_status:string}};
  organizationIds.push(payload.organization.id);expect(payload.organization.owner_status).toBe("pending");
  const suspended=await request(actorToken,"PATCH",`/api/platform/organizations/${payload.organization.id}`,{is_active:false,note:"integration suspension"});
  expect(suspended.status).toBe(200);
  const active=await admin.query<{is_active:boolean}>("SELECT is_active FROM public.organizations WHERE id=$1",[payload.organization.id]);
  expect(active.rows[0]?.is_active).toBe(false);
  const grant=await request(actorToken,"POST","/api/platform/admins",{email:targetEmail,is_active:true,note:"integration grant"});
  expect(grant.status).toBe(200);await expect(grant.json()).resolves.toMatchObject({admin:{user_id:targetId,email:targetEmail,is_active:true}});
  const revoke=await request(actorToken,"POST","/api/platform/admins",{email:targetEmail,is_active:false,note:"integration revoke"});
  expect(revoke.status).toBe(200);
  const disabledAllowlist=await admin.query<{is_active:boolean}>("SELECT is_active FROM public.auth_allowlist WHERE lower(email)=lower($1)",[targetEmail]);
  expect(disabledAllowlist.rows[0]?.is_active).toBe(false);
  const regrant=await request(actorToken,"POST","/api/platform/admins",{email:targetEmail,is_active:true,note:"integration regrant"});
  expect(regrant.status).toBe(200);
  const enabledAllowlist=await admin.query<{is_active:boolean}>("SELECT is_active FROM public.auth_allowlist WHERE lower(email)=lower($1)",[targetEmail]);
  expect(enabledAllowlist.rows[0]?.is_active).toBe(true);
 });
});
