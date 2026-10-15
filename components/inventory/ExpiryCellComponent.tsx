import { cn } from "@/lib/utils";

function expiryInfo(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((target - today) / 86_400_000);
  const label = new Date(target).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  return { label, days };
}

export default function ExpiryCellComponent({ iso }: { iso: string | null }) {
  const info = expiryInfo(iso);
  if (!info) return <span className="text-muted-foreground">—</span>;
  const expired = info.days < 0;
  const soon = !expired && info.days <= 7;
  return (
    <div className="leading-tight">
      <div>{info.label}</div>
      {(expired || soon) && (
        <div
          className={cn(
            "text-xs",
            expired
              ? "text-red-600 dark:text-red-400"
              : "text-amber-600 dark:text-amber-400",
          )}
        >
          {expired
            ? "Expired"
            : info.days === 0
              ? "Expires today"
              : `${info.days}d left`}
        </div>
      )}
    </div>
  );
}
