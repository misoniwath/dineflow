"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

import { navItems } from "@/lib/navItems";
import { cn, money } from "@/lib/utils";

import { TableStatus } from "@/types/Floor";

import { useGreeting } from "@/hooks/useGreeting";
import { useFloor } from "@/stores/FloorStore";
import { useReservations, todayISO } from "@/stores/ReservationStore";
import { useOrder } from "@/stores/OrderStore";
import { useInventory } from "@/stores/InventoryStore";

import { ArrowRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeStatCardComponent from "@/components/HomeStatCardComponent";

const statusStyles: Record<TableStatus, string> = {
  free: "border bg-background text-foreground hover:bg-muted",
  occupied: "bg-primary text-primary-foreground",
  reserved: "border border-dashed border-primary bg-background text-foreground",
  cleaning: "border border-amber-500/60 bg-amber-500/15 text-foreground",
};

export default function HomeView() {
  const { greeting, date } = useGreeting();
  const [queueTab, setQueueTab] = useState<"preparing" | "ready">("preparing");

  // Consume store data
  const { tables, loading: floorLoading, loadData: loadFloor } = useFloor();
  const {
    reservations,
    loading: resLoading,
    loadData: loadReservation,
  } = useReservations();
  const {
    kitchenQueue,
    loading: orderLoading,
    loadData: loadOrder,
  } = useOrder();
  const {
    items: inventoryItems,
    loading: inventoryLoading,
    loadData: loadInventory,
  } = useInventory();

  const loading =
    floorLoading || resLoading || orderLoading || inventoryLoading;

  const tableList = tables.map((t) => ({
    n: t.number,
    s: t.status as TableStatus,
  }));

  const occupied = tableList.filter((t) => t.s === "occupied").length;
  const reserved = tableList.filter((t) => t.s === "reserved").length;

  // Filter tonight's reservations based on today's date
  const today = todayISO();
  const tonightReservations = reservations.filter((r) => r.date === today);

  // Low stock inventory placeholder (can be swapped with an inventory store if hooked up)
  const lowStock = inventoryItems.filter((item) => item.onHand <= item.lowAt);

  useEffect(() => {
    loadFloor();
    loadReservation();
    loadOrder();
    loadInventory();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting}</h1>
          <p className="min-h-5 text-sm text-muted-foreground">{date}</p>
        </div>
        <Button>
          <Link href="/order" className="flex items-center gap-1.5">
            <span>New Order</span>
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <HomeStatCardComponent
          label="Sales today"
          value={money.format(1284)}
          note="42 orders closed"
        />
        <HomeStatCardComponent
          label="Open orders"
          value={String(
            (kitchenQueue?.preparing?.length || 0) +
              (kitchenQueue?.ready?.length || 0),
          )}
          note={`${kitchenQueue?.ready?.length || 0} ready to serve`}
        />
        <HomeStatCardComponent
          label="Tables in use"
          value={`${occupied}/${tableList.length || 12}`}
          note={`${reserved} reserved soon`}
        />
        <HomeStatCardComponent
          label="Reservations tonight"
          value={String(tonightReservations.length)}
          note={`${tonightReservations.reduce((s, r) => s + r.party, 0)} guests expected`}
        />
      </div>

      {/* Main grid */}
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          {/* Floor snapshot */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Floor</CardTitle>
                <CardDescription>
                  Tap a table to open its order.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <Link href="/floor-plan" className="flex items-center">
                  <span>Floor plan</span>
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {tableList.map(({ n, s }) => (
                  <Button
                    key={n}
                    variant="ghost"
                    className={cn("h-14 tabular-nums", statusStyles[s])}
                  >
                    <Link
                      href={`/order?table=${n}`}
                      aria-label={`Table ${n}, ${s}`}
                    >
                      {n}
                    </Link>
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm border" /> Free
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm bg-primary" /> Occupied
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-3 rounded-sm border border-dashed border-primary" />
                  Reserved
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Kitchen queue */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Kitchen queue</CardTitle>
                <CardDescription>
                  Live tickets from the kitchen.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <Link href="/kitchen" className="flex items-center">
                  <span>Open display </span>
                  <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <Tabs
                value={queueTab}
                onValueChange={(v) => setQueueTab(v as "preparing" | "ready")}
              >
                <TabsList>
                  <TabsTrigger value="preparing" className="gap-2 px-3">
                    Preparing
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {kitchenQueue?.preparing?.length || 0}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="ready" className="gap-2 px-3">
                    Ready
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {kitchenQueue?.ready?.length || 0}
                    </span>
                  </TabsTrigger>
                </TabsList>

                {(["preparing", "ready"] as const).map((key) => {
                  const items = kitchenQueue?.[key] || [];
                  return (
                    <TabsContent key={key} value={key} className="mt-4">
                      {items.length === 0 ? (
                        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                          Nothing{" "}
                          {key === "ready"
                            ? "waiting to be served"
                            : "in the kitchen"}{" "}
                          right now.
                        </p>
                      ) : (
                        <ul className="divide-y rounded-lg border">
                          {items.map((t: any) => (
                            <li
                              key={t.id}
                              className="flex items-center gap-3 p-3 text-sm"
                            >
                              <Badge
                                variant="secondary"
                                className="rounded-full"
                              >
                                Table {t.table}
                              </Badge>
                              <span className="min-w-0 flex-1 truncate">
                                {t.summary}
                              </span>
                              {key === "preparing" && (
                                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                                  {t.minutes} min
                                </span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  Tonight&apos;s reservations
                </CardTitle>
              </div>
              <Button variant="ghost" size="sm">
                <Link href="/reservations">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {tonightReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No reservations left for tonight.
                </p>
              ) : (
                <ul className="space-y-3">
                  {tonightReservations.map((r) => {
                    const assignedTable = tables.find(
                      (t) => t.id === r.tableId,
                    );
                    return (
                      <li
                        key={r.id}
                        className="flex items-center gap-3 text-sm"
                      >
                        <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
                          {r.time}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Party of {r.party}
                          </div>
                        </div>
                        {assignedTable ? (
                          <Badge variant="secondary" className="rounded-full">
                            Table {assignedTable.number}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="rounded-full">
                            Unassigned
                          </Badge>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Running low</CardTitle>
                <CardDescription>Below par level.</CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                <Link href="/inventory">Inventory</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {lowStock.map((i) => (
                  <li key={i.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{i.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {i.onHand} / {i.par} {i.unit}
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={i.onHand}
                      aria-valuemin={0}
                      aria-valuemax={i.par}
                      aria-label={`${i.name} stock level`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, (i.onHand / i.par) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Module shortcuts */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Everything else</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {navItems.map(({ href, title, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {desc}
                </span>
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
