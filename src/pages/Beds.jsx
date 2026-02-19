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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Filter, Bed, RefreshCw, Pencil, Eye, Trash2, LayoutGrid, Table as TableIcon } from "lucide-react";
import BedDialog from "@/components/dashboard/BedDialog";
import BedGrid from "@/components/dashboard/BedGrid";
import RoomAssignDialog from "@/components/dashboard/RoomAssignDialog";
import { useAuth } from "@/lib/AuthContext";
import { useVisualAuth } from "@/hooks/useVisualAuth";
import RestrictedAction from "@/components/permissions/RestrictedAction";

const bedTypes = [
  "icu",
  "ccu",
  "general",
  "semi_private",
  "private",
  "emergency",
  "ventilator",
  "pediatric",
  "maternity",
];

const statusVariants = {
  available: "available",
  occupied: "occupied",
  cleaning: "cleaning",
  reserved: "reserved",
};

// Get unique wards from all beds
const getWards = (beds) => {
  const wards = new Set(beds?.map(bed => bed.ward) || []);
  return Array.from(wards).sort();
};

// Get unique floors from all beds
const getFloors = (beds) => {
  const floors = new Set(beds?.map(bed => bed.floor) || []);
  return Array.from(floors).sort((a, b) => a - b);
};

// Get unique rooms from all beds
const getRooms = (beds) => {
  const rooms = new Set(beds?.map(bed => bed.roomNumber).filter(Boolean) || []);
  return Array.from(rooms).sort();
};

