import { useState, useEffect } from "react";
import { getBeds } from "@/lib/beds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Filter, Bed, RefreshCw, Pencil } from "lucide-react";
import BedDialog from "@/components/dashboard/BedDialog";

const bedTypes = [
  "ICU",
  "CCU",
  "General",
  "Semi-Private",
  "Private",
  "Emergency",
  "Ventilator",
];

const statusVariants = {
  available: "available",
  occupied: "occupied",
  cleaning: "cleaning",
  reserved: "reserved",
};

export default function Beds() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState<any>(null);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");
  const [assignMode, setAssignMode] = useState(false);

  const openCreateDialog = () => {
    setSelectedBed(null);
    setDialogMode("create");
    setAssignMode(false);
    setDialogOpen(true);
  };

  const openEditDialog = (bed: any) => {
    setSelectedBed(bed);
    setDialogMode("edit");
    setAssignMode(false);
    setDialogOpen(true);
  };

  const openAssignDialog = (bed: any) => {
    setSelectedBed(bed);
    setDialogMode("edit");
    setAssignMode(true);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setSelectedBed(null);
    fetchData();
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const bedsData = await getBeds();
      setBeds(bedsData.data.beds || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBeds = beds
    ? beds.filter((bed) => {
        const matchesSearch =
          bed.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bed.ward.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === "all" || bed.bedType === typeFilter;
        const matchesStatus = statusFilter === "all" || bed.status === statusFilter;
        return matchesSearch && matchesType && matchesStatus;
      })
    : [];

  const stats = {
    total: beds?.length || 0,
    available: beds ? beds.filter((b) => b.status === "available").length : 0,
    occupied: beds ? beds.filter((b) => b.status === "occupied").length : 0,
    cleaning: beds ? beds.filter((b) => b.status === "cleaning").length : 0,
    reserved: beds ? beds.filter((b) => b.status === "reserved").length : 0,
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bed Management
          </h1>
          <p className="text-muted-foreground">
            Real-time bed availability and status management
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Bed
        </Button>
      </div>

      <BedDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        bed={selectedBed}
        mode={dialogMode}
        assignMode={assignMode}
      />

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Beds</CardTitle>
            <Bed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-status-available/30 bg-status-available/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-3 w-3 rounded-full bg-status-available" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-available">
              {stats.available}
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-occupied/30 bg-status-occupied/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <div className="h-3 w-3 rounded-full bg-status-occupied" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-occupied">
              {stats.occupied}
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-cleaning/30 bg-status-cleaning/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleaning</CardTitle>
            <div className="h-3 w-3 rounded-full bg-status-cleaning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-cleaning">
              {stats.cleaning}
            </div>
          </CardContent>
        </Card>
        <Card className="border-status-reserved/30 bg-status-reserved/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <div className="h-3 w-3 rounded-full bg-status-reserved" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-status-reserved">
              {stats.reserved}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search beds by number or ward..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Bed Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {bedTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="cleaning">Cleaning</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={fetchData}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Beds Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bed Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Ward</TableHead>
                <TableHead>Floor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBeds.length > 0 ? (
                filteredBeds.map((bed) => (
                  <TableRow key={bed._id}>
                    <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{bed.bedType}</Badge>
                    </TableCell>
                    <TableCell>{bed.ward}</TableCell>
                    <TableCell>Floor {bed.floor}</TableCell>
                    <TableCell>
                      {statusVariants[bed.status] && (
                        <Badge variant={statusVariants[bed.status]}>
                          {bed.status.charAt(0).toUpperCase() + bed.status.slice(1)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(bed)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (bed.status === "available") {
                              openAssignDialog(bed);
                            }
                          }}
                        >
                          {bed.status === "available" ? "Assign" : "View"}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No beds found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}