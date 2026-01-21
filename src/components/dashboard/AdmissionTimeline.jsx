import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LogIn,
  ArrowRight,
  LogOut,
  AlertCircle,
  MapPin,
  Calendar,
} from 'lucide-react';

export default function AdmissionTimeline({ admission }) {
  if (!admission) return null;

  const events = buildTimelineEvents(admission);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Patient Journey
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {events.map((event, index) => (
            <div key={index} className="flex gap-4">
              {/* Timeline marker */}
              <div className="flex flex-col items-center">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold ${getEventColor(event.type)}`}>
                  {getEventIcon(event.type)}
                </div>
                {index < events.length - 1 && (
                  <div className="w-1 h-16 bg-gray-200 mt-2" />
                )}
              </div>

              {/* Event details */}
              <div className="flex-1 pt-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="text-sm text-gray-600">{event.description}</p>
                    {event.details && (
                      <div className="mt-2 space-y-1">
                        {Object.entries(event.details).map(([key, value]) => (
                          <p key={key} className="text-sm text-gray-600">
                            <span className="font-medium">{key}:</span> {value}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {event.time}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function buildTimelineEvents(admission) {
  const events = [];

  // Admission event
  events.push({
    type: 'admission',
    title: 'Patient Admitted',
    description: `Admitted to ${admission.bed?.bedNumber} (${admission.bed?.bedType.toUpperCase()})`,
    time: new Date(admission.admissionDate).toLocaleDateString(),
    details: {
      'Ward': admission.bed?.ward,
      'Doctor': admission.admittingDoctor?.user?.firstName || 'N/A',
      'Type': admission.admissionType?.charAt(0).toUpperCase() + admission.admissionType?.slice(1),
    }
  });

  // Transfer events
  if (admission.transferHistory && admission.transferHistory.length > 0) {
    admission.transferHistory.forEach((transfer, index) => {
      events.push({
        type: 'transfer',
        title: 'Patient Transferred',
        description: `From ${transfer.fromWard} to ${transfer.toWard}`,
        time: new Date(transfer.transferDate).toLocaleDateString(),
        details: {
          'From': transfer.fromBed?.bedNumber,
          'To': transfer.toBed?.bedNumber,
          'Reason': transfer.transferReason || 'N/A',
        }
      });
    });
  }

  // Discharge event
  if (admission.status === 'DISCHARGED') {
    events.push({
      type: 'discharge',
      title: 'Patient Discharged',
      description: `Discharged from ${admission.bed?.bedNumber}`,
      time: new Date(admission.actualDischargeDate).toLocaleDateString(),
      details: {
        'Date': new Date(admission.actualDischargeDate).toLocaleDateString(),
        'Reason': admission.dischargeNotes || 'N/A',
      }
    });
  }

  return events;
}

function getEventColor(type) {
  const colors = {
    admission: 'bg-blue-500',
    transfer: 'bg-purple-500',
    discharge: 'bg-green-500',
  };
  return colors[type] || 'bg-gray-500';
}

function getEventIcon(type) {
  const icons = {
    admission: '→',
    transfer: '↻',
    discharge: '✓',
  };
  return icons[type] || '•';
}
