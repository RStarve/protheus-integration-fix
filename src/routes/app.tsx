import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { UserMenu } from "@/components/user-menu";
import { Separator } from "@/components/ui/separator";
import { BranchSelector } from "@/components/branch-selector";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

function AppLayout() {
  const { usuario } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!usuario) navigate({ to: "/" });
  }, [usuario, navigate]);

  if (!usuario) return null;

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1 flex flex-col min-w-0">
          <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4">
            <SidebarTrigger className="text-foreground" />
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1" />
            <BranchSelector />
            <UserMenu />
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
