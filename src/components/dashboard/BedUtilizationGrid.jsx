import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bed, AlertCircle, Loader2, Users } from 'lucide-react';
import { getBeds } from '@/lib/beds';

const bedStatusColors = {
  available: 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200',
  occupied: 'bg-red-100 text-red-800 border-red-300 cursor-not-allowed',
  maintenance: 'bg-gray-100 text-gray-800 border-gray-300 cursor-not-allowed',
};

export default function BedUtilizationGrid({ selectedWard = null, onBedSelect = null, selectableOnly = false }) {
  const [beds, setBeds] = useState([]);
  const [filteredBeds, setFilteredBeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [wardFilter, setWardFilter] = useState(selectedWard || 'all');

  useEffect(() => {
    loadBeds();
  }, []);

  useEffect(() => {
    filterBeds();
  }, [beds, selectedFilter, wardFilter]);

  const loadBeds = async () => {
    try {
      setLoading(true);
      const data = await getBeds();
      setBeds(data || []);
    } catch (error) {
      console.error('Failed to load beds:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterBeds = () => {
    let filtered = beds;

    if (wardFilter !== 'all') {
      filtered = filtered.filter((b) => b.ward === wardFilter);
    }

    if (selectedFilter === 'available') {
      filtered = filtered.filter((b) => b.status === 'available');
    } else if (selectedFilter === 'occupied') {
      filtered = filtered.filter((b) => b.status === 'occupied');
    } else if (selectedFilter === 'maintenance') {
      filtered = filtered.filter((b) => b.status === 'maintenance');
    }

    setFilteredBeds(filtered);
  };

  const getWards = () => {
    const wards = new Set(beds.map((b) => b.ward));
    return Array.from(wards).sort();
  };

  const getOccupancyStats = () => {
    const total = beds.length;
    const occupied = beds.filter((b) => b.status === 'occupied').length;
    const available = beds.filter((b) => b.status === 'available').length;
    const maintenance = beds.filter((b) => b.status === 'maintenance').length;

    return {
      total,
      occupied,
      available,
      maintenance,
      occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  };

  const stats = getOccupancyStats();

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">Total Beds</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-green-600 uppercase">Available</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{stats.available}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-red-600 uppercase">Occupied</p>
            <p className="text-2xl font-bold text-red-900 mt-1">{stats.occupied}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-yellow-600 uppercase">Maintenance</p>
            <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.maintenance}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-4">
            <p className="text-xs font-semibold text-purple-600 uppercase">Occupancy</p>
            <p className="text-2xl font-bold text-purple-900 mt-1">{stats.occupancyRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-48">
              <label className="text-sm font-semibold mb-2 block">Status</label>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Beds</SelectItem>
                  <SelectItem value="available">Available Only</SelectItem>
                  <SelectItem value="occupied">Occupied Only</SelectItem>
                  <SelectItem value="maintenance">Maintenance Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-48">
              <label className="text-sm font-semibold mb-2 block">Ward</label>
              <Select value={wardFilter} onValueChange={setWardFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Wards</SelectItem>
                  {getWards().map((ward) => (
                    <SelectItem key={ward} value={ward}>
                      {ward}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bed Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Bed Layout ({filteredBeds.length} of {beds.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBeds.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No Beds Found</AlertTitle>
              <AlertDescription>
                {selectedFilter === 'available'
                  ? 'No available beds match the current filters.'
                  : 'No beds match the current filters.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {filteredBeds.map((bed) => {
                const isAvailable = bed.status === 'available';
                const isSelectable = selectableOnly ? isAvailable : true;

                return (
                  <div
                    key={bed._id}
                    onClick={() => isSelectable && onBedSelect?.(bed)}
                    className={`${
                      isSelectable ? 'cursor-pointer' : 'cursor-not-allowed'
                    } transition-all`}
                  >
                    <div
                      className={`
                        border-2 rounded-lg p-3 text-center space-y-2
                        transition-all hover:shadow-md
                        ${bedStatusColors[bed.status] || bedStatusColors.available}
                      `}
                    >
                      <Bed className="h-5 w-5 mx-auto" />
                      <p className="font-semibold text-sm">{bed.bedNumber}</p>
                      <Badge
                        variant="outline"
                        className="text-xs w-full justify-center"
                      >
                        {bed.bedType}
                      </Badge>

                      {bed.status === 'occupied' && bed.currentPatient && (
                        <div className="text-xs mt-2 pt-2 border-t">
                          <p className="font-medium line-clamp-1">
                            {bed.currentPatient.firstName} {bed.currentPatient.lastName}
                          </p>
                          <p className="text-gray-600">
                            {new Date(bed.admissionDate).toLocaleDateString()}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-600 font-medium">
                        ₹{bed.pricePerDay}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="pt-4">
          <p className="text-sm font-semibold mb-3">Legend</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 border-2 border-green-300 rounded"></div>
              <span className="text-sm">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="text-sm">Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 border-2 border-gray-300 rounded"></div>
              <span className="text-sm">Maintenance</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
