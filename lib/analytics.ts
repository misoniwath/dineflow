import type {
  AnalyticsDailyRecord,
  AnalyticsData,
  AnalyticsDateRange,
  AnalyticsDateSelection,
  AnalyticsPeriod,
  AnalyticsPresetRange,
  AnalyticsSummary,
  MenuItemPerformance,
} from "@/types/Analytics";

const dayMs = 24 * 60 * 60 * 1000;
const timezone = "Asia/Phnom_Penh";

function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString().slice(0, 10) === date
  );
}

export function addAnalyticsDays(date: string, count: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + count);
  return value.toISOString().slice(0, 10);
}

export function getAnalyticsDateError(
  selection: AnalyticsDateSelection,
  bounds?: AnalyticsDateSelection,
) {
  if (!isValidDate(selection.startDate) || !isValidDate(selection.endDate)) {
    return "Enter valid start and end dates.";
  }
  if (selection.startDate > selection.endDate) {
    return "End date must be on or after start date.";
  }
  if (
    bounds &&
    (selection.startDate < bounds.startDate || selection.endDate > bounds.endDate)
  ) {
    return `Choose dates between ${bounds.startDate} and ${bounds.endDate}.`;
  }
  return null;
}

export function getPreviousAnalyticsDates(selection: AnalyticsDateSelection) {
  const error = getAnalyticsDateError(selection);
  if (error) throw new RangeError(error);
  const count =
    (Date.parse(`${selection.endDate}T00:00:00Z`) -
      Date.parse(`${selection.startDate}T00:00:00Z`)) /
      dayMs +
    1;
  return {
    startDate: addAnalyticsDays(selection.startDate, -count),
    endDate: addAnalyticsDays(selection.startDate, -1),
  };
}

export function getPresetAnalyticsDates(
  range: AnalyticsPresetRange,
  referenceDate: string,
) {
  let startDate = referenceDate;
  if (range === "This week") {
    const weekday = new Date(`${referenceDate}T00:00:00Z`).getUTCDay();
    startDate = addAnalyticsDays(referenceDate, -((weekday + 6) % 7));
  } else if (range === "This month") {
    startDate = `${referenceDate.slice(0, 7)}-01`;
  }
  const selection = { startDate, endDate: referenceDate };
  const comparison =
    range === "This month"
      ? {
          startDate: `${addAnalyticsDays(startDate, -1).slice(0, 7)}-01`,
          endDate: addAnalyticsDays(startDate, -1),
        }
      : range === "This week"
        ? {
            startDate: addAnalyticsDays(startDate, -7),
            endDate: addAnalyticsDays(referenceDate, -7),
          }
        : getPreviousAnalyticsDates(selection);
  return { selection, comparison };
}

function toPeriod(selection: AnalyticsDateSelection): AnalyticsPeriod {
  return {
    startAt: `${selection.startDate}T00:00:00+07:00`,
    endAt: `${addAnalyticsDays(selection.endDate, 1)}T00:00:00+07:00`,
    timezone,
  };
}

export function getAnalyticsPeriodDates(
  period: AnalyticsPeriod,
): AnalyticsDateSelection {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: period.timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  function dateString(timestamp: number) {
    const parts = formatter.formatToParts(timestamp);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((value) => value.type === type)!.value;
    return `${part("year")}-${part("month")}-${part("day")}`;
  }
  return {
    startDate: dateString(Date.parse(period.startAt)),
    endDate: dateString(Date.parse(period.endAt) - 1),
  };
}

export function formatAnalyticsPeriod(period: AnalyticsPeriod) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: period.timezone,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const start = formatter.format(new Date(period.startAt));
  const end = formatter.format(new Date(Date.parse(period.endAt) - 1));
  return start === end ? start : `${start} – ${end}`;
}

function getDates(selection: AnalyticsDateSelection) {
  const dates: string[] = [];
  for (
    let date = selection.startDate;
    date <= selection.endDate;
    date = addAnalyticsDays(date, 1)
  ) {
    dates.push(date);
  }
  return dates;
}

function getDaySales(day: AnalyticsDailyRecord) {
  return day.menuItems.reduce((sum, item) => sum + item.sales, 0);
}

function summarize(days: AnalyticsDailyRecord[]): AnalyticsSummary {
  const netSales = days.reduce((sum, day) => sum + getDaySales(day), 0);
  const totalOrders = days.reduce((sum, day) => sum + day.totalOrders, 0);
  return {
    netSales,
    totalOrders,
    covers: days.reduce((sum, day) => sum + day.covers, 0),
    averageTicket: totalOrders > 0 ? Math.round(netSales / totalOrders) : 0,
  };
}

export function createAnalyticsReport(
  records: AnalyticsDailyRecord[],
  range: AnalyticsDateRange,
  selection: AnalyticsDateSelection,
  comparison = getPreviousAnalyticsDates(selection),
): AnalyticsData {
  const error = getAnalyticsDateError(selection);
  if (error) throw new RangeError(error);
  const byDate = new Map(records.map((record) => [record.date, record]));
  const dates = getDates(selection);
  if (!dates.every((date) => byDate.has(date))) {
    throw new RangeError("Data is unavailable for some of the selected dates.");
  }
  const days = dates.map((date) => byDate.get(date)!);
  const comparisonDates = getDates(comparison);
  const hasComparison = comparisonDates.every((date) => byDate.has(date));
  const items = new Map<string, MenuItemPerformance>();
  for (const day of days) {
    for (const item of day.menuItems) {
      const current = items.get(item.name) ?? {
        name: item.name,
        quantitySold: 0,
        sales: 0,
      };
      current.sales += item.sales;
      current.quantitySold += item.quantitySold;
      items.set(item.name, current);
    }
  }
  const ranked = [...items.values()].sort(
    (a, b) => b.sales - a.sales || a.name.localeCompare(b.name),
  );
  const dayFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  });

  return {
    range,
    period: toPeriod(selection),
    comparisonPeriod: hasComparison ? toPeriod(comparison) : null,
    summary: summarize(days),
    previousSummary: hasComparison
      ? summarize(comparisonDates.map((date) => byDate.get(date)!))
      : null,
    salesData:
      days.length === 1 && days[0].hourlySales.length > 0
        ? days[0].hourlySales.map((point) => ({ ...point }))
        : days.map((day) => ({
            label: dayFormatter.format(new Date(`${day.date}T00:00:00Z`)),
            sales: getDaySales(day),
          })),
    menuPerformance: {
      bestPerforming: ranked.slice(0, 3),
      needAttention: ranked.slice(3).slice(-3).reverse(),
    },
  };
}
