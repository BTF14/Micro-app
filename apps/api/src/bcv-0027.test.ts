import { describe, expect, it } from "vitest";
import { bcvCaracasDate, selectApplicableBcvRate, type BcvCandidate, type BcvSyncSnapshot } from "./bcv-0027";
const row=(date:string,status:"valid"|"stale"="valid"):BcvCandidate=>({id:date,rate:"500.12345678",effective_date:date,validation_status:status});
const state=(date:string,at="2026-11-06T12:00:00-04:00",outcome="inserted",error:null|string=null):BcvSyncSnapshot=>({last_success_at:at,last_outcome:outcome,last_effective_date:date,last_error_code:error});
describe("BCV 0027 effective-date policy",()=>{
 it("uses the exact Friday row even when Monday is prepublished",()=>{
  expect(selectApplicableBcvRate("2026-11-06",state("2026-11-09"),[row("2026-11-09"),row("2026-11-06")])?.priority).toBe("today_exact");
 });
 it("uses Monday's prepublication on Saturday with a healthy sync",()=>{
  expect(selectApplicableBcvRate("2026-11-07",state("2026-11-09"),[row("2026-11-09")])?.priority).toBe("weekend_prepublished");
 });
 it("uses Monday's prepublication on Sunday with an unchanged observation",()=>{
  expect(selectApplicableBcvRate("2026-11-08",state("2026-11-09","2026-11-06T12:00:00-04:00","unchanged"),[row("2026-11-09")])?.priority).toBe("weekend_prepublished");
 });
 it("requires a same-Caracas-day sync on a weekday holiday",()=>{
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-10","2026-11-09T05:00:00-04:00"),[row("2026-11-10")])?.priority).toBe("weekday_same_day_sync");
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-10","2026-11-08T23:59:59-04:00"),[row("2026-11-10")])).toBeNull();
 });
 it("rejects future dates beyond +5 and older rows",()=>{
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-16"),[row("2026-11-16")])).toBeNull();
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-09"),[row("2026-11-08")])).toBeNull();
 });
 it("rejects failed, running, stale, uncovered and missing sync state",()=>{
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-09","2026-11-09T12:00:00Z","failed"),[row("2026-11-09")])).toBeNull();
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-09","2026-11-09T12:00:00Z","running"),[row("2026-11-09")])).toBeNull();
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-09","2026-11-09T12:00:00Z","inserted","SOURCE_ERROR"),[row("2026-11-09")])).toBeNull();
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-08"),[row("2026-11-09")])).toBeNull();
  expect(selectApplicableBcvRate("2026-11-09",null,[row("2026-11-09")])).toBeNull();
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-09"),[row("2026-11-09","stale")])).toBeNull();
 });
 it("rejects zero or malformed official rates",()=>{
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-09"),[{...row("2026-11-09"),rate:"0"}])).toBeNull();
  expect(selectApplicableBcvRate("2026-11-09",state("2026-11-09"),[{...row("2026-11-09"),rate:"NaN"}])).toBeNull();
 });
 it("rejects ambiguous nearest future candidates",()=>{
  expect(selectApplicableBcvRate("2026-11-07",state("2026-11-09"),[row("2026-11-09"),row("2026-11-09")])).toBeNull();
 });
 it("switches eligibility at the exact Caracas midnight boundary independent of host timezone",()=>{
  const fridayInstant=new Date("2026-11-07T03:59:59.000Z");
  const saturdayInstant=new Date("2026-11-07T04:00:00.000Z");
  expect(bcvCaracasDate(fridayInstant)).toBe("2026-11-06");
  expect(bcvCaracasDate(saturdayInstant)).toBe("2026-11-07");
  const published=state("2026-11-09","2026-11-06T18:00:00.000Z");
  expect(selectApplicableBcvRate(bcvCaracasDate(fridayInstant),published,[row("2026-11-06"),row("2026-11-09")]))?.priority).toBe("today_exact");
  expect(selectApplicableBcvRate(bcvCaracasDate(saturdayInstant),published,[row("2026-11-09")]))?.priority).toBe("weekend_prepublished");
  expect(selectApplicableBcvRate(bcvCaracasDate(saturdayInstant),published,[])).toBeNull();
 });

});