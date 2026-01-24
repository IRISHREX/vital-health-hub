import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Phone, Mail, Stethoscope, Award, Clock, Star, Users, MapPin, IndianRupee } from "lucide-react";

const ViewDoctorDialog = ({ isOpen, onClose, doctor }) => {
  if (!doctor) return null;

  const getAvailabilityColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'on_leave': return 'bg-red-500';
      case 'unavailable': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getAvailabilityText = (status) => {
    switch (status) {
      case 'available': return 'Available';
      case 'busy': return 'Busy';
      case 'on_leave': return 'On Leave';
      case 'unavailable': return 'Unavailable';
      default: return 'Unknown';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary/10 text-primary">
                {doctor.name
                  ?.split(" ")
                  .slice(1)
                  .map((n) => n[0])
                  .join("") || 'D'}
              </AvatarFallback>
            </Avatar>
            Doctor Details - {doctor.doctorId || 'N/A'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                <p className="text-lg font-semibold">{doctor.name || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Doctor ID</label>
                <p className="text-lg font-semibold">{doctor.doctorId || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Specialization</label>
                <p className="text-lg">{doctor.specialization || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Department</label>
                <p className="text-lg">{doctor.department || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Qualification</label>
                <p className="text-lg">{doctor.qualification || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Experience</label>
                <p className="text-lg">{doctor.experience ? `${doctor.experience} years` : 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Registration Number</label>
                <p className="text-lg">{doctor.registrationNumber || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Availability Status</label>
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${getAvailabilityColor(doctor.availabilityStatus)}`} />
                  <Badge variant={doctor.availabilityStatus === 'available' ? 'default' : 'secondary'}>
                    {getAvailabilityText(doctor.availabilityStatus)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Phone</label>
                <p className="text-lg flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  {doctor.phone || 'N/A'}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <p className="text-lg flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  {doctor.email || 'N/A'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Professional Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Professional Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">OPD Consultation Fee</label>
                  <p className="text-lg flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    {doctor.consultationFee?.opd?.toLocaleString() || 0}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">IPD Consultation Fee</label>
                  <p className="text-lg flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" />
                    {doctor.consultationFee?.ipd?.toLocaleString() || 0}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Schedule</label>
                {doctor.schedule && doctor.schedule.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {doctor.schedule.map((slot, index) => (
                      <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded-md">
                        <Calendar className="h-4 w-4" />
                        <span className="font-medium capitalize">{slot.day}</span>
                        <span className="text-sm text-muted-foreground">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          ({slot.slotDuration}min slots, max {slot.maxPatients} patients)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No schedule information available</p>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Languages</label>
                {doctor.languages && doctor.languages.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doctor.languages.map((lang, index) => (
                      <Badge key={index} variant="outline">{lang}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No languages specified</p>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Bio</label>
                <p className="text-sm mt-2">{doctor.bio || 'No bio available'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rating</label>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-semibold">{doctor.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-sm text-muted-foreground">
                      ({doctor.totalReviews || 0} reviews)
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Reviews</label>
                  <p className="text-lg flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {doctor.totalReviews || 0}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Additional Specializations</label>
                {doctor.specializations && doctor.specializations.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doctor.specializations.map((spec, index) => (
                      <Badge key={index} variant="secondary">{spec}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No additional specializations</p>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Assigned Wards</label>
                {doctor.assignedWards && doctor.assignedWards.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {doctor.assignedWards.map((ward, index) => (
                      <Badge key={index} variant="outline">
                        <MapPin className="h-3 w-3 mr-1" />
                        {ward}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No assigned wards</p>
                )}
              </div>

              <Separator />

              <div>
                <label className="text-sm font-medium text-muted-foreground">Leave Schedule</label>
                {doctor.leaveSchedule && doctor.leaveSchedule.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {doctor.leaveSchedule.map((leave, index) => (
                      <div key={index} className="p-2 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-red-500" />
                          <span className="font-medium">
                            {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : 'N/A'} - {leave.endDate ? new Date(leave.endDate).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        {leave.reason && (
                          <p className="text-xs text-muted-foreground mt-1">Reason: {leave.reason}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">No leave scheduled</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewDoctorDialog;