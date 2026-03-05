import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getMyPersonalPermissions, updateMyPersonalPermissions } from '@/lib/personalPermissions';
import { Shield, Save, Info } from 'lucide-react';

const doctorPermissionConfig = [
  {
    module: 'prescriptions',
    label: 'Prescriptions',
    description: 'Allow other users to interact with your prescriptions',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
      { key: 'create', label: 'Create' },
      { key: 'delete', label: 'Delete' },
    ]
  },
  {
    module: 'schedule',
    label: 'Schedule Management',
    description: 'Allow other staff to view or modify your schedule',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
    ]
  },
];

const nursePermissionConfig = [
  {
    module: 'tasks',
    label: 'Task Management',
    description: 'Allow other nurses to manage tasks you oversee',
    actions: [
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'delete', label: 'Delete' },
    ]
  },
  {
    module: 'vitals',
    label: 'Vitals Recording',
    description: 'Allow other nurses to record vitals for your patients',
    actions: [
      { key: 'create', label: 'Record' },
      { key: 'edit', label: 'Edit' },
    ]
  },
  {
    module: 'transfer',
    label: 'Patient Transfer',
    description: 'Allow other nurses to transfer patients',
    actions: [
      { key: 'allow', label: 'Allow Transfer' },
    ]
  },
  {
    module: 'assign',
    label: 'Patient Assignment',
    description: 'Allow other nurses to assign patients',
    actions: [
      { key: 'allow', label: 'Allow Assignment' },
    ]
  },
  {
    module: 'reject',
    label: 'Reject Actions',
    description: 'Allow other nurses to reject tasks or assignments',
    actions: [
      { key: 'allow', label: 'Allow Reject' },
    ]
  },
];

export default function PersonalPermissionsPanel({ role, userId, roleType }) {
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const config = roleType === 'doctor' ? doctorPermissionConfig : nursePermissionConfig;

  useEffect(() => {
    loadPermissions();
  }, [userId]);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const res = await getMyPersonalPermissions();
      setPermissions(res.data || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const togglePermission = (module, action) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...(prev[module] || {}),
        [action]: !(prev[module]?.[action])
      }
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateMyPersonalPermissions(permissions);
      toast.success('Personal permissions saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-8 text-muted-foreground">Loading permissions...</div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Personal Permission Settings</CardTitle>
            </div>
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-1" />{saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
            <Info className="h-3 w-3" />
            Control what other staff members can do with your resources
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.map(section => (
            <div key={section.module} className="p-4 rounded-lg border border-border">
              <div className="mb-3">
                <h4 className="font-medium text-sm">{section.label}</h4>
                <p className="text-xs text-muted-foreground">{section.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {section.actions.map(action => (
                  <div key={action.key} className="flex items-center justify-between p-2 rounded-md bg-muted/30">
                    <span className="text-sm">{action.label}</span>
                    <Switch
                      checked={!!permissions[section.module]?.[action.key]}
                      onCheckedChange={() => togglePermission(section.module, action.key)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
