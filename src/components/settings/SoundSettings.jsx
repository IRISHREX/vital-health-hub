import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Volume2, VolumeX, Bell, AlertTriangle, Siren, Radio,
  MousePointerClick, CheckCircle2, XCircle, Trash2, Play
} from "lucide-react";
import { getSoundSettings, saveSoundSettings, playSound } from "@/lib/sounds";
import { toast } from "sonner";

const categoryConfig = [
  { key: "click", label: "Button Clicks", icon: MousePointerClick, description: "Subtle click on button press" },
  { key: "success", label: "Success / Update", icon: CheckCircle2, description: "Positive action completed" },
  { key: "error", label: "Error", icon: XCircle, description: "Something went wrong" },
  { key: "delete", label: "Delete", icon: Trash2, description: "Item removed" },
  { key: "notification", label: "Notification", icon: Bell, description: "New notification received" },
  { key: "urgent", label: "Urgent", icon: AlertTriangle, description: "Urgent priority alerts" },
  { key: "emergency", label: "Emergency", icon: Siren, description: "Emergency siren alert" },
  { key: "broadcast", label: "Broadcast", icon: Radio, description: "System-wide broadcast" },
];

export default function SoundSettings() {
  const [settings, setSettings] = useState(getSoundSettings);

  useEffect(() => {
    saveSoundSettings(settings);
  }, [settings]);

  const toggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      categories: { ...prev.categories, [key]: !prev.categories[key] },
    }));
  };

  const setVolume = (val) => {
    setSettings((prev) => ({ ...prev, volume: val[0] }));
  };

  const toggleMaster = () => {
    setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
  };

  const testSound = (key) => {
    // Temporarily enable for preview
    const prev = getSoundSettings();
    saveSoundSettings({ ...settings, enabled: true, categories: { ...settings.categories, [key]: true } });
    playSound(key === "success" ? "success" : key);
    // Restore
    setTimeout(() => saveSoundSettings(prev), 500);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {settings.enabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              Sound Settings
            </CardTitle>
            <CardDescription>Configure audio feedback for different actions</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="master-sound" className="text-sm">
              {settings.enabled ? "Enabled" : "Disabled"}
            </Label>
            <Switch id="master-sound" checked={settings.enabled} onCheckedChange={toggleMaster} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Volume */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Volume</Label>
          <div className="flex items-center gap-4">
            <VolumeX className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[settings.volume]}
              onValueChange={setVolume}
              min={0}
              max={1}
              step={0.05}
              className="flex-1"
              disabled={!settings.enabled}
            />
            <Volume2 className="h-4 w-4 text-muted-foreground" />
            <Badge variant="outline" className="ml-2 min-w-[45px] justify-center">
              {Math.round(settings.volume * 100)}%
            </Badge>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Sound Categories</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            {categoryConfig.map(({ key, label, icon: Icon, description }) => (
              <div
                key={key}
                className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                  settings.enabled && settings.categories[key]
                    ? "bg-primary/5 border-primary/20"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-3 flex-1">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium leading-none">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => testSound(key)}
                    title="Preview sound"
                  >
                    <Play className="h-3 w-3" />
                  </Button>
                  <Switch
                    checked={settings.categories[key]}
                    onCheckedChange={() => toggle(key)}
                    disabled={!settings.enabled}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
