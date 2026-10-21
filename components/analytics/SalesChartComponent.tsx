"use client";

import { Bar, BarChart, XAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { money } from "@/lib/utils";
import type { AnalyticsDateRange, SalesDataPoint } from "@/types/Analytics";

type SalesChartProps = {
  range: AnalyticsDateRange;
  periodLabel?: string;
  salesData: SalesDataPoint[];
  covers: number;
};

const chartConfig = {
  sales: {
    label: "Sales",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export default function SalesChartComponent({
  range,
  periodLabel,
  salesData,
  covers,
}: SalesChartProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b">
        <CardTitle>
          Sales — {range === "Custom" && periodLabel
            ? periodLabel
            : range.toLowerCase()}
        </CardTitle>
        <Badge variant="secondary">{covers.toLocaleString("en-US")} covers</Badge>
      </CardHeader>

      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-64 w-full"
        >
          <BarChart accessibilityLayer data={salesData}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={10}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value) => money.format(Number(value) / 100)}
                />
              }
            />
            <Bar
              dataKey="sales"
              fill="var(--color-sales)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
