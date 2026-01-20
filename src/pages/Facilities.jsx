import { useQuery } from "@tanstack/react-query";
import { getFacilities } from "@/lib/facilities";
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
  Loader2,
} from "lucide-react";
import { useState } from "react";
import AddFacilityDialog from "@/components/dashboard/AddFacilityDialog";

const facilityIcons = {
  icu: Syringe,
  lab: TestTube,
  ot: Stethoscope,
  pharmacy: Pill,
  radiology: Radio,
  ambulance: Ambulance,
  emergency: AlertTriangle,
};

export default function Facilities() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: facilities, isLoading, isError } = useQuery({
    queryKey: ['facilities'],
    queryFn: getFacilities
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
        <div className="text-red-500 text-center py-8">
            Error loading facilities. Please try again later.
        </div>
    );
  }

  if (!Array.isArray(facilities)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableCount = facilities.filter((f) => f.status === 'operational').length;
  const unavailableCount = facilities.length - availableCount;

  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Facilities & Services
            </h1>
            <p className="text-muted-foreground">
              Manage hospital facilities and their availability
            </p>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Facility
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Facilities
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{facilities.length}</div>
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {facilities.map((facility) => {
            const Icon = facilityIcons[facility.type] || Building2;
            const isAvailable = facility.status === 'operational';

            return (
              <Card
                key={facility._id}
                className={`relative overflow-hidden transition-all hover:shadow-lg ${
                  isAvailable
                    ? "border-status-available/20"
                    : "border-status-occupied/20"
                }`}
              >
                <div
                  className={`absolute right-0 top-0 h-20 w-20 rounded-bl-full ${
                    isAvailable
                      ? "bg-status-available/10"
                      : "bg-status-occupied/10"
                  }`}
                />
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        isAvailable
                          ? "bg-status-available/10"
                          : "bg-status-occupied/10"
                      }`}
                    >
                      <Icon
                        className={`h-6 w-6 ${
                          isAvailable
                            ? "text-status-available"
                            : "text-status-occupied"
                        }`}
                      />
                    </div>
                    <Badge
                      variant={isAvailable ? "available" : "occupied"}
                    >
                      {isAvailable ? "Available" : "In Use"}
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
                    {isAvailable ? "Book Now" : "View Details"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <AddFacilityDialog isOpen={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)} />
    </>
  );
}
