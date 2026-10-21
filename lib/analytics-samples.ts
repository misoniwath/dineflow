import {
  addAnalyticsDays,
  createAnalyticsReport,
  getAnalyticsDateError,
  getPresetAnalyticsDates,
} from "@/lib/analytics";
import type {
  AnalyticsDailyRecord,
  AnalyticsData,
  AnalyticsDateRange,
  AnalyticsDateSelection,
  AnalyticsPresetRange,
} from "@/types/Analytics";

// Every report is calculated from the same fixed, dated demo records.
export const sampleAnalyticsReferenceDate = "2024-06-30";
export const sampleAnalyticsCoverage = {
  startDate: "2024-05-01",
  endDate: sampleAnalyticsReferenceDate,
};

const sampleMenu = [
  { name: "Grilled Salmon", priceCents: 2500, baseQuantity: 18 },
  { name: "Caesar Salad", priceCents: 1200, baseQuantity: 26 },
  { name: "Margherita Pizza", priceCents: 1500, baseQuantity: 16 },
  { name: "Beef Burger", priceCents: 1600, baseQuantity: 12 },
  { name: "Chicken Alfredo", priceCents: 1800, baseQuantity: 9 },
];
const hourlyWeights = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 5,
  8, 7, 4, 3, 4, 7, 9, 8, 6, 3, 1, 0,
];
const totalWeight = hourlyWeights.reduce((sum, weight) => sum + weight, 0);

function createSampleDay(date: string, index: number): AnalyticsDailyRecord {
  const weekday = new Date(date + "T00:00:00Z").getUTCDay();
  const weekend = weekday === 0 || weekday === 6;
  const menuItems = sampleMenu.map((item, itemIndex) => {
    const quantitySold =
      item.baseQuantity + ((index + itemIndex * 3) % 7) + (weekend ? 6 : 0);
    return {
      name: item.name,
      quantitySold,
      sales: quantitySold * item.priceCents,
    };
  });
  const netSales = menuItems.reduce((sum, item) => sum + item.sales, 0);
  const totalUnits = menuItems.reduce((sum, item) => sum + item.quantitySold, 0);
  const totalOrders = Math.round(totalUnits / 1.7);
  const hourlySales = hourlyWeights.map((weight, hour) => ({
    label: (hour % 12 || 12) + (hour < 12 ? " AM" : " PM"),
    sales: Math.floor((netSales * weight) / totalWeight),
  }));
  // Assign rounding cents to the final trading hour so chart totals reconcile.
  hourlySales[22].sales +=
    netSales - hourlySales.reduce((sum, point) => sum + point.sales, 0);

  return {
    date,
    totalOrders,
    covers: Math.round(totalOrders * 1.6),
    menuItems,
    hourlySales,
  };
}

export const sampleAnalyticsRecords: AnalyticsDailyRecord[] = [];
for (
  let date = sampleAnalyticsCoverage.startDate;
  date <= sampleAnalyticsCoverage.endDate;
  date = addAnalyticsDays(date, 1)
) {
  sampleAnalyticsRecords.push(createSampleDay(date, sampleAnalyticsRecords.length));
}

export function getSampleAnalyticsData(
  range: AnalyticsDateRange,
  customSelection?: AnalyticsDateSelection,
): AnalyticsData {
  const preset =
    range === "Custom"
      ? null
      : getPresetAnalyticsDates(range, sampleAnalyticsReferenceDate);
  const selection = preset?.selection ?? customSelection;
  if (!selection) throw new RangeError("Choose start and end dates.");
  const error = getAnalyticsDateError(selection, sampleAnalyticsCoverage);
  if (error) throw new RangeError(error);
  return createAnalyticsReport(
    sampleAnalyticsRecords,
    range,
    selection,
    preset?.comparison,
  );
}

export const sampleAnalyticsData: Record<AnalyticsPresetRange, AnalyticsData> = {
  Today: getSampleAnalyticsData("Today"),
  "This week": getSampleAnalyticsData("This week"),
  "This month": getSampleAnalyticsData("This month"),
};
