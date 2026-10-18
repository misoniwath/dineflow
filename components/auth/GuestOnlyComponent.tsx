"use client";
import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { ROLE_HOME, useAuth } from "@/stores/AuthStore";

/**
 * Wraps the auth pages. If someone who is already signed in opens /login,
 * send them to their home page instead of showing the form.
 *
 * Auth state is in memory for now, so a page refresh signs you out and
 * lands you back on the form. That goes away once the session lives in a
 * cookie.
 */
export default function GuestOnlyComponent({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace(ROLE_HOME[user.role]);
  }, [user, router]);

  // Render nothing while redirecting so the form doesn't flash.
  if (user) return null;

  return <>{children}</>;
}
