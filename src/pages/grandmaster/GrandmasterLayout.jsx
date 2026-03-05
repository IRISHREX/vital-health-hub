import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getGmToken, getGmUser, removeGmToken, removeGmUser } from '@/lib/grandmaster-api';
import { NavLink } from '@/components/NavLink';
import {
  LayoutDashboard, Building2, CreditCard, Activity, Bell,
  Settings, Users, LogOut, Shield, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const navItems = [
  { title: 'Dashboard', url: '/grandmaster', icon: LayoutDashboard, end: true },
  { title: 'Organizations', url: '/grandmaster/organizations', icon: Building2 },
  { title: 'Subscriptions', url: '/grandmaster/subscriptions', icon: CreditCard },
  { title: 'Monitoring', url: '/grandmaster/monitoring', icon: Activity },
  { title: 'Admins', url: '/grandmaster/admins', icon: Users },
  { title: 'Notices', url: '/grandmaster/notices', icon: Bell },
  { title: 'Settings', url: '/grandmaster/settings', icon: Settings },
];

export default function GrandmasterLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const user = getGmUser();

  useEffect(() => {
    if (!getGmToken()) {
      navigate('/grandmaster/login');
    }
  }, [navigate]);

  const handleLogout = () => {
    removeGmToken();
    removeGmUser();
    navigate('/grandmaster/login');
  };

  const isActive = (path, end) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className={`flex flex-col border-r border-border bg-card transition-all duration-200 ${collapsed ? 'w-16' : 'w-64'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-bold text-foreground truncate">Grandmaster</span>
              <span className="text-[11px] text-muted-foreground">Platform Admin</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <ScrollArea className="flex-1 px-2 py-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.end}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors
                  ${isActive(item.url, item.end)
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'}`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </NavLink>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="border-t border-border p-3">
          {!collapsed && user && (
            <div className="mb-2 rounded-lg bg-accent/50 p-2">
              <p className="text-xs text-muted-foreground">Signed in as</p>
              <p className="text-sm font-medium text-foreground truncate">{user.firstName} {user.lastName}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setCollapsed(!collapsed)} className="h-8 w-8">
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0">
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
