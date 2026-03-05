import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, User, LogOut, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { getNotifications, markAsRead } from "@/lib/notifications";
import { useVisualAuth } from "@/hooks/useVisualAuth";

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { canView } = useVisualAuth();
  const { theme, toggleTheme, resolvedTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const canViewNotifications = canView("notifications");
  const canViewSettings = canView("settings");

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await getNotifications({ limit: 5, isRead: false });
        setNotifications(response.data?.notifications || []);
        setUnreadCount(response.data?.unreadCount || 0);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };

    if (user && canViewNotifications) {
      fetchNotifications();
      // Poll every 30 seconds for new notifications
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }

    setNotifications([]);
    setUnreadCount(0);
  }, [user, canViewNotifications]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notification._id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  const userInitials = user?.fullName
    ? user.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "SA";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-3 sm:px-4 lg:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search patients, doctors, beds..."
            className="w-80 pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3">
        {/* Live indicator */}
        <div className="hidden items-center gap-2 rounded-full bg-status-available/10 px-3 py-1.5 sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-status-available opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-status-available"></span>
          </span>
          <span className="text-xs font-medium text-status-available">Live</span>
        </div>

        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="text-muted-foreground hover:text-foreground"
          title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Notifications */}
        {canViewNotifications && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] justify-center flex items-center"
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[calc(100vw-1rem)] max-w-80">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => navigate("/notifications")}
                >
                  View All
                </Button>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                notifications.slice(0, 5).map((notification) => (
                  <DropdownMenuItem
                    key={notification._id}
                    className="flex flex-col items-start gap-1 py-3 cursor-pointer"
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="font-medium flex-1">{notification.title}</span>
                      {!notification.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground line-clamp-2">
                      {notification.message}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(notification.createdAt)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="justify-center text-primary"
                onClick={() => navigate("/notifications")}
              >
                See all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-1 sm:px-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatar || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium">{user?.fullName || "User"}</span>
                <span className="text-xs text-muted-foreground">
                  {user?.email || "user@example.com"}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {canViewSettings && (
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
            )}
            {canViewSettings && (
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                <Bell className="mr-2 h-4 w-4" />
                Preferences
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
