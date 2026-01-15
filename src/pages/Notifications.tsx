import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Bell,
  Bed,
  Calendar,
  Receipt,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Settings,
} from "lucide-react";

const notifications = [
  {
    id: 1,
    type: "bed",
    title: "ICU Bed Available",
    message: "ICU-002 is now available for admission",
    time: "2 minutes ago",
    read: false,
    icon: Bed,
    priority: "high",
  },
  {
    id: 2,
    type: "billing",
    title: "Pending Bill Alert",
    message: "3 invoices pending for more than 7 days",
    time: "1 hour ago",
    read: false,
    icon: Receipt,
    priority: "medium",
  },
  {
    id: 3,
    type: "discharge",
    title: "Discharge Reminder",
    message: "Patient Rajesh Kumar scheduled for discharge today",
    time: "3 hours ago",
    read: true,
    icon: Users,
    priority: "normal",
  },
  {
    id: 4,
    type: "appointment",
    title: "Appointment Reminder",
    message: "Dr. Anil Kapoor has 3 appointments in the next hour",
    time: "30 minutes ago",
    read: false,
    icon: Calendar,
    priority: "normal",
  },
  {
    id: 5,
    type: "emergency",
    title: "Emergency Bed Shortage",
    message: "Only 1 emergency bed remaining - consider discharges",
    time: "45 minutes ago",
    read: false,
    icon: AlertTriangle,
    priority: "critical",
  },
];

const priorityColors = {
  critical: "text-status-occupied bg-status-occupied/10",
  high: "text-status-cleaning bg-status-cleaning/10",
  medium: "text-primary bg-primary/10",
  normal: "text-muted-foreground bg-muted",
};

export default function Notifications() {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Stay updated with hospital alerts and reminders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Mark All as Read</Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Notifications List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Recent Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </h2>
          </div>

          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <Card
                  key={notification.id}
                  className={`transition-all hover:shadow-md ${
                    !notification.read ? "border-l-4 border-l-primary" : ""
                  }`}
                >
                  <CardContent className="flex items-start gap-4 p-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                        priorityColors[notification.priority as keyof typeof priorityColors]
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-foreground">
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {notification.time}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Bed Availability</Label>
                  <p className="text-xs text-muted-foreground">
                    Alerts when beds become available
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Billing Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Pending payment reminders
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Discharge Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Patient discharge notifications
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Doctor Schedule</Label>
                  <p className="text-xs text-muted-foreground">
                    Schedule change alerts
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emergency Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Critical system notifications
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts via email
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Total notifications today
                </span>
                <span className="font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Critical alerts
                </span>
                <Badge variant="destructive">1</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Unread
                </span>
                <Badge>{unreadCount}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
