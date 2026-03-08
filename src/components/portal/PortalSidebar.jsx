import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/lib/AuthContext";
import { getRoleLabel } from "@/lib/rbac";
import { usePortal } from "@/lib/PortalContext";

export function PortalSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const { user } = useAuth();
  const portal = usePortal();
  const isCollapsed = state === "collapsed";

  if (!portal) return null;

  const Icon = portal.icon;
  const basePath = portal.basePath;

  const isActive = (itemUrl) => {
    const fullPath = basePath + itemUrl;
    if (itemUrl === "") return location.pathname === basePath || location.pathname === basePath + "/";
    return location.pathname.startsWith(fullPath);
  };

  return (
    <Sidebar className="border-r-0 bg-gradient-sidebar">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br ${portal.color}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-sidebar-foreground">{portal.label}</span>
              <span className="text-xs text-sidebar-foreground/60">{portal.tagline}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {portal.navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={basePath + item.url}
                      end={item.url === ""}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground transition-all hover:bg-sidebar-accent"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!isCollapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!isCollapsed && (
          <div className="rounded-lg bg-sidebar-accent/50 p-3">
            <p className="text-xs text-sidebar-foreground/70">Logged in as</p>
            <p className="font-medium text-sidebar-foreground">{getRoleLabel(user?.role)}</p>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
