import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';

export function StatsCard({ title, value, icon: Icon, trend, variant = 'default' }) {
  const variantStyles = {
    default: 'bg-card border-border',
    primary: 'bg-primary/10 border-primary/20',
    accent: 'bg-accent/10 border-accent/20',
    warning: 'bg-status-warning/10 border-status-warning/20',
    critical: 'bg-status-critical/10 border-status-critical/20',
  };

  const iconStyles = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/20 text-primary',
    accent: 'bg-accent/20 text-accent',
    warning: 'bg-status-warning/20 text-status-warning',
    critical: 'bg-status-critical/20 text-status-critical',
  };

  const IconToRender = Icon || Users;

  return (
    <Card className={`${variantStyles[variant]} border transition-all hover:shadow-md`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
            {trend && (
              <p className={`text-sm mt-1 ${trend.isPositive ? 'text-status-stable' : 'text-status-critical'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}% from yesterday
              </p>
            )}
          </div>
          <div className={`p-4 rounded-2xl ${iconStyles[variant]}`}>
            <IconToRender className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default StatsCard;