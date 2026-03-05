import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { bedOccupancyByType } from "@/lib/mock-data";

export function BedOccupancyChart() {
  return (
    <div className="rounded-xl bg-card p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Bed Occupancy by Type
          </h3>
          <p className="text-sm text-muted-foreground">
            Current status across all bed types
          </p>
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={bedOccupancyByType}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey="type"
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                boxShadow: "var(--shadow-md)",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Legend />
            <Bar
              dataKey="occupied"
              stackId="a"
              fill="hsl(var(--status-occupied))"
              name="Occupied"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="available"
              stackId="a"
              fill="hsl(var(--status-available))"
              name="Available"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="other"
              stackId="a"
              fill="hsl(var(--status-cleaning))"
              name="Cleaning/Reserved"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
