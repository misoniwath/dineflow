import type { AnalyticsData, AnalyticsExportSection } from "@/types/Analytics";
import { getMenuPerformanceSections } from "@/lib/menu-performance";
import { getAnalyticsPeriodDates } from "@/lib/analytics";

type CsvCell = string | number;

function escapeCsvCell(cell: CsvCell) {
  let text = String(cell);

  // Keep spreadsheet programs from interpreting text fields as formulas.
  if (typeof cell === "string" && /^[\s\uFEFF]*[=+\-@]/.test(text)) {
    text = "'" + text;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function createAnalyticsCsv(
  data: AnalyticsData,
  section: AnalyticsExportSection,
) {
  const {
    range,
    period,
    comparisonPeriod,
    summary,
    previousSummary,
    salesData,
    menuPerformance,
  } = data;
  const dollars = (cents: number) => cents / 100;

  const contextHeaders = [
    "Range",
    "Start",
    "End (exclusive)",
    "Timezone",
    "Source",
    "Comparison available",
    "Comparison start",
    "Comparison end (exclusive)",
  ];
  const context = [
    range,
    period.startAt,
    period.endAt,
    period.timezone,
    "Demo data",
    comparisonPeriod ? "Yes" : "No",
    comparisonPeriod?.startAt ?? "",
    comparisonPeriod?.endAt ?? "",
  ];
  let headers: string[];
  let rows: CsvCell[][];

  switch (section) {
    case "summary":
      headers = ["Metric", "Value", "Unit", "Previous value"];
      rows = [
        [
          "Net sales",
          dollars(summary.netSales),
          "USD",
          previousSummary ? dollars(previousSummary.netSales) : "",
        ],
        [
          "Average ticket",
          dollars(summary.averageTicket),
          "USD",
          previousSummary ? dollars(previousSummary.averageTicket) : "",
        ],
        [
          "Total orders",
          summary.totalOrders,
          "orders",
          previousSummary?.totalOrders ?? "",
        ],
        ["Covers", summary.covers, "guests", previousSummary?.covers ?? ""],
      ];
      break;
    case "sales-breakdown":
      headers = ["Period", "Sales (USD)"];
      rows = salesData.map((point) => [point.label, dollars(point.sales)]);
      break;
    case "menu-performance": {
      headers = ["Ranking", "Item", "Quantity sold", "Revenue (USD)"];
      rows = [];
      const menuSections = getMenuPerformanceSections(menuPerformance);

      for (const menuSection of menuSections) {
        for (const item of menuSection.items) {
          rows.push([
            menuSection.title,
            item.name,
            item.quantitySold,
            dollars(item.sales),
          ]);
        }
      }
      break;
    }
  }

  const csv = [
    [...headers, ...contextHeaders],
    ...rows.map((row) => [...row, ...context]),
  ]
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n");
  const rangeName = range.toLowerCase().replaceAll(" ", "-");
  const { startDate, endDate } = getAnalyticsPeriodDates(period);

  return {
    content: "\uFEFF" + csv + "\r\n",
    filename: `dineflow-${section}-${rangeName}-${startDate}-to-${endDate}.csv`,
  };
}
