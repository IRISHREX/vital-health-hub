import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { collectSample, receiveSample, rejectSample } from "@/lib/labTests";
import { toast } from "sonner";
import { TestTubes, CheckCircle, XCircle, Clock } from "lucide-react";

export default function SampleCollectionQueue({ tests, onRefresh, permissions }) {
  const pendingCollection = tests.filter(t => t.sampleStatus === 'pending_collection');
  const collected = tests.filter(t => t.sampleStatus === 'collected');

  const handleCollect = async (id) => {
    try {
      await collectSample(id);
      toast.success("Sample collected");
      onRefresh();
    } catch (err) { toast.error(err.message); }
  };

  const handleReceive = async (id) => {
    try {
      await receiveSample(id);
      toast.success("Sample received at lab");
      onRefresh();
    } catch (err) { toast.error(err.message); }
  };

  const handleReject = async (id) => {
    try {
      await rejectSample(id, "Sample quality issue");
      toast.success("Sample rejected - recollection needed");
      onRefresh();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      {/* Pending Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-primary" />
            Pending Collection ({pendingCollection.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Sample Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingCollection.length > 0 ? pendingCollection.map(t => (
                <TableRow key={t._id}>
                  <TableCell className="font-mono text-sm">{t.testId}</TableCell>
                  <TableCell className="font-medium">{t.patient?.firstName} {t.patient?.lastName}</TableCell>
                  <TableCell>{t.testName}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{t.sampleType}</Badge></TableCell>
                  <TableCell>
                    <Badge variant={t.priority === 'stat' ? 'destructive' : t.priority === 'urgent' ? 'default' : 'secondary'} className="capitalize">{t.priority}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</TableCell>
                  <TableCell className="text-right">
                    {permissions.canEdit && (
                      <Button size="sm" onClick={() => handleCollect(t._id)}>
                        <TestTubes className="mr-2 h-4 w-4" />Collect
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No pending samples</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Collected - Awaiting Lab */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TestTubes className="h-5 w-5 text-accent" />
            Collected - Awaiting Lab ({collected.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sample ID</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Test</TableHead>
                <TableHead>Collected At</TableHead>
                <TableHead>Collected By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collected.length > 0 ? collected.map(t => (
                <TableRow key={t._id}>
                  <TableCell className="font-mono text-sm">{t.sampleId}</TableCell>
                  <TableCell className="font-medium">{t.patient?.firstName} {t.patient?.lastName}</TableCell>
                  <TableCell>{t.testName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.sampleCollectedAt ? new Date(t.sampleCollectedAt).toLocaleString() : '-'}</TableCell>
                  <TableCell className="text-sm">{t.sampleCollectedBy?.firstName} {t.sampleCollectedBy?.lastName}</TableCell>
                  <TableCell className="text-right">
                    {permissions.canEdit && (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleReceive(t._id)}>
                          <CheckCircle className="mr-2 h-4 w-4" />Receive
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleReject(t._id)}>
                          <XCircle className="mr-2 h-4 w-4" />Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No collected samples awaiting</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
