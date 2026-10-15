import { getStatus } from "@/stores/InventoryStore";
import { InventoryItem, StockStatus } from "@/types/Inventory";

import { cn } from "@/lib/utils";

function pctOf(item: InventoryItem) {
  return Math.max(0, Math.min(100, (item.onHand / item.par) * 100));
}

export default function StockBarComponent({
  statusBar,
  item,
  className,
}: {
  statusBar: Record<StockStatus, string>;
  item: InventoryItem;
  className?: string;
}) {
  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-label={`${item.name} stock level`}
      aria-valuemin={0}
      aria-valuemax={item.par}
      aria-valuenow={item.onHand}
    >
      <div
        className={cn("h-full rounded-full", statusBar[getStatus(item)])}
        style={{ width: `${pctOf(item)}%` }}
      />
    </div>
  );
}
