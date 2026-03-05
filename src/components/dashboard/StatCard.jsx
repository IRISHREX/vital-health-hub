import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, trendValue, loading = false, className = '' }) {
  const getTrendIcon = () => {
    if (!trend) return <Minus className="h-4 w-4 text-gray-600" />;
    return trend === 'up' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = () => {
    if (!trend) return 'text-gray-600';
    return trend === 'up' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <Card className={`border-0 shadow-md bg-white hover:shadow-lg transition-all ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">{title}</CardTitle>
          {Icon && (
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon className="h-4 w-4 text-blue-600" />
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <div className="text-3xl font-bold text-gray-900">{value}</div>
              {trend && trendValue && (
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                  <span className={`text-sm font-semibold ${getTrendColor()}`}>{trendValue}</span>
                </div>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function AdmissionMetrics({ stats, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <StatCard key={i} title="Loading..." value={0} loading={true} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard
        title="Total Admissions"
        value={stats?.totalAdmissions || 0}
        subtitle="All time admissions"
        trend={stats?.admissionTrend}
        trendValue={stats?.admissionTrendValue}
        icon={require('lucide-react').Users}
      />

      <StatCard
        title="Currently Admitted"
        value={stats?.activeAdmissions || 0}
        subtitle="Inpatients"
        trend={stats?.activeTrend}
        trendValue={stats?.activeTrendValue}
        icon={require('lucide-react').Activity}
      />

      <StatCard
        title="Discharged This Month"
        value={stats?.dischargedAdmissions || 0}
        subtitle="This month"
        icon={require('lucide-react').CheckCircle}
      />

      <StatCard
        title="Avg. Length of Stay"
        value={`${stats?.avgLengthOfStay || 0} days`}
        subtitle="Average duration"
        icon={require('lucide-react').Calendar}
      />

      <StatCard
        title="Total Revenue"
        value={`₹${(stats?.totalRevenue || 0).toLocaleString('en-IN')}`}
        subtitle="Billing"
        icon={require('lucide-react').DollarSign}
      />
    </div>
  );
}
