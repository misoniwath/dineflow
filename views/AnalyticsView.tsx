"use client";

import { useState, type FormEvent } from "react";
import { Menu } from "@base-ui/react/menu";
import { ChevronDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SalesChartComponent from "@/components/analytics/SalesChartComponent";
import HomeStatCardComponent from "@/components/HomeStatCardComponent";
import MenuPerformanceCardComponent from "@/components/analytics/MenuPerformanceCardComponent";
import {
  getSampleAnalyticsData,
  sampleAnalyticsCoverage,
  sampleAnalyticsData,
} from "@/lib/analytics-samples";
import {
  formatAnalyticsPeriod,
  getAnalyticsDateError,
  getAnalyticsPeriodDates,
} from "@/lib/analytics";
import { createAnalyticsCsv } from "@/lib/analytics-export";
import type {
  AnalyticsDateRange,
  AnalyticsDateSelection,
  AnalyticsExportSection,
} from "@/types/Analytics";
import { money } from "@/lib/utils";

const rangeOptions: AnalyticsDateRange[] = [
  "Today",
  "This week",
  "This month",
  "Custom",
];
const exportOptions: { value: AnalyticsExportSection; label: string }[] = [
  { value: "summary", label: "Summary" },
  { value: "sales-breakdown", label: "Sales breakdown" },
  { value: "menu-performance", label: "Menu performance" },
];
const initialCustomDates = getAnalyticsPeriodDates(
  sampleAnalyticsData["This week"].period,
);

export default function AnalyticsView() {
  const [selectedRange, setSelectedRange] =
    useState<AnalyticsDateRange>("Today");
  const [customDates, setCustomDates] =
    useState<AnalyticsDateSelection>(initialCustomDates);
  const [draftDates, setDraftDates] =
    useState<AnalyticsDateSelection>(initialCustomDates);
  const [dateError, setDateError] = useState<string | null>(null);
  const analyticsData =
    selectedRange === "Custom"
      ? getSampleAnalyticsData("Custom", customDates)
      : sampleAnalyticsData[selectedRange];
  const { summary, previousSummary, salesData, menuPerformance } =
    analyticsData;
  const periodLabel = formatAnalyticsPeriod(analyticsData.period);
  const hasPendingDates =
    selectedRange === "Custom" &&
    (draftDates.startDate !== customDates.startDate ||
      draftDates.endDate !== customDates.endDate);

  function handleApplyDates(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = getAnalyticsDateError(draftDates, sampleAnalyticsCoverage);
    setDateError(error);
    if (!error) setCustomDates({ ...draftDates });
  }

  function handleExportCsv(section: AnalyticsExportSection) {
    const { content, filename } = createAnalyticsCsv(analyticsData, section);
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const comparisonLabel = {
    Today: "yesterday",
    "This week": "last week",
    "This month": "last month",
    Custom: analyticsData.comparisonPeriod
      ? `for ${formatAnalyticsPeriod(analyticsData.comparisonPeriod)}`
      : "in the previous period",
  }[selectedRange];
  const noComparisonNote = "Previous-period comparison unavailable.";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        {rangeOptions.map((range) => (
          <Button
            key={range}
            type="button"
            variant={selectedRange === range ? "default" : "outline"}
            aria-pressed={selectedRange === range}
            onClick={() => {
              setSelectedRange(range);
              setDateError(null);
              if (range === "Custom") setDraftDates({ ...customDates });
            }}
          >
            {range}
          </Button>
        ))}
        <Menu.Root>
          <Menu.Trigger
            disabled={hasPendingDates}
            render={<Button type="button" variant="outline" />}
          >
            <Download aria-hidden="true" />
            Export CSV
            <ChevronDown aria-hidden="true" />
          </Menu.Trigger>
          <Menu.Portal>
            <Menu.Positioner
              align="end"
              sideOffset={4}
              className="isolate z-50"
            >
              <Menu.Popup className="min-w-48 rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden">
                {exportOptions.map((option) => (
                  <Menu.Item
                    key={option.value}
                    onClick={() => handleExportCsv(option.value)}
                    className="cursor-default rounded-md px-3 py-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                  >
                    {option.label}
                  </Menu.Item>
                ))}
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
      </div>

      {selectedRange === "Custom" && (
        <form
          noValidate
          onSubmit={handleApplyDates}
          className="space-y-3 rounded-lg border p-4"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-full space-y-2 sm:w-44">
              <Label htmlFor="analytics-start-date">Start date</Label>
              <Input
                id="analytics-start-date"
                type="date"
                required
                min={sampleAnalyticsCoverage.startDate}
                max={sampleAnalyticsCoverage.endDate}
                value={draftDates.startDate}
                aria-invalid={Boolean(dateError)}
                aria-describedby={
                  dateError ? "analytics-date-error" : "analytics-demo-period"
                }
                onChange={(event) => {
                  setDraftDates((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }));
                  setDateError(null);
                }}
              />
            </div>
            <div className="w-full space-y-2 sm:w-44">
              <Label htmlFor="analytics-end-date">End date (inclusive)</Label>
              <Input
                id="analytics-end-date"
                type="date"
                required
                min={sampleAnalyticsCoverage.startDate}
                max={sampleAnalyticsCoverage.endDate}
                value={draftDates.endDate}
                aria-invalid={Boolean(dateError)}
                aria-describedby={
                  dateError ? "analytics-date-error" : "analytics-demo-period"
                }
                onChange={(event) => {
                  setDraftDates((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }));
                  setDateError(null);
                }}
              />
            </div>
            <Button type="submit">Apply dates</Button>
          </div>
          <p id="analytics-demo-period" className="text-xs text-muted-foreground">
            Demo dates: {sampleAnalyticsCoverage.startDate} to{" "}
            {sampleAnalyticsCoverage.endDate}. Both dates are included. Comparisons
            use the preceding period of the same length.
          </p>
          {dateError && (
            <p
              id="analytics-date-error"
              role="alert"
              className="text-sm text-destructive"
            >
              {dateError}
            </p>
          )}
          {hasPendingDates && !dateError && (
            <p role="status" className="text-sm text-muted-foreground">
              Select Apply dates to update the report and enable exports.
            </p>
          )}
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HomeStatCardComponent
          label="Net sales"
          value={money.format(summary.netSales / 100)}
          note={
            previousSummary
              ? `Compared to ${money.format(previousSummary.netSales / 100)} ${comparisonLabel}`
              : noComparisonNote
          }
        />
        <HomeStatCardComponent
          label="Average ticket"
          value={money.format(summary.averageTicket / 100)}
          note={
            previousSummary
              ? `Compared to ${money.format(previousSummary.averageTicket / 100)} ${comparisonLabel}`
              : noComparisonNote
          }
        />
        <HomeStatCardComponent
          label="Total orders"
          value={summary.totalOrders.toLocaleString("en-US")}
          note={
            previousSummary
              ? `Compared to ${previousSummary.totalOrders.toLocaleString("en-US")} ${comparisonLabel}`
              : noComparisonNote
          }
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SalesChartComponent
          range={selectedRange}
          periodLabel={periodLabel}
          salesData={salesData}
          covers={summary.covers}
        />
        <MenuPerformanceCardComponent menuPerformance={menuPerformance} />
      </div>
    </div>
  );
}
