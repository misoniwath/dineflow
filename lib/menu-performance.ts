import type { AnalyticsData } from "@/types/Analytics";

export function getMenuPerformanceSections(
  menuPerformance: AnalyticsData["menuPerformance"],
) {
  return [
    {
      id: "highest-revenue",
      title: "Highest revenue",
      items: [...menuPerformance.bestPerforming].sort(
        (a, b) => b.sales - a.sales,
      ),
    },
    {
      id: "lowest-revenue",
      title: "Lowest revenue",
      items: [...menuPerformance.needAttention].sort(
        (a, b) => a.sales - b.sales,
      ),
    },
  ];
}
