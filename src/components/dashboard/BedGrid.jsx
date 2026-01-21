import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BedActionModal from "./BedActionModal";
import { AlertCircle, Building2, DoorOpen, ChevronDown } from "lucide-react";

const statusStyles = {
  available: {
    bg: "bg-emerald-100 hover:bg-emerald-200",
    border: "border-emerald-300",
    text: "text-emerald-900",
    dot: "bg-emerald-500",
    label: "Available",
  },
  occupied: {
    bg: "bg-red-100 hover:bg-red-200",
    border: "border-red-300",
    text: "text-red-900",
    dot: "bg-red-500",
    label: "Occupied",
  },
  cleaning: {
    bg: "bg-yellow-100 hover:bg-yellow-200",
    border: "border-yellow-300",
    text: "text-yellow-900",
    dot: "bg-yellow-500",
    label: "Cleaning",
  },
  reserved: {
    bg: "bg-blue-100 hover:bg-blue-200",
    border: "border-blue-300",
    text: "text-blue-900",
    dot: "bg-blue-500",
    label: "Reserved",
  },
  maintenance: {
    bg: "bg-gray-100 hover:bg-gray-200",
    border: "border-gray-300",
    text: "text-gray-900",
    dot: "bg-gray-500",
    label: "Maintenance",
  },
  out_of_service: {
    bg: "bg-slate-100 hover:bg-slate-200",
    border: "border-slate-300",
    text: "text-slate-900",
    dot: "bg-slate-500",
    label: "Out of Service",
  },
};

export default function BedGrid({ beds, onBedSelect, loading }) {
  const [selectedBed, setSelectedBed] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedFloors, setExpandedFloors] = useState({});
  const [expandedRooms, setExpandedRooms] = useState({});

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    setModalOpen(true);
  };

  const toggleFloor = (floor) => {
    setExpandedFloors(prev => ({
      ...prev,
      [floor]: !prev[floor]
    }));
  };

  const toggleRoom = (floor, room) => {
    const key = `${floor}-${room}`;
    setExpandedRooms(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedBed(null);
    if (onBedSelect) {
      onBedSelect();
    }
  };

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="h-24 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!beds || beds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-12">
        <AlertCircle className="h-8 w-8 text-gray-400" />
        <p className="text-center text-sm text-gray-600">No beds found in this ward</p>
      </div>
    );
  }

  // Group beds by floor, then by room
  const bedsByFloor = beds.reduce((floorAcc, bed) => {
    const floor = bed.floor || 0;
    if (!floorAcc[floor]) floorAcc[floor] = {};
    
    const room = bed.roomNumber || "No Room";
    if (!floorAcc[floor][room]) floorAcc[floor][room] = [];
    floorAcc[floor][room].push(bed);
    
    return floorAcc;
  }, {});

  // Sort floors numerically
  const sortedFloors = Object.keys(bedsByFloor)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <>
      <div className="space-y-2">
        {sortedFloors.map((floor) => (
          <div key={floor} className="border rounded-lg overflow-hidden">
            {/* Floor Header - Collapsible */}
            <button
              onClick={() => toggleFloor(floor)}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                <span className="text-lg font-bold">Floor {floor}</span>
                <Badge variant="secondary" className="ml-2 bg-blue-500 text-white border-0">
                  {Object.keys(bedsByFloor[floor]).length} room{Object.keys(bedsByFloor[floor]).length !== 1 ? 's' : ''}
                </Badge>
              </div>
              <ChevronDown 
                className={`h-5 w-5 transition-transform ${expandedFloors[floor] ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Floor Content */}
            {expandedFloors[floor] && (
              <div className="bg-white space-y-2 p-4">
                {Object.entries(bedsByFloor[floor])
                  .sort(([roomA], [roomB]) => {
                    const numA = parseInt(roomA);
                    const numB = parseInt(roomB);
                    if (!isNaN(numA) && !isNaN(numB)) {
                      return numA - numB;
                    }
                    return roomA.localeCompare(roomB);
                  })
                  .map(([room, roomBeds]) => {
                    const roomKey = `${floor}-${room}`;
                    const isRoomExpanded = expandedRooms[roomKey];
                    return (
                      <div key={roomKey} className="border rounded-lg overflow-hidden bg-gray-50">
                        {/* Room Header - Collapsible */}
                        <button
                          onClick={() => toggleRoom(floor, room)}
                          className="w-full bg-gray-100 hover:bg-gray-200 p-3 flex items-center justify-between transition-colors border-b"
                        >
                          <div className="flex items-center gap-2">
                            <DoorOpen className="h-4 w-4 text-gray-700" />
                            <span className="font-semibold text-gray-700">Room {room}</span>
                            <Badge variant="outline" className="ml-2">
                              {roomBeds.length} bed{roomBeds.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <ChevronDown 
                            className={`h-4 w-4 transition-transform text-gray-700 ${isRoomExpanded ? 'rotate-180' : ''}`}
                          />
                        </button>

                        {/* Room Content - Beds Grid */}
                        {isRoomExpanded && (
                          <div className="p-4">
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                              {roomBeds.map((bed) => {
                                const style = statusStyles[bed.status] || statusStyles.maintenance;
                                return (
                                  <button
                                    key={bed._id}
                                    onClick={() => handleBedClick(bed)}
                                    className={`group relative rounded-lg border-2 p-3 text-left transition-all duration-300 cursor-pointer ${style.bg} ${style.border}`}
                                  >
                                    {/* Animated pulse for occupied beds */}
                                    {bed.status === "occupied" && (
                                      <div className="absolute inset-0 rounded-lg bg-red-400 opacity-0 animate-pulse" />
                                    )}

                                    {/* Animated rotation for cleaning */}
                                    {bed.status === "cleaning" && (
                                      <div className="absolute inset-0 rounded-lg border-2 border-transparent border-t-yellow-500 border-r-yellow-500 opacity-20 animate-spin" />
                                    )}

                                    {/* Content */}
                                    <div className="relative z-10 space-y-2">
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                          <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                                          <span className={`font-semibold ${style.text}`}>
                                            Bed {bed.bedNumber}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-xs text-gray-600">
                                        <Badge variant="secondary" className="mb-1 text-xs">
                                          {bed.bedType.replace(/_/g, " ")}
                                        </Badge>
                                      </div>

                                      {/* Patient info if occupied */}
                                      {bed.status === "occupied" && bed.currentPatient && (
                                        <div className="text-xs font-medium text-gray-700">
                                          <p className="truncate">
                                            {bed.currentPatient.firstName} {bed.currentPatient.lastName}
                                          </p>
                                        </div>
                                      )}

                                      <div className={`text-xs font-medium ${style.text}`}>
                                        {style.label}
                                      </div>
                                    </div>

                                    {/* Hover indicator */}
                                    <div className="absolute inset-0 rounded-lg border-2 border-transparent group-hover:border-current opacity-0 group-hover:opacity-30 transition-all" />
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ))}
      </div>

      <BedActionModal
        bed={selectedBed}
        isOpen={modalOpen}
        onClose={handleModalClose}
      />
    </>
  );
}
