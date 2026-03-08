import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, User, LogOut, Sun, Moon, ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { usePortal } from "@/lib/PortalContext";
import { getNotifications, markAsRead } from "@/lib/notifications";
import { portalDefinitions } from "@/lib/portal-config";

export function PortalHeader() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const portal = usePortal();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getNotifications({ limit: 5, isRead: false });
        setNotifications(res.data?.notifications || []);
        setUnreadCount(res.data?.unreadCount || 0);
      } catch {}
    };
    if (user) { fetch(); const i = setInterval(fetch, 30000); return () => clearInterval(i); }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate(portal?.loginPath || "/login");
  };

  const userInitials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-3 sm:px-4 lg:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full bg-status-available/10 px-3 py-1.5 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-available" />
          </span>
          <span className="text-xs font-medium text-status-available">Live</span>
        </div>

        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle theme">
          {resolvedTheme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] justify-center flex items-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">No new notifications</div>
            ) : (
              notifications.slice(0, 5).map((n) => (
                <DropdownMenuItem key={n._id} className="flex flex-col items-start gap-1 py-2">
                  <span className="font-medium">{n.title}</span>
                  <span className="text-xs text-muted-foreground line-clamp-1">{n.message}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-1 sm:px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">{userInitials}</AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">{user?.fullName || "User"}</span>
                <span className="text-xs text-muted-foreground">{user?.email}</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate(portal.basePath + "/settings")}>
              <User className="mr-2 h-4 w-4" /> Profile & Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
