import { UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * DineFlow logo + name. Set `inverted` on a primary-coloured background
 * (it inherits the text colour from its parent).
 */
export default function BrandMarkComponent({
  inverted = false,
  className,
}: {
  inverted?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "flex size-9 items-center justify-center rounded-lg",
          inverted
            ? "bg-primary-foreground/15"
            : "bg-primary text-primary-foreground",
        )}
      >
        <UtensilsCrossed className="size-5" />
      </span>
      <span className="text-lg font-semibold tracking-tight">DineFlow</span>
    </div>
  );
}
