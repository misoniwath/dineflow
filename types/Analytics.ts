export type AnalyticsPresetRange = "Today" | "This week" | "This month";

export type AnalyticsDateRange = AnalyticsPresetRange | "Custom";

export type AnalyticsDateSelection = {
  startDate: string;
  endDate: string;
};

export type AnalyticsPeriod = {
  startAt: string;
  endAt: string;
  timezone: string;
};

export type AnalyticsExportSection =
  | "summary"
  | "sales-breakdown"
  | "menu-performance";

export type AnalyticsSummary = {
  netSales: number;
  averageTicket: number;
  totalOrders: number;
  covers: number;
};

export type SalesDataPoint = {
  label: string;
  sales: number;
};

export type MenuItemPerformance = {
  name: string;
  sales: number;
  quantitySold: number;
};

export type AnalyticsDailyRecord = {
  date: string;
  totalOrders: number;
  covers: number;
  menuItems: MenuItemPerformance[];
  hourlySales: SalesDataPoint[];
};

export type AnalyticsData = {
  range: AnalyticsDateRange;
  period: AnalyticsPeriod;
  comparisonPeriod: AnalyticsPeriod | null;
  summary: AnalyticsSummary;
  previousSummary: AnalyticsSummary | null;
  salesData: SalesDataPoint[];
  menuPerformance: {
    bestPerforming: MenuItemPerformance[];
    needAttention: MenuItemPerformance[];
  };
};
