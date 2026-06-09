import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, Upload, Trash2, ImageIcon } from "lucide-react";
import { getHospitalSettings, updateHospitalSettings } from "@/lib/settings";

const MODULES = [
  { key: "invoice", label: "Billing / Invoice" },
  { key: "lab", label: "Lab Reports" },
  { key: "radiology", label: "Radiology Reports" },
  { key: "pharmacy", label: "Pharmacy" },
  { key: "prescription", label: "Prescription" },
  { key: "ot", label: "OT / Surgery" },
  { key: "appointment", label: "Appointment Receipt" },
  { key: "discharge", label: "Discharge Summary" },
];

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const ImageField = ({ label, value, onChange, hint, maxKb = 500 }) => {
  const ref = useRef(null);
  const handle = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxKb * 1024) {
      toast.error(`Image must be under ${maxKb}KB`);
      return;
    }
    const b64 = await fileToBase64(file);
    onChange(b64);
  };
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="h-20 w-32 flex items-center justify-center border rounded bg-muted/30 overflow-hidden">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground" />
          )}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto">
          <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
          <Button type="button" size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => ref.current?.click()}>
            <Upload className="h-3.5 w-3.5 mr-2" />Upload
          </Button>
          {value && (
            <Button type="button" size="sm" variant="ghost" className="w-full text-destructive sm:w-auto" onClick={() => onChange("")}>
              <Trash2 className="h-3.5 w-3.5 mr-2" />Remove
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
};

const emptyOverride = () => ({
  logo: "", signature: "", stamp: "",
  signatoryName: "", signatoryDesignation: "",
  headerText: "", footerText: "",
  headerImage: "", useHeaderImage: false,
});

export default function BrandingSettings() {
  const qc = useQueryClient();
  const { data: hospitalRes, isLoading } = useQuery({
    queryKey: ["hospital-settings"],
    queryFn: () => getHospitalSettings(),
  });

  const initial = useMemo(() => {
    const b = hospitalRes?.data?.branding || {};
    return {
      logo: b.logo || hospitalRes?.data?.logo || "",
      signature: b.signature || "",
      stamp: b.stamp || "",
      signatoryName: b.signatoryName || "",
      signatoryDesignation: b.signatoryDesignation || "",
      headerText: b.headerText || "",
      footerText: b.footerText || "",
      showLogo: b.showLogo !== false,
      showSignature: b.showSignature !== false,
      showStamp: b.showStamp !== false,
      modules: b.modules || {},
    };
  }, [hospitalRes?.data]);

  const [form, setForm] = useState(initial);
  useEffect(() => { setForm(initial); }, [initial]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));
  const updateModule = (key, patch) => setForm((f) => ({
    ...f,
    modules: { ...(f.modules || {}), [key]: { ...emptyOverride(), ...(f.modules?.[key] || {}), ...patch } },
  }));
  const clearModule = (key) => setForm((f) => {
    const next = { ...(f.modules || {}) };
    delete next[key];
    return { ...f, modules: next };
  });

  const saveMutation = useMutation({
    mutationFn: () => updateHospitalSettings({ branding: form, logo: form.logo }),
    onSuccess: () => {
      toast.success("Branding saved");
      qc.invalidateQueries({ queryKey: ["hospital-settings"] });
    },
    onError: (e) => toast.error(e?.message || "Failed to save branding"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Print Branding</CardTitle>
        <CardDescription>
          Configure the header, footer, signature and stamp used on all invoices, reports, prescriptions and the appointment receipt.
          Per-module overrides let you customise individual document types.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="default">
          <TabsList className="flex h-auto w-full justify-start gap-1 overflow-x-auto p-1 [scrollbar-width:none] lg:flex-wrap lg:overflow-visible">
            <TabsTrigger value="default">Default (all modules)</TabsTrigger>
            {MODULES.map((m) => (
              <TabsTrigger key={m.key} value={m.key}>{m.label}</TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="default" className="space-y-6 pt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <ImageField label="Logo" value={form.logo} onChange={(v) => update({ logo: v })} hint="PNG/JPG, under 500KB" />
              <ImageField label="Signature" value={form.signature} onChange={(v) => update({ signature: v })} hint="Transparent PNG works best" />
              <ImageField label="Stamp / Seal" value={form.stamp} onChange={(v) => update({ stamp: v })} hint="Transparent PNG works best" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Signatory Name</Label>
                <Input value={form.signatoryName} onChange={(e) => update({ signatoryName: e.target.value })} placeholder="Dr. A. Sharma" />
              </div>
              <div className="space-y-2">
                <Label>Signatory Designation</Label>
                <Input value={form.signatoryDesignation} onChange={(e) => update({ signatoryDesignation: e.target.value })} placeholder="Medical Superintendent" />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Header Text</Label>
                <Textarea rows={2} value={form.headerText} onChange={(e) => update({ headerText: e.target.value })} placeholder="Tagline / accreditation / NABH No. etc." />
              </div>
              <div className="space-y-2">
                <Label>Footer Text</Label>
                <Textarea rows={2} value={form.footerText} onChange={(e) => update({ footerText: e.target.value })} placeholder="Terms, contact info, disclaimer..." />
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <Label className="text-sm">Show logo on prints</Label>
                <Switch checked={form.showLogo} onCheckedChange={(v) => update({ showLogo: v })} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <Label className="text-sm">Show signature</Label>
                <Switch checked={form.showSignature} onCheckedChange={(v) => update({ showSignature: v })} />
              </div>
              <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                <Label className="text-sm">Show stamp</Label>
                <Switch checked={form.showStamp} onCheckedChange={(v) => update({ showStamp: v })} />
              </div>
            </div>
          </TabsContent>

          {MODULES.map((m) => {
            const ov = form.modules?.[m.key] || {};
            const hasOverride = Object.keys(form.modules?.[m.key] || {}).length > 0;
            return (
              <TabsContent key={m.key} value={m.key} className="space-y-5 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{m.label} override</p>
                    <p className="text-xs text-muted-foreground">Leave fields empty to inherit from Default. Filled fields override the default for this document type.</p>
                  </div>
                  {hasOverride && (
                    <Button type="button" size="sm" variant="ghost" className="w-full text-destructive sm:w-auto" onClick={() => clearModule(m.key)}>
                      Clear override
                    </Button>
                  )}
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <ImageField label="Logo (override)" value={ov.logo || ""} onChange={(v) => updateModule(m.key, { logo: v })} />
                  <ImageField label="Signature (override)" value={ov.signature || ""} onChange={(v) => updateModule(m.key, { signature: v })} />
                  <ImageField label="Stamp (override)" value={ov.stamp || ""} onChange={(v) => updateModule(m.key, { stamp: v })} />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Signatory Name (override)</Label>
                    <Input value={ov.signatoryName || ""} onChange={(e) => updateModule(m.key, { signatoryName: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Signatory Designation (override)</Label>
                    <Input value={ov.signatoryDesignation || ""} onChange={(e) => updateModule(m.key, { signatoryDesignation: e.target.value })} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Header Text (override)</Label>
                    <Textarea rows={2} value={ov.headerText || ""} onChange={(e) => updateModule(m.key, { headerText: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Footer Text (override)</Label>
                    <Textarea rows={2} value={ov.footerText || ""} onChange={(e) => updateModule(m.key, { footerText: e.target.value })} />
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        <div className="flex justify-end pt-6">
          <Button className="w-full sm:w-auto" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Branding
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
