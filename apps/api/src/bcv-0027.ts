export type BcvSyncSnapshot = {
  last_success_at: string | Date | null;
  last_outcome: string | null;
  last_effective_date: string | null;
  last_error_code: string | null;
};
export type BcvCandidate = {
  id: string;
  rate: string;
  effective_date: string;
  validation_status: "valid" | "stale";
  fetched_at?: string;
};
export type BcvSelection = { row: BcvCandidate; priority: "today_exact" | "weekend_prepublished" | "weekday_same_day_sync" };

/** Calendar date in the BCV operating timezone, independent of the device timezone. */
export function bcvCaracasDate(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
function dayNumber(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`);
}
function isWeekend(value: string): boolean {
  const day = new Date(dayNumber(value)).getUTCDay();
  return day === 0 || day === 6;
}
function caracasDayStartEpoch(value: string): number {
  // America/Caracas has observed UTC-04:00 since 2016; compute the calendar
  // boundary explicitly rather than inheriting the host/device timezone.
  return Date.parse(`${value}T04:00:00.000Z`);
}
function healthy(state: BcvSyncSnapshot): boolean {
  return state.last_success_at !== null &&
    (state.last_outcome === "inserted" || state.last_outcome === "unchanged") &&
    state.last_error_code === null;
}

/** The shared fail-closed selection policy used by checkout and latest-rate status. */
export function selectApplicableBcvRate(
  today: string,
  state: BcvSyncSnapshot | null,
  candidates: readonly BcvCandidate[],
): BcvSelection | null {
  if (!state || !healthy(state)) return null;
  const valid = candidates.filter((row) => row.validation_status === "valid" && /^[0-9]+(?:\.[0-9]+)?$/.test(row.rate) && /[1-9]/.test(row.rate));
  const exact = valid.filter((row) => row.effective_date === today);
  if (exact.length > 1) return null;
  if (exact.length === 1) {
    const row = exact[0]!;
    if (!state.last_effective_date || state.last_effective_date < row.effective_date) return null;
    return { row, priority: "today_exact" };
  }

  const latestAllowed = new Date(dayNumber(today) + 5 * 86_400_000).toISOString().slice(0, 10);
  const future = valid.filter((row) => row.effective_date > today && row.effective_date <= latestAllowed)
    .sort((a, b) => a.effective_date.localeCompare(b.effective_date));
  if (!future.length) return null;
  const nearestDate = future[0]!.effective_date;
  const nearest = future.filter((row) => row.effective_date === nearestDate);
  if (nearest.length !== 1) return null;
  const row = nearest[0]!;
  if (!state.last_effective_date || state.last_effective_date < row.effective_date) return null;
  if (isWeekend(today)) return { row, priority: "weekend_prepublished" };
  const successAt = state.last_success_at instanceof Date
    ? state.last_success_at.getTime() : Date.parse(state.last_success_at);
  if (!Number.isFinite(successAt) || successAt < caracasDayStartEpoch(today)) return null;
  return { row, priority: "weekday_same_day_sync" };
}
