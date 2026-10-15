"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  ChefHat,
  LayoutGrid,
  Package,
  Plus,
  Receipt,
  ShoppingBag,
  Users,
  UsersRound,
} from "lucide-react";
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
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Placeholder data — swap for your store / API                        */
/* ------------------------------------------------------------------ */

type TableStatus = "free" | "occupied" | "reserved";

const tableStatus: Record<number, TableStatus> = {
  1: "occupied",
  2: "free",
  3: "reserved",
  4: "occupied",
  5: "free",
  6: "occupied",
  7: "free",
  8: "reserved",
  9: "free",
  10: "occupied",
  11: "free",
  12: "free",
};

const kitchenQueue = {
  preparing: [
    {
      id: "T4-1",
      table: 4,
      summary: "Burrata & heirloom tomato ×2, Soup ×1",
      minutes: 6,
    },
    {
      id: "T1-2",
      table: 1,
      summary: "Charred shishito peppers ×1",
      minutes: 11,
    },
    { id: "T10-1", table: 10, summary: "Soup of the day ×3", minutes: 3 },
  ],
  ready: [
    {
      id: "T6-1",
      table: 6,
      summary: "Burrata & heirloom tomato ×1",
      minutes: 0,
    },
  ],
};

const reservations = [
  { id: "r1", name: "Dara Chhun", party: 4, time: "6:30 PM", table: 3 },
  { id: "r2", name: "Sophea Lim", party: 2, time: "7:00 PM", table: 8 },
  { id: "r3", name: "Kosal Pich", party: 6, time: "8:15 PM", table: null },
];

const lowStock = [
  { id: "i1", name: "Burrata", left: 3, unit: "pcs", par: 12 },
  { id: "i2", name: "Heirloom tomatoes", left: 2, unit: "kg", par: 8 },
  { id: "i3", name: "Shishito peppers", left: 1.5, unit: "kg", par: 5 },
];

const modules = [
  {
    href: "/order",
    label: "Order entry",
    desc: "Take orders by table",
    icon: ShoppingBag,
  },
  {
    href: "/kitchen",
    label: "Kitchen display",
    desc: "Tickets in progress",
    icon: ChefHat,
  },
  {
    href: "/floor-plan",
    label: "Floor plan",
    desc: "Table layout and status",
    icon: LayoutGrid,
  },
  {
    href: "/reservations",
    label: "Reservations",
    desc: "Bookings and waitlist",
    icon: CalendarClock,
  },
  {
    href: "/billing",
    label: "Billing",
    desc: "Close out and split bills",
    icon: Receipt,
  },
  {
    href: "/inventory",
    label: "Inventory",
    desc: "Items and suppliers",
    icon: Package,
  },
  {
    href: "/scheduling",
    label: "Scheduling",
    desc: "Staff shifts",
    icon: UsersRound,
  },
  {
    href: "/analytics",
    label: "Analytics",
    desc: "Sales and trends",
    icon: BarChart3,
  },
  { href: "/users", label: "Users", desc: "Accounts and roles", icon: Users },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function useGreeting() {
  // Computed after mount so server and client markup match.
  const [greeting, setGreeting] = useState("Welcome back");
  const [date, setDate] = useState("");
  useEffect(() => {
    const now = new Date();
    const h = now.getHours();
    setGreeting(
      h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening",
    );
    setDate(
      now.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }),
    );
  }, []);
  return { greeting, date };
}

function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4 pb-0">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-1 text-xs text-muted-foreground">
        {note}
      </CardContent>
    </Card>
  );
}

const statusStyles: Record<TableStatus, string> = {
  free: "border bg-background text-foreground hover:bg-muted",
  occupied: "bg-primary text-primary-foreground",
  reserved: "border border-dashed border-primary bg-background text-foreground",
};

/* ------------------------------------------------------------------ */
/* Home                                                                */
/* ------------------------------------------------------------------ */

export default function HomePage() {
  const { greeting, date } = useGreeting();
  const [queueTab, setQueueTab] = useState<"preparing" | "ready">("preparing");

  const tableList = Object.entries(tableStatus).map(([n, s]) => ({
    n: Number(n),
    s,
  }));
  const occupied = tableList.filter((t) => t.s === "occupied").length;
  const reserved = tableList.filter((t) => t.s === "reserved").length;

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
        <Stat
          label="Sales today"
          value={money.format(1284)}
          note="42 orders closed"
        />
        <Stat
          label="Open orders"
          value={String(
            kitchenQueue.preparing.length + kitchenQueue.ready.length,
          )}
          note={`${kitchenQueue.ready.length} ready to serve`}
        />
        <Stat
          label="Tables in use"
          value={`${occupied}/${tableList.length}`}
          note={`${reserved} reserved soon`}
        />
        <Stat
          label="Reservations tonight"
          value={String(reservations.length)}
          note={`${reservations.reduce((s, r) => s + r.party, 0)} guests expected`}
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
                    asChild
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
                      {kitchenQueue.preparing.length}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="ready" className="gap-2 px-3">
                    Ready
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {kitchenQueue.ready.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                {(["preparing", "ready"] as const).map((key) => (
                  <TabsContent key={key} value={key} className="mt-4">
                    {kitchenQueue[key].length === 0 ? (
                      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Nothing{" "}
                        {key === "ready"
                          ? "waiting to be served"
                          : "in the kitchen"}{" "}
                        right now.
                      </p>
                    ) : (
                      <ul className="divide-y rounded-lg border">
                        {kitchenQueue[key].map((t) => (
                          <li
                            key={t.id}
                            className="flex items-center gap-3 p-3 text-sm"
                          >
                            <Badge variant="secondary" className="rounded-full">
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
                ))}
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
              <Button asChild variant="ghost" size="sm">
                <Link href="/reservations">View all</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {reservations.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 text-sm">
                    <span className="w-16 shrink-0 tabular-nums text-muted-foreground">
                      {r.time}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Party of {r.party}
                      </div>
                    </div>
                    {r.table ? (
                      <Badge variant="secondary" className="rounded-full">
                        Table {r.table}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full">
                        Unassigned
                      </Badge>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-base">Running low</CardTitle>
                <CardDescription>Below par level.</CardDescription>
              </div>
              <Button asChild variant="ghost" size="sm">
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
                        {i.left} / {i.par} {i.unit}
                      </span>
                    </div>
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                      role="progressbar"
                      aria-valuenow={i.left}
                      aria-valuemin={0}
                      aria-valuemax={i.par}
                      aria-label={`${i.name} stock level`}
                    >
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{
                          width: `${Math.min(100, (i.left / i.par) * 100)}%`,
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
          {modules.map(({ href, label, desc, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{label}</span>
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
