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

export const navItems = [
  { title: "Home", href: "/", icon: Home },
  { title: "Order entry", href: "/order", icon: ClipboardList, badge: 1 },
  {
    title: "Kitchen display",
    href: "/kitchen",
    icon: MonitorCheck,
    badge: 1,
  },
  { title: "Floor plan", href: "/floor-plan", icon: LayoutGrid, badge: 1 },
  { title: "Reservations", href: "/reservations", icon: CalendarDays },
  { title: "Billing", href: "/billing", icon: Receipt },
  { title: "Inventory", href: "/inventory", icon: Package, badge: 1 },
  { title: "Scheduling", href: "/scheduling", icon: User },
  { title: "Analytics", href: "/analytics", icon: BarChart3 },
  { title: "Users", href: "/users", icon: Users },
];
