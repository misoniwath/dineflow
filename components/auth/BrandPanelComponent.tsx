import BrandMarkComponent from "@/components/auth/BrandMarkComponent";

/** Desktop-only panel beside the sign-in form. */
export default function BrandPanelComponent() {
  return (
    <aside className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
      <BrandMarkComponent inverted />

      <div className="space-y-6">
        <h1 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
          The floor, the kitchen and the stockroom in one place.
        </h1>
        <ul className="space-y-3 text-sm text-primary-foreground/80">
          <li className="flex gap-3">
            <span className="w-16 shrink-0 font-medium text-primary-foreground">
              Staff
            </span>
            <span>
              Take orders, run the floor, manage reservations and stock.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="w-16 shrink-0 font-medium text-primary-foreground">
              Guest
            </span>
            <span>Have a look around with limited access.</span>
          </li>
        </ul>
      </div>

      <p className="text-xs text-primary-foreground/60">
        Signed in on a shared device? Sign out when your shift ends.
      </p>
    </aside>
  );
}
