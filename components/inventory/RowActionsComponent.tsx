import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

export default function RowActionsComponent({
  item,
  onEdit,
  onDelete,
}: {
  item: any;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => onEdit(item)}
        aria-label={`Edit ${item.name}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-muted-foreground hover:text-destructive"
        onClick={() => onDelete(item)}
        aria-label={`Remove ${item.name}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
