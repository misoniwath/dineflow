import { STATUS_LABEL } from "@/stores/InventoryStore";
import { StockStatus } from "@/types/Inventory";

import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export default function StatusBadgeComponent({
  statusBadge,
  status,
}: {
  statusBadge: Record<StockStatus, string>;
  status: StockStatus;
}) {
  return (
    <Badge className={cn("rounded-full font-normal", statusBadge[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
