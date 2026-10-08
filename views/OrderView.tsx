"use client";
import { useState } from "react";

import { Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MenuItem = { id: string; name: string; price: number };

const menu: Record<string, MenuItem[]> = {
  Starters: [
    { id: "s1", name: "Charred shishito peppers", price: 9 },
    { id: "s2", name: "Burrata & heirloom tomato", price: 12 },
    { id: "s3", name: "Soup of the day", price: 7 },
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

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

// tableNumber -> { itemId -> quantity }
type Tickets = Record<number, Record<string, number>>;

export default function OrderView() {
  const [category, setCategory] = useState(categories[0]);
  const [table, setTable] = useState(4);
  const [tickets, setTickets] = useState<Tickets>({});

  const ticket = tickets[table] ?? {};
  const lines = Object.entries(ticket).map(([id, qty]) => ({
    item: itemsById[id],
    qty,
  }));
  const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
  const total = lines.reduce((sum, l) => sum + l.item.price * l.qty, 0);

  function changeQty(id: string, delta: number) {
    setTickets((prev) => {
      const current = { ...(prev[table] ?? {}) };
      const next = (current[id] ?? 0) + delta;
      if (next <= 0) delete current[id];
      else current[id] = next;
      return { ...prev, [table]: current };
    });
  }

  function sendToKitchen() {
    // TODO: POST the ticket to your API here
    setTickets((prev) => ({ ...prev, [table]: {} }));
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
      {/* Menu */}
      <section className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Button
              key={c}
              size="sm"
              variant={c === category ? "secondary" : "outline"}
              onClick={() => setCategory(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {menu[category].map((item) => (
            <button
              key={item.id}
              onClick={() => changeQty(item.id, 1)}
              className="rounded-lg border bg-card p-3 text-left text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <div className="font-medium">{item.name}</div>
              <div className="text-muted-foreground">
                {money.format(item.price)}
              </div>
            </button>
          ))}
          {menu[category].length === 0 && (
            <p className="col-span-full text-sm text-muted-foreground">
              No items in this category yet.
            </p>
          )}
        </div>
      </section>

      {/* Ticket */}
      <Card className="gap-0 py-0 lg:sticky lg:top-20">
        <CardHeader className="flex flex-row items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Table {table}</h2>
          <Badge variant="secondary" className="rounded-full">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </Badge>
        </CardHeader>

        {/* Table picker */}
        <div className="flex flex-wrap gap-2 border-b p-4">
          {tables.map((t) => {
            const hasOrder = Object.keys(tickets[t] ?? {}).length > 0;
            return (
              <Button
                key={t}
                size="sm"
                variant={t === table ? "default" : "outline"}
                onClick={() => setTable(t)}
                className={cn("relative h-7 min-w-7 px-2 text-xs")}
              >
                {t}
                {hasOrder && t !== table && (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-amber-400" />
                )}
              </Button>
            );
          })}
        </div>

        {/* Lines */}
        <CardContent className="min-h-24 border-b px-4 py-4">
          {lines.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              Add items from the menu to start this ticket.
            </p>
          ) : (
            <ul className="space-y-3">
              {lines.map(({ item, qty }) => (
                <li key={item.id} className="flex items-center gap-2 text-sm">
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
                  <span className="w-4 text-center tabular-nums">{qty}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-6"
                    aria-label={`Add one ${item.name}`}
                    onClick={() => changeQty(item.id, 1)}
                  >
                    <Plus className="size-3" />
                  </Button>
                  <span className="w-14 text-right tabular-nums">
                    {money.format(item.price * qty)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>

        <CardFooter className="flex-col items-stretch gap-3 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Total</span>
            <span className="text-xl font-semibold tabular-nums">
              {money.format(total)}
            </span>
          </div>
          <Button disabled={itemCount === 0} onClick={sendToKitchen}>
            Send to kitchen
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
