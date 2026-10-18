import GuestOnlyComponent from "@/components/auth/GuestOnlyComponent";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-svh bg-background text-foreground">
      <GuestOnlyComponent>{children}</GuestOnlyComponent>
    </div>
  );
}
