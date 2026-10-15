import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function HomeStatCardComponent({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="px-4 pb-0">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-1 text-xs text-muted-foreground">
        {note}
      </CardContent>
    </Card>
  );
}
