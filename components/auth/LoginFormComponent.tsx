"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { FieldErrors } from "@/types/Auth";

// import DemoHintComponent from "@/components/auth/DemoHintComponent";
import PasswordInputComponent from "@/components/auth/PasswordInputComponent";
import FieldComponent from "@/components/auth/FieldComponent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_HOME, useAuth } from "@/stores/AuthStore";

export default function LoginFormComponent() {
  const router = useRouter();
  const { login, continueAsGuest } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: any) {
    e.preventDefault();
    if (loading) return;

    const next: FieldErrors = {};
    const value = email.trim();
    if (!value) next.email = "Enter your email.";
    else if (!/^\S+@\S+\.\S+$/.test(value))
      next.email = "Enter a valid email address.";
    if (!password) next.password = "Enter your password.";

    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    const result = await login({ email: value, password });
    if (result.ok) {
      router.push(ROLE_HOME[result.user.role]);
      return; // keep the loading state while navigating
    }
    setLoading(false);
    setFormError(result.error);
    setPassword("");
  }

  function handleGuest() {
    continueAsGuest();
    router.push(ROLE_HOME.guest);
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <FieldComponent id="email" label="Email" error={errors.email}>
          <Input
            type="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="you@restaurant.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FieldComponent>

        <FieldComponent id="password" label="Password" error={errors.password}>
          <PasswordInputComponent
            autoComplete="current-password"
            value={password}
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
          />
        </FieldComponent>

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={loading}
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          {loading ? "Signing in" : "Sign in"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Forgot your password? Ask the owner to reset it.
        </p>
      </form>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full cursor-pointer"
        disabled={loading}
        onClick={handleGuest}
      >
        Continue as guest
      </Button>

      {/* <DemoHintComponent /> */}
    </div>
  );
}
