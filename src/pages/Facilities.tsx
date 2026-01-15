import { mockFacilities } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Building2,
  Plus,
  Syringe,
  TestTube,
  Stethoscope,
  Pill,
  Radio,
  Ambulance,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const facilityIcons = {
  ICU: Syringe,
  Lab: TestTube,
  OT: Stethoscope,
  Pharmacy: Pill,
  Radiology: Radio,
  Ambulance: Ambulance,
  Emergency: AlertTriangle,
};

export default function Facilities() {
  const availableCount = mockFacilities.filter((f) => f.available).length;
  const unavailableCount = mockFacilities.filter((f) => !f.available).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Facilities & Services
          </h1>
          <p className="text-muted-foreground">
            Manage hospital facilities and their availability
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Facility
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Facilities
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockFacilities.length}</div>
          </CardContent>
        </Card>
        <Card className="border-status-available/30 bg-status-available/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-status-available" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-available">
              {availableCount}
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-occupied/30 bg-status-occupied/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Use / Maintenance</CardTitle>
            <AlertTriangle className="h-4 w-4 text-status-occupied" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-occupied">
              {unavailableCount}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Facilities Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {mockFacilities.map((facility) => {
          const Icon = facilityIcons[facility.type] || Building2;

          return (
            <Card
              key={facility.id}
              className={`relative overflow-hidden transition-all hover:shadow-lg ${
                facility.available
                  ? "border-status-available/20"
                  : "border-status-occupied/20"
              }`}
            >
              <div
                className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${
                  facility.available
                    ? "bg-status-available/10"
                    : "bg-status-occupied/10"
                }`}
              />
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                      facility.available
                        ? "bg-status-available/10"
                        : "bg-status-occupied/10"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        facility.available
                          ? "text-status-available"
                          : "text-status-occupied"
                      }`}
                    />
                  </div>
                  <Badge
                    variant={facility.available ? "available" : "occupied"}
                  >
                    {facility.available ? "Available" : "In Use"}
                  </Badge>
                </div>

                <div className="mt-4">
                  <h3 className="font-semibold text-foreground">
                    {facility.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {facility.description}
                  </p>
                </div>

                <div className="mt-4">
                  <Badge variant="outline">{facility.type}</Badge>
                </div>

                <Button variant="outline" size="sm" className="mt-4 w-full">
                  {facility.available ? "Book Now" : "View Details"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
