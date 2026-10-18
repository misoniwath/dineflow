import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";

export default function StatusBadgeComponent({
  statusLabel,
  statusBadge,
  status,
}: {
  statusLabel: any;
  statusBadge: any;
  status: any;
}) {
  return (
    <Badge className={cn("rounded-full font-normal", statusBadge[status])}>
      {statusLabel[status]}
    </Badge>
  );
}
