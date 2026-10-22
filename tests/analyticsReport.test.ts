import { describe, expect, test } from "@jest/globals";
import { createPaidAnalyticsReport, resolveAnalyticsRequest } from "@/lib/analytics";
import { createAnalyticsCsv } from "@/lib/analytics-export";
import type { AnalyticsReceipt } from "@/types/Analytics";

const selection = { startDate: "2026-10-22", endDate: "2026-10-22" };
const comparison = { startDate: "2026-10-21", endDate: "2026-10-21" };

function receipt(paidAt: string, cents: number, orderCount = 1): AnalyticsReceipt {
  return {
    paidAt, totalCents: cents, guestCount: 2, orderCount,
    items: [{ name: "Saved dinner", quantity: 1, unitPriceCents: cents }],
  };
}

describe("analytics from paid receipts", () => {
  test("uses local payment dates, counts combined orders, and reconciles hourly revenue", () => {
    const report = createPaidAnalyticsReport([
      receipt("2026-10-21T16:59:59.999Z", 1000),
      receipt("2026-10-21T17:00:00.000Z", 2000, 2),
      receipt("2026-10-22T16:59:59.999Z", 4000),
      receipt("2026-10-22T17:00:00.000Z", 9000),
    ], "Today", selection, comparison);
    expect(report.source).toBe("payments");
    expect(report.summary).toEqual({ netSales: 6000, totalOrders: 3, averageTicket: 2000, covers: 4 });
    expect(report.previousSummary?.netSales).toBe(1000);
    expect(report.salesData).toHaveLength(24);
    expect(report.salesData[0]).toEqual({ label: "12 AM", sales: 2000 });
    expect(report.salesData[23]).toEqual({ label: "11 PM", sales: 4000 });
    expect(report.salesData.reduce((sum, point) => sum + point.sales, 0)).toBe(6000);
    expect(report.menuPerformance.bestPerforming).toEqual([{ name: "Saved dinner", quantitySold: 2, sales: 6000 }]);
  });

  test("fills days without payments with zero and keeps the comparison separate", () => {
    const report = createPaidAnalyticsReport([
      receipt("2026-10-22T05:00:00Z", 3000),
      receipt("2026-10-19T05:00:00Z", 1000),
    ], "Custom", { startDate: "2026-10-21", endDate: "2026-10-23" },
    { startDate: "2026-10-18", endDate: "2026-10-20" });
    expect(report.salesData.map((point) => point.sales)).toEqual([0, 3000, 0]);
    expect(report.summary.netSales).toBe(3000);
    expect(report.previousSummary?.netSales).toBe(1000);
  });

  test("groups the month into calendar weeks with local date boundaries and a partial current week", () => {
    const query = resolveAnalyticsRequest(new URLSearchParams("range=This month"), "2026-10-22");
    const report = createPaidAnalyticsReport([
      receipt("2026-09-30T16:59:59.999Z", 500),
      receipt("2026-10-04T16:59:59.999Z", 1000),
      receipt("2026-10-04T17:00:00.000Z", 2000),
      receipt("2026-10-11T17:00:00.000Z", 3000),
      receipt("2026-10-22T16:59:59.999Z", 4000),
      receipt("2026-10-22T17:00:00.000Z", 9000),
    ], query.range, query.selection, query.comparison);
    expect(report.salesData).toEqual([
      { label: "Oct 1–4", sales: 1000 },
      { label: "Oct 5–11", sales: 2000 },
      { label: "Oct 12–18", sales: 3000 },
      { label: "Oct 19–22", sales: 4000 },
    ]);
    expect(report.summary).toEqual({ netSales: 10000, totalOrders: 4, averageTicket: 2500, covers: 8 });
    expect(report.previousSummary?.netSales).toBe(500);
    expect(report.salesData.reduce((sum, point) => sum + point.sales, 0)).toBe(report.summary.netSales);
    const csv = createAnalyticsCsv(report, "sales-breakdown").content;
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(5);
    expect(csv).toContain('"Oct 1–4","10"');
    expect(csv).toContain('"Oct 19–22","40"');
  });

  test("shows one monthly bucket on the first day rather than hourly buckets", () => {
    const query = resolveAnalyticsRequest(new URLSearchParams("range=This month"), "2026-10-01");
    const report = createPaidAnalyticsReport([
      receipt("2026-10-01T05:00:00Z", 1000),
    ], query.range, query.selection, query.comparison);
    expect(report.salesData).toEqual([{ label: "Oct 1", sales: 1000 }]);
  });

  test.each([
    { date: "2027-02-28", labels: ["Feb 1–7", "Feb 8–14", "Feb 15–21", "Feb 22–28"] },
    { date: "2028-02-29", labels: ["Feb 1–6", "Feb 7–13", "Feb 14–20", "Feb 21–27", "Feb 28–29"] },
    { date: "2026-04-30", labels: ["Apr 1–5", "Apr 6–12", "Apr 13–19", "Apr 20–26", "Apr 27–30"] },
    { date: "2026-08-31", labels: ["Aug 1–2", "Aug 3–9", "Aug 10–16", "Aug 17–23", "Aug 24–30", "Aug 31"] },
  ])("keeps zero-sales weeks and clips month boundaries through $date", ({ date, labels }) => {
    const query = resolveAnalyticsRequest(new URLSearchParams("range=This month"), date);
    const empty = createPaidAnalyticsReport([], query.range, query.selection, query.comparison);
    expect(empty.salesData).toEqual(labels.map((label) => ({ label, sales: 0 })));
    const report = createPaidAnalyticsReport([
      receipt(`${query.selection.startDate}T05:00:00Z`, 1000),
      receipt(`${date}T05:00:00Z`, 2000),
    ], query.range, query.selection, query.comparison);
    expect(report.salesData[0].sales).toBe(1000);
    expect(report.salesData.at(-1)?.sales).toBe(2000);
    expect(report.salesData.slice(1, -1).every((point) => point.sales === 0)).toBe(true);
    expect(report.summary.netSales).toBe(3000);
  });

  test("keeps the weekly view's daily sales breakdown", () => {
    const query = resolveAnalyticsRequest(new URLSearchParams("range=This week"), "2026-10-22");
    const report = createPaidAnalyticsReport([
      receipt("2026-10-22T05:00:00Z", 3000),
    ], query.range, query.selection, query.comparison);
    expect(report.salesData).toEqual([
      { label: "Oct 19", sales: 0 },
      { label: "Oct 20", sales: 0 },
      { label: "Oct 21", sales: 0 },
      { label: "Oct 22", sales: 3000 },
    ]);
  });

  test("returns real zeroes for empty periods and counts zero-value paid orders", () => {
    const empty = createPaidAnalyticsReport([], "Today", selection, comparison);
    expect(empty.summary).toEqual({ netSales: 0, averageTicket: 0, totalOrders: 0, covers: 0 });
    expect(empty.previousSummary).toEqual(empty.summary);
    expect(empty.menuPerformance.bestPerforming).toEqual([]);
    const free = createPaidAnalyticsReport([receipt("2026-10-22T05:00:00Z", 0)], "Today", selection, comparison);
    expect(free.summary.totalOrders).toBe(1);
    expect(free.summary.averageTicket).toBe(0);
  });

  test("exports the report's actual dates, saved totals, and payment source", () => {
    const report = createPaidAnalyticsReport([receipt("2026-10-22T05:00:00Z", 1250)], "Today", selection, comparison);
    const csv = createAnalyticsCsv(report, "summary");
    expect(csv.filename).toBe("dineflow-summary-today-2026-10-22-to-2026-10-22.csv");
    expect(csv.content).toContain('"Net sales","12.5","USD"');
    expect(csv.content).toContain('"Recorded payments"');
    expect(csv.content).not.toContain("Demo data");
  });
});

test.each([
  "range=invalid", "range=Custom", "range=Custom&startDate=2026-02-30&endDate=2026-03-01",
  "range=Custom&startDate=2026-10-22&endDate=2026-10-21",
  "range=Custom&startDate=2026-10-22&endDate=2026-10-23",
  "range=Custom&startDate=2024-01-01&endDate=2026-01-01",
])("rejects invalid or excessive report dates: %s", (query) => {
  expect(() => resolveAnalyticsRequest(new URLSearchParams(query), "2026-10-22")).toThrow(RangeError);
});

test("resolves presets from the current restaurant date and uses inclusive custom dates", () => {
  expect(resolveAnalyticsRequest(new URLSearchParams("range=This week"), "2026-10-22")).toEqual({
    range: "This week", selection: { startDate: "2026-10-19", endDate: "2026-10-22" },
    comparison: { startDate: "2026-10-12", endDate: "2026-10-15" },
  });
  expect(resolveAnalyticsRequest(new URLSearchParams("range=Custom&startDate=2026-10-20&endDate=2026-10-22"), "2026-10-22").comparison)
    .toEqual({ startDate: "2026-10-17", endDate: "2026-10-19" });
});
