import { NavItem } from "@/types/Navigation";

import {
  Home,
  ClipboardList,
  MonitorCheck,
  LayoutGrid,
  CalendarDays,
  Receipt,
  Package,
  User,
  BarChart3,
  Users,
} from "lucide-react";

export const navItems: NavItem[] = [
  {
    title: "Home",
    href: "/",
    desc: "View your dashboard and get an overview of restaurant operations.",
    icon: Home,
  },
  {
    title: "Order entry",
    href: "/order",
    desc: "Create, manage, and track customer orders.",
    icon: ClipboardList,
    badge: 1,
  },
  {
    title: "Kitchen display",
    href: "/kitchen",
    desc: "Monitor incoming orders and track kitchen preparation status.",
    icon: MonitorCheck,
    badge: 1,
  },
  {
    title: "Floor plan",
    href: "/floor-plan",
    desc: "Manage restaurant tables, seating arrangements, and table availability.",
    icon: LayoutGrid,
    badge: 1,
  },
  {
    title: "Reservations",
    href: "/reservations",
    desc: "Manage customer bookings, reservation schedules, and guest details.",
    icon: CalendarDays,
  },
  {
    title: "Billing",
    href: "/billing",
    desc: "Process payments, manage bills, and review transaction records.",
    icon: Receipt,
  },
  {
    title: "Inventory",
    href: "/inventory",
    desc: "Track stock levels, manage ingredients, and monitor inventory movements.",
    icon: Package,
    badge: 1,
  },
  {
    title: "Scheduling",
    href: "/scheduling",
    desc: "Organize staff shifts, manage work schedules, and track staffing needs.",
    icon: User,
  },
  {
    title: "Analytics",
    href: "/analytics",
    desc: "Analyze sales performance, revenue trends, and restaurant operations.",
    icon: BarChart3,
  },
  {
    title: "Users",
    href: "/users",
    desc: "Manage user accounts, roles, permissions, and staff access.",
    icon: Users,
  },
];
