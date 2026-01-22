import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import BedActionModal from "./BedActionModal";
import { AlertCircle } from "lucide-react";

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

  const handleBedClick = (bed) => {
    setSelectedBed(bed);
    setModalOpen(true);
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

  // Group beds by room number
  const bedsByRoom = beds.reduce((acc, bed) => {
    const room = bed.roomNumber || "No Room";
    if (!acc[room]) acc[room] = [];
    acc[room].push(bed);
    return acc;
  }, {});

  return (
    <>
      <div className="space-y-6">
        {Object.entries(bedsByRoom).map(([room, roomBeds]) => (
          <div key={room}>
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Room {room}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
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
                      <div className="absolute inset-0 rounded-lg border-2 border-transparent border-t-yellow-500 border-r-yellow-500 opacity-20 " />
                    )}

                    {/* Content */}
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${style.dot}`} />
                          <span className={`font-semibold ${style.text}`}>
                            {bed.bedNumber}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-gray-600">
                        <Badge variant="secondary" className="mb-1 text-xs">
                          {bed.bedType}
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
