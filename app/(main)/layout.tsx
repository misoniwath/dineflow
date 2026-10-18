import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import SidebarComponent from "@/components/SidebarComponent";
import HeaderComponent from "@/components/HeaderComponent";

export default function MainLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <SidebarComponent />

      <SidebarInset>
        <HeaderComponent />
        <main className="p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
