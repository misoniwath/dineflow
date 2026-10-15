"use client";
import { useState } from "react";

import { cn, money } from "@/lib/utils";

import { MenuItem } from "@/types/MenuItem";
import { Tickets } from "@/types/Tickets";

import { Minus, Plus, Grid, CreditCard, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MenuCardComponent from "@/components/MenuCardComponent";

const menu: Record<string, MenuItem[]> = {
  Starters: [
    {
      id: "s1",
      name: "Charred shishito peppers",
      price: 9,
      image: "/images/s1.jpg",
      desc: "Smoky, charred peppers with sea salt",
    },
    {
      id: "s2",
      name: "Burrata & heirloom tomato",
      price: 12,
      image: "/images/s2.jpg",
      desc: "Creamy burrata, ripe tomatoes, basil",
    },
    {
      id: "s3",
      name: "Soup of the day",
      price: 7,
      image: "/images/s3.jpg",
      desc: "Ask your server for today's selection",
    },
  ],
  Mains: [],
  Drinks: [],
  Dessert: [],
};

const categories = Object.keys(menu);
const tables = Array.from({ length: 12 }, (_, i) => i + 1);
const itemsById = Object.fromEntries(
  Object.values(menu)
    .flat()
    .map((item) => [item.id, item]),
);

/* ------------------------------------------------------------------ */
/* Order view                                                          */
/* ------------------------------------------------------------------ */
export default function OrderView() {
  const [category, setCategory] = useState<string>(categories[0]);
  const [table, setTable] = useState<number>(4);
  const [tickets, setTickets] = useState<Tickets>({});
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [cartOpen, setCartOpen] = useState(false);

  const ticket = tickets[table] ?? {};
  const lines = Object.entries(ticket).map(([id, qty]) => ({
    item: itemsById[id],
    qty,
  }));
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);

  function changeQty(id: string, delta: number) {
    setTickets((prev) => {
      const current = prev[table] ? { ...prev[table] } : {};
      const next = (current[id] ?? 0) + delta;
      if (next <= 0) delete current[id];
      else current[id] = next;
      return { ...prev, [table]: current };
    });
  }

  function sendToKitchen() {
    // TODO: POST the ticket to your API here
    setTickets((prev) => ({ ...prev, [table]: {} }));
    setCartOpen(false);
  }

  return (
    <Tabs
      value={category}
      onValueChange={(v) => setCategory(String(v))}
      className="space-y-6"
    >
      {/* Top bar: category tabs + cart trigger */}
      <div className="flex flex-col lg:flex-row items-end lg:items-center justify-between gap-3">
        <TabsList className="h-auto w-full lg:w-3/4 justify-start rounded-lg bg-muted p-1 ">
          {categories.map((c) => (
            <TabsTrigger
              key={c}
              value={c}
              className="min-w-0 max-w-full cursor-pointer gap-2 px-3 py-1.5 text-sm"
            >
              <span className="truncate">{c}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {menu[c].length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Cart sheet */}
        <Sheet open={cartOpen} onOpenChange={setCartOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="gap-2">
              <ShoppingBag className="size-4" />

              <span>Table {table}</span>

              <Badge variant="secondary" className="rounded-full tabular-nums">
                {itemCount}
              </Badge>

              <span className="hidden border-l pl-2 tabular-nums sm:inline">
                {money.format(total)}
              </span>
            </Button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
          >
            <SheetHeader className="border-b p-4 pr-12">
              <div className="flex items-center justify-between gap-3">
                <SheetTitle className="flex items-center gap-2">
                  Table {table}
                  <Badge variant="secondary" className="rounded-full">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </Badge>
                </SheetTitle>

                {/* View mode switch */}
                <Tabs
                  value={viewMode}
                  onValueChange={(v) => setViewMode(v as "table" | "card")}
                >
                  <TabsList className="h-8">
                    <TabsTrigger value="table" className="gap-1.5 px-2 text-xs">
                      <Grid className="size-3.5" /> List
                    </TabsTrigger>
                    <TabsTrigger value="card" className="gap-1.5 px-2 text-xs">
                      <CreditCard className="size-3.5" /> Cards
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <SheetDescription>
                Pick a table, then review its order before sending.
              </SheetDescription>
            </SheetHeader>

            {/* Table picker */}
            <div className="border-b p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Select table</span>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-primary" />
                  Has an open order
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {tables.map((t) => {
                  const hasOrder = Object.keys(tickets[t] ?? {}).length > 0;
                  return (
                    <Button
                      key={t}
                      size="sm"
                      variant={t === table ? "default" : "outline"}
                      onClick={() => setTable(t)}
                      aria-pressed={t === table}
                      aria-label={`Table ${t}${hasOrder ? ", has an open order" : ""}`}
                      className="relative tabular-nums"
                    >
                      {t}
                      {hasOrder && (
                        <span
                          className={cn(
                            "absolute right-1 top-1 size-2 rounded-full",
                            t === table
                              ? "bg-primary-foreground"
                              : "bg-primary",
                          )}
                        />
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Lines (scrolls) */}
            <div className="flex-1 overflow-y-auto p-4">
              {lines.length === 0 ? (
                <div className="flex h-full min-h-40 flex-col items-center justify-center gap-1 text-center">
                  <p className="text-sm font-medium">No items yet</p>
                  <p className="text-sm text-muted-foreground">
                    Add dishes from the menu to start this order.
                  </p>
                </div>
              ) : viewMode === "table" ? (
                <ul className="divide-y">
                  {lines.map(({ item, qty }) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-2 py-3 text-sm first:pt-0 last:pb-0"
                    >
                      <span className="flex-1 truncate">{item.name}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        aria-label={`Remove one ${item.name}`}
                        onClick={() => changeQty(item.id, -1)}
                      >
                        <Minus className="size-3" />
                      </Button>
                      <span className="w-4 text-center tabular-nums">
                        {qty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="size-6"
                        aria-label={`Add one ${item.name}`}
                        onClick={() => changeQty(item.id, 1)}
                      >
                        <Plus className="size-3" />
                      </Button>
                      <span className="w-16 text-right tabular-nums">
                        {money.format(item.price * qty)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="grid gap-3">
                  {lines.map(({ item, qty }) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                        <img
                          src={item.image ?? "/images/placeholder.png"}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {money.format(item.price)} each
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => changeQty(item.id, -1)}
                          >
                            <Minus className="size-3" />
                          </Button>
                          <span className="w-4 text-center text-sm tabular-nums">
                            {qty}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-6"
                            aria-label={`Add one ${item.name}`}
                            onClick={() => changeQty(item.id, 1)}
                          >
                            <Plus className="size-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="font-semibold tabular-nums">
                        {money.format(item.price * qty)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SheetFooter className="gap-3 border-t p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Total</span>
                <span className="text-xl font-semibold tabular-nums">
                  {money.format(total)}
                </span>
              </div>
              <Button disabled={itemCount === 0} onClick={sendToKitchen}>
                Send to kitchen
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* One tab panel per category */}
      {categories.map((c) => (
        <TabsContent key={c} value={c} className="mt-0">
          {menu[c].length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              No {c.toLowerCase()} on the menu yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {menu[c].map((item) => (
                <MenuCardComponent
                  money={money}
                  key={item.id}
                  item={item}
                  qty={ticket[item.id] ?? 0}
                  onChange={(delta) => changeQty(item.id, delta)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}
