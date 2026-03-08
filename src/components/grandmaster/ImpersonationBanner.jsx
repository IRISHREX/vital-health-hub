import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, X } from 'lucide-react';

export default function ImpersonationBanner() {
  const [visible, setVisible] = useState(true);
  const raw = localStorage.getItem('gm_impersonation');
  if (!raw) return null;

  const info = JSON.parse(raw);
  if (!info?.active || !visible) return null;

  const exitImpersonation = () => {
    // Restore grandmaster session
    localStorage.setItem('gm_token', info.gmToken);
    localStorage.setItem('gm_user', info.gmUser);
    localStorage.removeItem('gm_impersonation');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('org_slug');
    window.location.href = '/grandmaster/organizations';
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between bg-primary px-4 py-2 text-primary-foreground shadow-lg">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Shield className="h-4 w-4" />
        <span>Grandmaster Mode — Viewing as <strong>{info.orgName}</strong></span>
      </div>
      <Button
        size="sm"
        variant="secondary"
        onClick={exitImpersonation}
        className="h-7 gap-1.5 text-xs"
      >
        <X className="h-3.5 w-3.5" />
        Exit Impersonation
      </Button>
    </div>
  );
}
