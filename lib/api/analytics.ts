import type { AnalyticsData, AnalyticsDateRange, AnalyticsDateSelection } from "@/types/Analytics";

function validNumber(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function validSummary(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const summary = value as Record<string, unknown>;
  return ["netSales", "averageTicket", "totalOrders", "covers"].every((key) => validNumber(summary[key]));
}

function validPeriod(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const period = value as Record<string, unknown>;
  return typeof period.startAt === "string" && typeof period.endAt === "string" &&
    period.timezone === "Asia/Phnom_Penh" &&
    Number.isFinite(Date.parse(period.startAt)) && Number.isFinite(Date.parse(period.endAt)) &&
    Date.parse(period.endAt) > Date.parse(period.startAt);
}

function validMenuItem(value: unknown) {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.name === "string" && validNumber(item.sales) && validNumber(item.quantitySold);
}

export async function getAnalyticsApi(
  range: AnalyticsDateRange,
  dates: AnalyticsDateSelection,
  signal?: AbortSignal,
): Promise<AnalyticsData> {
  const query = new URLSearchParams({ range });
  if (range === "Custom") {
    query.set("startDate", dates.startDate);
    query.set("endDate", dates.endDate);
  }
  const response = await fetch(`/api/analytics?${query}`, { cache: "no-store", signal });
  if (response.redirected || response.status === 401) {
    throw new Error("Please sign in again to view Analytics.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? "Could not load Analytics.");
  if (
    data?.source !== "payments" || data.range !== range ||
    !validPeriod(data.period) || !validSummary(data.summary) ||
    !(data.previousSummary === null || validSummary(data.previousSummary)) ||
    !(data.comparisonPeriod === null || validPeriod(data.comparisonPeriod)) ||
    !Array.isArray(data.salesData) ||
    !data.salesData.every((point: Record<string, unknown> | null) => point && typeof point.label === "string" && validNumber(point.sales)) ||
    !Array.isArray(data.menuPerformance?.bestPerforming) ||
    !Array.isArray(data.menuPerformance?.needAttention) ||
    !data.menuPerformance.bestPerforming.every(validMenuItem) ||
    !data.menuPerformance.needAttention.every(validMenuItem)
  ) {
    throw new Error("Could not load Analytics.");
  }
  return data;
}
