import { ReactNode, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

const pageTitles: Record<string, string> = {
  "/": "Home",
  "/pipeline": "Pipeline de Investimentos",
  "/pipeline/cedentes": "Pipeline de Investimentos",
  "/pipeline/recebiveis": "Pipeline de Investimentos",
  "/agent": "Agente IA",
};

export function AppLayout({ children, title }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Auth temporarily disabled: skip redirect to login
  // useEffect(() => {
  //   const isAuthenticated = localStorage.getItem("isAuthenticated");
  //   if (!isAuthenticated) {
  //     navigate("/login");
  //   }
  // }, [navigate]);

  const pageTitle = title || pageTitles[location.pathname] ||
    (location.pathname.startsWith("/pipeline") ? "Pipeline de Investimentos" :
     location.pathname.startsWith("/agent") ? "Agente IA" : "FIDC Manager");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b bg-background flex items-center justify-between px-6 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <h2 className="text-xl font-semibold text-foreground">{pageTitle}</h2>
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  5
                </Badge>
              </Button>
              
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground">MS</AvatarFallback>
              </Avatar>
            </div>
          </header>

          <main className="flex-1 p-6 bg-muted/30 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
