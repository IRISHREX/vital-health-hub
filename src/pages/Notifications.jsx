import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  getNotifications,
  getNotificationStats,
  markAsRead,
  acknowledgeNotification,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
} from "@/lib/notifications";
import { respondToAccessRequest } from "@/lib/settings";
import { useAuth } from "@/lib/AuthContext";
import {
  Bell,
  Bed,
  Calendar,
  Receipt,
  Users,
  AlertTriangle,
  Clock,
  Settings,
  Trash2,
  CheckCircle2,
  RefreshCw,
  LogOut,
  CreditCard,
  Info,
  AlertCircle,
  Shield,
  FileText,
  ArrowRightLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { respondToHandoverRequest } from "@/lib/nurse";

// Icon mapping based on notification type
const typeIcons = {
  bed_available: Bed,
  bed_assigned: Bed,
  bed_released: Bed,
  patient_admitted: Users,
  patient_discharged: LogOut,
  appointment_scheduled: Calendar,
  appointment_reminder: Calendar,
  appointment_cancelled: Calendar,
  invoice_generated: Receipt,
  payment_received: CreditCard,
  payment_overdue: AlertTriangle,
  schedule_update: Clock,
  leave_approved: CheckCircle2,
  system: Info,
  alert: AlertCircle,
  info: Info,
  access_request: Shield,
  access_request_resolved: CheckCircle2,
  prescription_shared: FileText,
  handover_request: ArrowRightLeft,
  handover_response: ArrowRightLeft,
};

const priorityColors = {
  urgent: "text-status-occupied bg-status-occupied/10",
  high: "text-status-cleaning bg-status-cleaning/10",
  medium: "text-primary bg-primary/10",
  low: "text-muted-foreground bg-muted",
};

const priorityBadgeVariants = {
  urgent: "destructive",
  high: "secondary",
  medium: "default",
  low: "outline",
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({
    unreadCount: 0,
    todayCount: 0,
    criticalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  // Notification preferences (stored in backend via settings)
  const [preferences, setPreferences] = useState({
    bedAvailability: true,
    billingAlerts: true,
    dischargeReminders: true,
    doctorSchedule: true,
    emergencyAlerts: true,
    emailNotifications: false,
  });

  const fetchData = async () => {
    try {
      const [notifResponse, statsResponse] = await Promise.all([
        getNotifications({ limit: 50 }),
        getNotificationStats(),
      ]);

      setNotifications(notifResponse.data.notifications || []);
      setStats(statsResponse.data || {});
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setStats((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
      }));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setStats((prev) => ({ ...prev, unreadCount: 0 }));
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all as read",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id);
      const notification = notifications.find((n) => n._id === id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (!notification?.isRead) {
        setStats((prev) => ({
          ...prev,
          unreadCount: Math.max(0, prev.unreadCount - 1),
        }));
      }
      toast({
        title: "Deleted",
        description: "Notification removed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete notification",
        variant: "destructive",
      });
    }
  };

  const handleAccessDecision = async (notification, decision) => {
    try {
      const requestId = notification?.data?.entityId;
      if (!requestId) {
        toast({
          title: "Error",
          description: "Request ID not found",
          variant: "destructive",
        });
        return;
      }

      await respondToAccessRequest(requestId, { decision });
      await handleMarkAsRead(notification._id);
      toast({
        title: "Success",
        description: `Request ${decision}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${decision} request`,
        variant: "destructive",
      });
    }
  };

  const handleClearRead = async () => {
    try {
      await clearReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.isRead));
      toast({
        title: "Cleared",
        description: "Read notifications cleared",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear read notifications",
        variant: "destructive",
      });
    }
  };

  const handleAcknowledge = async (notification) => {
    try {
      await acknowledgeNotification(notification._id);
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notification._id
            ? { ...n, isRead: true, acknowledgedAt: new Date().toISOString(), acknowledgedBy: user?._id }
            : n
        )
      );
      setStats((prev) => ({ ...prev, unreadCount: Math.max(0, (prev.unreadCount || 0) - 1) }));
      toast({ title: "Acknowledged", description: "You can now forward this prescription if needed." });
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to acknowledge notification",
        variant: "destructive",
      });
    }
  };

  const handleHandoverDecision = async (notification, decision) => {
    try {
      await respondToHandoverRequest(notification._id, decision);
      await fetchData();
      toast({
        title: "Success",
        description: decision === "accepted" ? "Handover accepted" : "Handover rejected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error?.message || "Failed to process handover request",
        variant: "destructive",
      });
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
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-2 h-4 w-64" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Stay updated with hospital alerts and reminders
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            Mark All as Read
          </Button>
          <Button variant="outline" onClick={handleClearRead}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Read
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Recent Notifications
              {stats.unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {stats.unreadCount} new
                </Badge>
              )}
            </h2>
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell;
                return (
                  <Card
                    key={notification._id}
                    className={`transition-all hover:shadow-md cursor-pointer ${
                      !notification.isRead ? "border-l-4 border-l-primary" : ""
                    }`}
                    onClick={() => {
                      const isActionableAccessRequest =
                        user?.role === "super_admin" && notification.type === "access_request";
                      const isActionablePrescriptionShare =
                        notification.type === "prescription_shared" &&
                        notification.requiresAcknowledgement &&
                        !notification.acknowledgedBy;
                      const isActionableHandoverRequest =
                        notification.type === "handover_request" &&
                        (notification?.data?.status || "pending") === "pending";
                      if (!isActionableAccessRequest && !isActionablePrescriptionShare && !isActionableHandoverRequest && !notification.isRead) {
                        handleMarkAsRead(notification._id);
                      }
                    }}
                  >
                    <CardContent className="flex items-start gap-4 p-4">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                          priorityColors[notification.priority] || priorityColors.medium
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium text-foreground">
                                {notification.title}
                              </h3>
                              <Badge
                                variant={
                                  priorityBadgeVariants[notification.priority] ||
                                  "default"
                                }
                                className="text-xs"
                              >
                                {notification.priority}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {!notification.isRead && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:bg-destructive/80"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification._id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                        </div>
                        {user?.role === "super_admin" && notification.type === "access_request" && (
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAccessDecision(notification, "approved");
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAccessDecision(notification, "rejected");
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {notification.type === "prescription_shared" && (
                          <div className="mt-3 flex items-center gap-2">
                            {notification.requiresAcknowledgement && !notification.acknowledgedBy ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAcknowledge(notification);
                                }}
                              >
                                Acknowledge
                              </Button>
                            ) : (
                              <Badge variant="secondary">Acknowledged</Badge>
                            )}
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = notification?.data?.link;
                                if (link) navigate(link);
                              }}
                            >
                              Open Preview
                            </Button>
                          </div>
                        )}
                        {notification.type === "handover_request" && (notification?.data?.status || "pending") === "pending" && (
                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHandoverDecision(notification, "accepted");
                              }}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleHandoverDecision(notification, "rejected");
                              }}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {notification.type === "handover_request" && (notification?.data?.status || "pending") !== "pending" && (
                          <div className="mt-3">
                            <Badge variant="secondary" className="capitalize">
                              {notification?.data?.status || "processed"}
                            </Badge>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

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
                <Switch
                  checked={preferences.bedAvailability}
                  onCheckedChange={(v) =>
                    setPreferences({ ...preferences, bedAvailability: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Billing Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Pending payment reminders
                  </p>
                </div>
                <Switch
                  checked={preferences.billingAlerts}
                  onCheckedChange={(v) =>
                    setPreferences({ ...preferences, billingAlerts: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Discharge Reminders</Label>
                  <p className="text-xs text-muted-foreground">
                    Patient discharge notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.dischargeReminders}
                  onCheckedChange={(v) =>
                    setPreferences({ ...preferences, dischargeReminders: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Doctor Schedule</Label>
                  <p className="text-xs text-muted-foreground">
                    Schedule change alerts
                  </p>
                </div>
                <Switch
                  checked={preferences.doctorSchedule}
                  onCheckedChange={(v) =>
                    setPreferences({ ...preferences, doctorSchedule: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Emergency Alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Critical system notifications
                  </p>
                </div>
                <Switch
                  checked={preferences.emergencyAlerts}
                  onCheckedChange={(v) =>
                    setPreferences({ ...preferences, emergencyAlerts: v })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">
                    Receive alerts via email
                  </p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={(v) =>
                    setPreferences({ ...preferences, emailNotifications: v })
                  }
                />
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
                <span className="font-medium">{stats.todayCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Critical alerts
                </span>
                <Badge variant="destructive">{stats.criticalCount || 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Unread</span>
                <Badge>{stats.unreadCount || 0}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
