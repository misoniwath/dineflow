import { MenuItem } from "@/types/Menu";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";

export default function MenuCardComponent({
  money,
  item,
  qty,
  onChange,
}: {
  money: Intl.NumberFormat;
  item: MenuItem;
  qty: number;
  onChange: (delta: number) => void;
}) {
  return (
    <article
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card transition-colors",
        qty > 0 && "border-primary/60",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        <img
          src={item.image ?? "/images/placeholder.png"}
          alt={item.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <Badge className="absolute bottom-2 left-2 rounded-full bg-background/90 text-foreground tabular-nums backdrop-blur hover:bg-background/90">
          {money.format(item.price)}
        </Badge>
        {qty > 0 && (
          <Badge className="absolute right-2 top-2 rounded-full tabular-nums">
            {qty} in order
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="space-y-1">
          <h3 className="text-sm font-medium leading-snug">{item.name}</h3>
          {item.desc && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {item.desc}
            </p>
          )}
        </div>

        <div className="mt-auto">
          {qty === 0 ? (
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => onChange(1)}
              aria-label={`Add ${item.name}`}
            >
              <Plus className="mr-1.5 size-4" /> Add
            </Button>
          ) : (
            <div className="flex items-center justify-between rounded-md border bg-background p-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => onChange(-1)}
                aria-label={`Remove one ${item.name}`}
              >
                <Minus className="size-4" />
              </Button>
              <span className="text-sm font-medium tabular-nums">{qty}</span>
              <Button
                size="icon"
                variant="ghost"
                className="size-8"
                onClick={() => onChange(1)}
                aria-label={`Add one ${item.name}`}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
