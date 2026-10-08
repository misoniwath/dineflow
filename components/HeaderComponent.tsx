"use client";
import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Bell, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { navItems } from "@/lib/navItems";

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const humanize = (s: string) =>
  s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function HeaderComponent({
  notifications = 4,
}: {
  notifications?: number;
}) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const now = useNow();

  const segments = pathname.split("/").filter(Boolean);
  const crumbs = [
    { href: "/", title: "Home" },
    ...segments.map((seg, i) => {
      const href = "/" + segments.slice(0, i + 1).join("/");
      return {
        href,
        title: navItems.find((n) => n.href === href)?.title ?? humanize(seg),
      };
    }),
  ];

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center border-b bg-background/60 px-4 backdrop-blur-md gap-4">
      <SidebarTrigger />

      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <div key={crumb.href} className="flex items-center gap-2">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage className="font-semibold">
                      {crumb.title}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink render={<Link href={crumb.href} />}>
                      {crumb.title}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <span className="hidden min-w-32 text-right text-sm text-muted-foreground sm:block">
          {now?.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </span>

        <Button
          variant="outline"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4 " />
          )}
        </Button>

        <Button variant="outline" aria-label={`${notifications} notifications`}>
          <Bell className="size-4" />
          {notifications > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-xs font-medium text-white">
              {notifications}
            </span>
          )}
        </Button>
      </div>
    </header>
  );
}
