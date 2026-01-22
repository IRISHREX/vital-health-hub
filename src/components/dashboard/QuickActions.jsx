import { UserPlus, Bed, Calendar, Receipt, FileText, Ambulance } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const actions = [
  {
    label: "New Patient",
    icon: UserPlus,
    href: "/patients",
    variant: "default",
  },
  {
    label: "Assign Bed",
    icon: Bed,
    href: "/beds",
    variant: "outline",
  },
  {
    label: "Book Appointment",
    icon: Calendar,
    href: "/appointments",
    variant: "outline",
  },
  {
    label: "Create Invoice",
    icon: Receipt,
    href: "/billing",
    variant: "outline",
  },
  {
    label: "Generate Report",
    icon: FileText,
    href: "/reports",
    variant: "outline",
  },
  {
    label: "Emergency",
    icon: Ambulance,
    href: "/beds",
    variant: "destructive",
  },
];

export function QuickActions() {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <p className="text-sm text-muted-foreground">Common tasks at a glance</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant={action.variant}
            className="h-auto flex-col gap-2 py-4 "
            asChild
          >
            <Link to={action.href}>
              <action.icon className="h-5 w-5" />
              <span className="text-xs text-wrap text-center">{action.label}</span>
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
