import BrandMarkComponent from "@/components/auth/BrandMarkComponent";
import BrandPanelComponent from "@/components/auth/BrandPanelComponent";
import LoginFormComponent from "@/components/auth/LoginFormComponent";

export default function LoginView() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <BrandPanelComponent />

      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <BrandMarkComponent className="lg:hidden" />

          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
            <p className="text-sm text-muted-foreground">
              Use your work email, or continue as a guest.
            </p>
          </div>

          <LoginFormComponent />
        </div>
      </main>
    </div>
  );
}
