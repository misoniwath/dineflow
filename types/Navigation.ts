import { Role } from "@/types/Auth";
import { LucideIcon } from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  desc: string;
  icon: LucideIcon;
  badge?: number;
  roles: Role[];
};
