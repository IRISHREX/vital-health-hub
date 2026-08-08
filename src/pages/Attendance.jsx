import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import jsQR from "jsqr";
import QRCode from "qrcode";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Camera, CameraOff, MapPin, Plus, QrCode, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getHospitalSettings } from "@/lib/settings";
import { useSound } from "@/hooks/useSound";
import { apiClient } from "@/lib/api-client";
import {
  ATTENDANCE_STATUSES,
  createAttendanceLocation,
  deactivateAttendanceLocation,
  formatWorkedMinutes,
  getMyAttendance,
  listAttendance,
  listAttendanceLocations,
  rotateAttendanceLocationToken,
  scanAttendance,
  scanEmployeeCard,
  upsertManualAttendance,
} from "@/lib/attendance";

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtTime = (value) => (value ? new Date(value).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—");

const statusVariant = {
  present: "default",
  checked_in: "secondary",
  half_day: "warning",
  absent: "destructive",
  leave: "outline",
};

const StatusBadge = ({ status }) => (
  <Badge variant={statusVariant[status] || "outline"} className="capitalize">
    {String(status || "—").replace(/_/g, " ")}
  </Badge>
);

/** Camera QR scanner: decodes frames with jsQR and reports the payload once. */
function QrScanner({ onDecoded, active, onStop }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(0);
  const lockRef = useRef(false);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks()?.forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => {
    if (!active) {
      stop();
      return undefined;
    }
    let cancelled = false;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" });
        if (result?.data && !lockRef.current) {
          lockRef.current = true;
          onDecoded(result.data);
          setTimeout(() => { lockRef.current = false; }, 3000);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        setError(err?.message || "Camera access denied");
        onStop?.();
      }
    })();

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (!active) return null;

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border bg-muted">
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />
        <div className="pointer-events-none absolute inset-8 rounded-lg border-2 border-primary/70" />
      </div>
      <canvas ref={canvasRef} className="hidden" />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

/** Printable QR poster for a location. */
const printLocationPoster = async (location, hospitalName) => {
  const dataUrl = await QRCode.toDataURL(location.token, { width: 640, margin: 2 });
  const win = window.open("", "_blank", "width=800,height=1000");
  if (!win) {
    toast.error("Allow pop-ups to print the poster");
    return;
  }
  win.document.write(`
    <html><head><title>Attendance QR — ${location.name}</title>
    <style>
      body{font-family:system-ui,sans-serif;text-align:center;padding:40px}
      h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;font-weight:500;color:#444;margin:0 0 24px}
      img{width:420px;height:420px}p{color:#555;font-size:13px;margin-top:20px}
    </style></head>
    <body>
      <h1>${hospitalName || "Staff Attendance"}</h1>
      <h2>${location.name}${location.code ? ` (${location.code})` : ""}</h2>
      <img src="${dataUrl}" alt="Attendance QR code" />
      <p>Scan this code from the Attendance page to punch in and out.</p>
      <p>Poster ID: ${location._id}</p>
    </body></html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
};

function LocationForm({ open, onOpenChange, onSaved }) {
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const save = useMutation({
    mutationFn: (payload) => createAttendanceLocation(payload),
    onSuccess: async () => {
      toast.success("Location created");
      setForm({ name: "", code: "", description: "" });
      onOpenChange(false);
      await onSaved?.();
    },
    onError: (err) => toast.error(err.message || "Failed to create location"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>New attendance point</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2"><Label>Name <span className="text-destructive">*</span></Label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Main Gate" /></div>
          <div className="space-y-2"><Label>Code</Label>
            <Input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="GATE-1" /></div>
          <div className="space-y-2"><Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button
              disabled={save.isPending}
              onClick={() => {
                if (!form.name.trim()) return toast.error("Location name is required");
                save.mutate({ ...form, name: form.name.trim() });
              }}
            >
              {save.isPending ? "Saving..." : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Attendance() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === "super_admin" || user?.role === "hospital_admin";

  const [cameraOn, setCameraOn] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [locationFormOpen, setLocationFormOpen] = useState(false);
  const [filters, setFilters] = useState({ from: todayKey(), to: todayKey(), status: "all" });
  const [override, setOverride] = useState({ userId: "", day: todayKey(), checkInAt: "", checkOutAt: "", status: "present", notes: "" });

  const { data: hospitalRes } = useQuery({ queryKey: ["hospital-settings"], queryFn: () => getHospitalSettings() });
  const hospitalName = hospitalRes?.data?.hospitalName;

  const myQuery = useQuery({ queryKey: ["attendance", "me"], queryFn: () => getMyAttendance() });
  const locationsQuery = useQuery({ queryKey: ["attendance", "locations"], queryFn: () => listAttendanceLocations() });
  const registerQuery = useQuery({
    queryKey: ["attendance", "register", filters],
    queryFn: () => listAttendance({
      from: filters.from || undefined,
      to: filters.to || undefined,
      status: filters.status === "all" ? undefined : filters.status,
    }),
  });

  const today = myQuery.data?.today;
  const recent = myQuery.data?.recent || [];
  const locations = locationsQuery.data?.items || [];
  const register = registerQuery.data?.items || [];
  const summary = registerQuery.data?.summary || {};

  const nextAction = useMemo(() => {
    if (!today?.checkIn?.at) return "Check in";
    if (!today?.checkOut?.at) return "Check out";
    return "Completed for today";
  }, [today]);

  const scan = useMutation({
    mutationFn: (token) => scanAttendance({ token }),
    onSuccess: async (res) => {
      if (res?.action === "duplicate") toast.info(res.message || "Already recorded a moment ago");
      else if (res?.action === "checked_out") toast.success(`Checked out at ${res.location} — ${formatWorkedMinutes(res.record?.totalMinutes)}`);
      else toast.success(`Checked in at ${res?.location || "location"}`);
      setManualToken("");
      await qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err) => toast.error(err.message || "Scan failed"),
  });

  const rotate = useMutation({
    mutationFn: (id) => rotateAttendanceLocationToken(id),
    onSuccess: async () => {
      toast.success("QR rotated — reprint the poster");
      await qc.invalidateQueries({ queryKey: ["attendance", "locations"] });
    },
    onError: (err) => toast.error(err.message || "Failed to rotate QR"),
  });

  const deactivate = useMutation({
    mutationFn: (id) => deactivateAttendanceLocation(id),
    onSuccess: async () => {
      toast.success("Location deactivated");
      await qc.invalidateQueries({ queryKey: ["attendance", "locations"] });
    },
    onError: (err) => toast.error(err.message || "Failed to deactivate"),
  });

  const manual = useMutation({
    mutationFn: (payload) => upsertManualAttendance(payload),
    onSuccess: async () => {
      toast.success("Attendance updated");
      await qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err) => toast.error(err.message || "Failed to update attendance"),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Staff Attendance</h1>
        <p className="text-muted-foreground">Scan the posted QR at your duty point to punch in and out.</p>
      </div>

      <Tabs defaultValue="scan">
        <TabsList>
          <TabsTrigger value="scan">Scan</TabsTrigger>
          <TabsTrigger value="mine">My attendance</TabsTrigger>
          {isAdmin && <TabsTrigger value="register">Register</TabsTrigger>}
          {isAdmin && <TabsTrigger value="locations">QR points</TabsTrigger>}
        </TabsList>

        <TabsContent value="scan" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><QrCode className="h-5 w-5" />{nextAction}</CardTitle>
              <CardDescription>
                In: {fmtTime(today?.checkIn?.at)} · Out: {fmtTime(today?.checkOut?.at)} · Worked: {formatWorkedMinutes(today?.totalMinutes)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant={cameraOn ? "outline" : "default"} onClick={() => setCameraOn((v) => !v)}>
                {cameraOn ? <><CameraOff className="mr-2 h-4 w-4" />Stop camera</> : <><Camera className="mr-2 h-4 w-4" />Start camera</>}
              </Button>
              <QrScanner
                active={cameraOn}
                onStop={() => setCameraOn(false)}
                onDecoded={(token) => scan.mutate(String(token).trim())}
              />
              <div className="space-y-2">
                <Label>Or enter the poster code manually</Label>
                <div className="flex gap-2">
                  <Input value={manualToken} onChange={(e) => setManualToken(e.target.value)} placeholder="Paste QR token" />
                  <Button
                    disabled={scan.isPending || !manualToken.trim()}
                    onClick={() => scan.mutate(manualToken.trim())}
                  >
                    Punch
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mine">
          <Card>
            <CardHeader><CardTitle className="text-base">Last 30 days</CardTitle></CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Day</TableHead><TableHead>In</TableHead><TableHead>Out</TableHead><TableHead>Worked</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {recent.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No attendance recorded yet</TableCell></TableRow>
                  ) : recent.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">{r.day}</TableCell>
                      <TableCell>{fmtTime(r.checkIn?.at)}</TableCell>
                      <TableCell>{fmtTime(r.checkOut?.at)}</TableCell>
                      <TableCell>{formatWorkedMinutes(r.totalMinutes)}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="register" className="space-y-4">
            <Card>
              <CardContent className="grid gap-3 p-4 sm:grid-cols-4">
                <div className="space-y-2"><Label>From</Label><Input type="date" value={filters.from} onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value }))} /></div>
                <div className="space-y-2"><Label>To</Label><Input type="date" value={filters.to} onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={filters.status} onValueChange={(status) => setFilters((p) => ({ ...p, status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {ATTENDANCE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={() => registerQuery.refetch()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">Records: {register.length}</Badge>
              <Badge variant="outline">Present: {summary.present || 0}</Badge>
              <Badge variant="outline">Checked in: {summary.checked_in || 0}</Badge>
              <Badge variant="outline">Half day: {summary.half_day || 0}</Badge>
              <Badge variant="outline">Total hours: {summary.totalHours || 0}</Badge>
            </div>

            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Employee</TableHead><TableHead>Role</TableHead><TableHead>Day</TableHead><TableHead>In</TableHead><TableHead>Out</TableHead><TableHead>Worked</TableHead><TableHead>Status</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {register.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No records for this range</TableCell></TableRow>
                  ) : register.map((r) => (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">
                        {r.userName || `${r.user?.firstName || ""} ${r.user?.lastName || ""}`.trim() || "—"}
                      </TableCell>
                      <TableCell className="capitalize">{String(r.role || r.user?.role || "—").replace(/_/g, " ")}</TableCell>
                      <TableCell>{r.day}</TableCell>
                      <TableCell>{fmtTime(r.checkIn?.at)}</TableCell>
                      <TableCell>{fmtTime(r.checkOut?.at)}</TableCell>
                      <TableCell>{formatWorkedMinutes(r.totalMinutes)}</TableCell>
                      <TableCell><StatusBadge status={r.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Manual override</CardTitle>
                <CardDescription>Use for missed scans or leave marking. Employee ID is the user record ID.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2"><Label>Employee ID</Label><Input value={override.userId} onChange={(e) => setOverride((p) => ({ ...p, userId: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Day</Label><Input type="date" value={override.day} onChange={(e) => setOverride((p) => ({ ...p, day: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={override.status} onValueChange={(status) => setOverride((p) => ({ ...p, status }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ATTENDANCE_STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Check-in time</Label><Input type="datetime-local" value={override.checkInAt} onChange={(e) => setOverride((p) => ({ ...p, checkInAt: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Check-out time</Label><Input type="datetime-local" value={override.checkOutAt} onChange={(e) => setOverride((p) => ({ ...p, checkOutAt: e.target.value }))} /></div>
                <div className="space-y-2"><Label>Notes</Label><Input value={override.notes} onChange={(e) => setOverride((p) => ({ ...p, notes: e.target.value }))} /></div>
                <div className="sm:col-span-3">
                  <Button
                    disabled={manual.isPending}
                    onClick={() => {
                      if (!override.userId.trim() || !override.day) return toast.error("Employee ID and day are required");
                      manual.mutate({
                        userId: override.userId.trim(),
                        day: override.day,
                        status: override.status,
                        checkInAt: override.checkInAt || undefined,
                        checkOutAt: override.checkOutAt || undefined,
                        notes: override.notes || undefined,
                      });
                    }}
                  >
                    {manual.isPending ? "Saving..." : "Save override"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="locations" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setLocationFormOpen(true)}><Plus className="mr-2 h-4 w-4" />New QR point</Button>
            </div>
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow><TableHead>Name</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {locations.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No attendance points yet</TableCell></TableRow>
                  ) : locations.map((loc) => (
                    <TableRow key={loc._id}>
                      <TableCell className="font-medium"><span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{loc.name}</span></TableCell>
                      <TableCell>{loc.code || "—"}</TableCell>
                      <TableCell><Badge variant={loc.isActive ? "default" : "outline"}>{loc.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" disabled={!loc.token} onClick={() => printLocationPoster(loc, hospitalName)}>
                            <QrCode className="mr-1 h-3 w-3" />Print poster
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => rotate.mutate(loc._id)}><RefreshCw className="mr-1 h-3 w-3" />Rotate</Button>
                          {loc.isActive && (
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deactivate.mutate(loc._id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
            <LocationForm
              open={locationFormOpen}
              onOpenChange={setLocationFormOpen}
              onSaved={() => qc.invalidateQueries({ queryKey: ["attendance", "locations"] })}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
