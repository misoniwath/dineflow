import { demoAccounts } from "@/stores/AuthStore";

/** Dev-only sign-in hint. Delete along with the demo accounts. */
export default function DemoHintComponent() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <div className="space-y-1 rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
      <p>Demo accounts</p>
      <ul className="space-y-0.5">
        {demoAccounts.map((a) => (
          <li key={a.email} className="font-mono text-foreground">
            {a.email} / {a.password}
          </li>
        ))}
      </ul>
    </div>
  );
}