export default function Beds() {
  const { user } = useAuth();
  const { canCreate } = useVisualAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [roomFilter, setRoomFilter] = useState("all");
  const [beds, setBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBed, setSelectedBed] = useState(null);
  const [dialogMode, setDialogMode] = useState("create");
  const [assignMode, setAssignMode] = useState(false);
  const [selectedWard, setSelectedWard] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid or table
  const [roomAssignOpen, setRoomAssignOpen] = useState(false);

  const openCreateDialog = () => {
    setSelectedBed(null);
    setDialogMode("create");
    setAssignMode(false);
    setDialogOpen(true);
  };

  const openEditDialog = (bed) => {
    setSelectedBed(bed);
    setDialogMode("edit");
    setAssignMode(false);
    setDialogOpen(true);
  };

  const openAssignDialog = (bed) => {
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
        const matchesWard = selectedWard === "all" || bed.ward === selectedWard;
        const matchesFloor = floorFilter === "all" || bed.floor.toString() === floorFilter;
        const matchesRoom = roomFilter === "all" || bed.roomNumber === roomFilter;
        return matchesSearch && matchesType && matchesStatus && matchesWard && matchesFloor && matchesRoom;
      })
    : [];

  const wards = getWards(beds);
  const floors = getFloors(beds);
  const rooms = getRooms(beds);
  const roomTuples = Array.from(
    new Map(
      (beds || [])
        .filter((b) => b.roomNumber)
        .map((b) => [`${b.ward}|${b.floor}|${b.roomNumber}`, { ward: b.ward, floor: b.floor, roomNumber: b.roomNumber }])
    ).values()
  );
  const wardStats = wards.reduce((acc, ward) => {
    const wardBeds = beds.filter(b => b.ward === ward);
    acc[ward] = {
      total: wardBeds.length,
      available: wardBeds.filter(b => b.status === "available").length,
      occupied: wardBeds.filter(b => b.status === "occupied").length,
      cleaning: wardBeds.filter(b => b.status === "cleaning").length,
      reserved: wardBeds.filter(b => b.status === "reserved").length,
    };
    return acc;
  }, {});

  const stats = {
    total: beds?.length || 0,
    available: beds ? beds.filter((b) => b.status === "available").length : 0,
    occupied: beds ? beds.filter((b) => b.status === "occupied").length : 0,
    cleaning: beds ? beds.filter((b) => b.status === "cleaning").length : 0,
    reserved: beds ? beds.filter((b) => b.status === "reserved").length : 0,
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  const currentWardStats = wardStats[selectedWard] || stats;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Bed Management
          </h1>
          <p className="text-muted-foreground">
            Real-time bed availability and status management
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["super_admin", "hospital_admin", "doctor", "head_nurse", "nurse"].includes(user?.role) && (
            <Button variant="outline" onClick={() => setRoomAssignOpen(true)}>
              Assign Room
            </Button>
          )}
          {canCreate("beds") && (
            <RestrictedAction module="beds" feature="create">
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Add Bed
              </Button>
            </RestrictedAction>
          )}
        </div>
      </div>

      <BedDialog
        isOpen={dialogOpen}
        onClose={handleDialogClose}
        bed={selectedBed}
        mode={dialogMode}
        assignMode={assignMode}
      />
      <RoomAssignDialog
        isOpen={roomAssignOpen}
        onClose={() => {
          setRoomAssignOpen(false);
          fetchData();
        }}
        rooms={roomTuples}
      />

      {/* Overall Stats */}
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
        <Card className="border-emerald-300/30 bg-emerald-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <div className="h-3 w-3 rounded-full bg-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {currentWardStats.available}
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-300/30 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <div className="h-3 w-3 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {currentWardStats.occupied}
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-300/30 bg-yellow-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cleaning</CardTitle>
            <div className="h-3 w-3 rounded-full bg-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {currentWardStats.cleaning}
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-300/30 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reserved</CardTitle>
            <div className="h-3 w-3 rounded-full bg-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {currentWardStats.reserved}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ward Tabs */}
      {wards.length > 0 && (
        <Tabs value={selectedWard} onValueChange={setSelectedWard}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="all">All Wards</TabsTrigger>
            {wards.map((ward) => (
              <TabsTrigger key={ward} value={ward} className="relative">
                {ward}
                <Badge variant="secondary" className="ml-2 text-xs">
                  {wardStats[ward]?.total || 0}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedWard} className="space-y-4">
            {/* Filters and View Toggle */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search beds by number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Bed Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {bedTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
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
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Floor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Floors</SelectItem>
                    {floors.map((floor) => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Floor {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={roomFilter} onValueChange={setRoomFilter}>
                  <SelectTrigger className="w-full sm:w-[120px]">
                    <SelectValue placeholder="Room" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Rooms</SelectItem>
                    {rooms.map((room) => (
                      <SelectItem key={room} value={room}>
                        {room}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border rounded-lg p-1 bg-muted">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  title="Grid View"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("table")}
                  title="Table View"
                >
                  <TableIcon className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="outline" size="icon" onClick={fetchData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Grid View */}
            {viewMode === "grid" && (
              <BedGrid
                beds={filteredBeds}
                onBedSelect={fetchData}
                loading={loading}
              />
            )}

            {/* Table View */}
            {viewMode === "table" && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bed Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Room</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>Nurse</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBeds.length > 0 ? (
                        filteredBeds.map((bed) => (
                          <TableRow key={bed._id}>
                            <TableCell className="font-medium">{bed.bedNumber}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{bed.bedType.replace(/_/g, " ")}</Badge>
                            </TableCell>
                            <TableCell>{bed.roomNumber || "N/A"}</TableCell>
                            <TableCell>
                              <Badge
                                className={`text-xs ${
                                  bed.status === "available"
                                    ? "bg-emerald-100 text-emerald-900"
                                    : bed.status === "occupied"
                                    ? "bg-red-100 text-red-900"
                                    : bed.status === "cleaning"
                                    ? "bg-yellow-100 text-yellow-900"
                                    : bed.status === "reserved"
                                    ? "bg-blue-100 text-blue-900"
                                    : "bg-gray-100 text-gray-900"
                                }`}
                              >
                                {bed.status.replace(/_/g, " ")}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {bed.currentPatient
                                ? `${bed.currentPatient.firstName} ${bed.currentPatient.lastName}`
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {bed.nurseInCharge ? `${bed.nurseInCharge.firstName} ${bed.nurseInCharge.lastName}` : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="View Details"
                                  onClick={() => openAssignDialog(bed)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit"
                                  onClick={() => openEditDialog(bed)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Delete"
                                  className="text-destructive hover:bg-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
