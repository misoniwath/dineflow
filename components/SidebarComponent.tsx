"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/stores/AuthStore";

import { LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

import { navItems } from "@/lib/navItems";

export default function SidebarComponent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const logoutAndRedirect = async () => {
    await logout();
    router.push("/login");
  };

  const currentRole = user?.role || "guest";

  // Filter items based on user role
  const filteredNavItems = navItems.filter((item) => {
    // If no roles are specified, item is public/available to all
    if (!item.roles) return true;

    // Otherwise, check if the user's role is included in the allowed list
    return item.roles.includes(currentRole);
  });

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-sm font-semibold text-black">
                DF
              </div>
              <span className="truncate font-semibold">DineFlow</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    render={<Link href={item.href} />}
                    className="flex items-center gap-2 min-h-14 text-md"
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => logoutAndRedirect()}
                  className="flex items-center gap-2 min-h-14 text-md text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-4" />
                  <span>Log out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
