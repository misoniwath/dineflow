"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMenuPerformanceSections } from "@/lib/menu-performance";
import { money } from "@/lib/utils";
import type { AnalyticsData } from "@/types/Analytics";

type MenuPerformanceCardProps = {
  menuPerformance: AnalyticsData["menuPerformance"];
};
export default function MenuPerformanceCardComponent({
  menuPerformance,
}: MenuPerformanceCardProps) {
  const menuSections = getMenuPerformanceSections(menuPerformance);

  return (
    <Card className="min-w-0">
      <CardHeader className="border-b">
        <CardTitle>Menu performance</CardTitle>
        <CardDescription>
          Ranked by sales revenue for the selected period.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {menuSections.map((section) => (
          <div key={section.id}>
            <h3
              className={`mb-2 text-sm font-semibold ${
                section.id === "lowest-revenue" ? "text-red-500" : ""
              }`}
            >
              {section.title}
            </h3>
            <Table aria-label={section.title}>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Item</TableHead>
                  <TableHead scope="col" className="text-right">
                    Qty sold
                  </TableHead>
                  <TableHead scope="col" className="text-right">
                    Revenue (USD)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {section.items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      No sales data for this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  section.items.map((item) => (
                    <TableRow key={item.name}>
                      <TableCell className="font-medium whitespace-normal text-muted-foreground">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.quantitySold.toLocaleString("en-US")}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {money.format(item.sales / 100)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
