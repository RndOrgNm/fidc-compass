import { Home, Bot, TrendingUp, GitBranch } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const menuItems = [
  { title: "Home", url: "/", icon: Home },
  { title: "Pipeline", url: "/pipeline", icon: GitBranch },
  { title: "Chatbot", url: "/agent", icon: Bot },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const collapsed = state === "collapsed";

  // Auth temporarily disabled; keep handler commented for later reuse
  // const handleLogout = () => {
  //   localStorage.removeItem("isAuthenticated");
  //   navigate("/login");
  // };

  const getNavCls = (isActive: boolean) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
      : "hover:bg-sidebar-accent/50 text-sidebar-foreground";

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-6">
        <NavLink
          to="/"
          className="flex items-center gap-3 rounded-md p-2 -mx-2 hover:bg-sidebar-accent/50 transition-colors min-h-0 overflow-visible"
        >
          <TrendingUp className="h-8 w-8 text-primary shrink-0" />
          {!collapsed && (
            <div className="min-w-0 flex flex-col justify-center overflow-visible">
              <h1 className="text-lg font-bold text-sidebar-foreground leading-tight">FIDC Manager</h1>
              <p className="text-xs text-sidebar-foreground/70 leading-normal mt-0.5">Gestão de Fundos</p>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive =
                  item.url === "/" ? location.pathname === "/" :
                  item.url === "/pipeline" ? location.pathname.startsWith("/pipeline") :
                  item.url === "/agent" ? location.pathname.startsWith("/agent") :
                  location.pathname === item.url;
                // Special handling for Chatbot to reset Agent page
                const handleChatbotClick = (e: React.MouseEvent) => {
                  if (item.title === "Chatbot" && location.pathname.startsWith("/agent")) {
                    e.preventDefault();
                    navigate("/agent", { replace: true, state: { reset: true } });
                  }
                };
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        className={getNavCls(isActive)}
                        onClick={handleChatbotClick}
                      >
                        <item.icon className="h-5 w-5" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">MS</AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-sidebar-foreground truncate">Maria Silva</p>
              <p className="text-xs text-sidebar-foreground/70 truncate">Gestora</p>
            </div>
          )}
        </div>
        {/* Auth temporarily disabled; keep logout UI commented for future use */}
        {/*
        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="mt-2 w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        )}
        */}
      </SidebarFooter>
    </Sidebar>
  );
}
