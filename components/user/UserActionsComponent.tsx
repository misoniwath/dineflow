import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/types/User";

export default function UserActionsComponent({
  user,
  onEdit,
  onDelete,
}: {
  user: User;
  onEdit: (item: User) => void;
  onDelete: (item: User) => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => onEdit(user)}
        aria-label={`Edit ${user.name}`}
      >
        <Pencil className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 text-destructive hover:text-destructive"
        onClick={() => onDelete(user)}
        aria-label={`Delete ${user.name}`}
      >
        <Trash2 className="size-4" />
      </Button>
    </div>
  );
}
