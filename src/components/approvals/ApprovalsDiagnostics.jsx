import { useState, useRef, lazy, Suspense, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, AlertTriangle, Play, Trash2, Box } from 'lucide-react';
import { checkR3FCompatibility } from '@/lib/r3fVersionCheck';

const HospitalScene3D = lazy(() => import('@/components/login/HospitalScene3D'));

function ConsoleCapture({ logs }) {
  return (
    <ScrollArea className="h-64 rounded-md border bg-muted/30 p-3">
      {logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No console output captured yet. Click "Reproduce 3D Scene" to start.</p>
      ) : (
        <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
          {logs.map((l, i) => (
            <div key={i} className={
              l.level === 'error' ? 'text-destructive' :
              l.level === 'warn' ? 'text-amber-500' :
              'text-foreground'
            }>
              <span className="opacity-50">[{l.level}]</span> {l.message}
            </div>
          ))}
        </pre>
      )}
    </ScrollArea>
  );
}

function SafeScene({ onError }) {
  const [errored, setErrored] = useState(false);
  useEffect(() => {
    const handler = (e) => {
      onError?.(e.error || new Error(e.message));
      setErrored(true);
    };
    window.addEventListener('error', handler);
    return () => window.removeEventListener('error', handler);
  }, [onError]);
  if (errored) return null;
  return (
    <Suspense fallback={<div className="text-xs text-muted-foreground">Loading 3D scene…</div>}>
      <HospitalScene3D />
    </Suspense>
  );
}

export default function ApprovalsDiagnostics() {
  const compat = checkR3FCompatibility();
  const [showScene, setShowScene] = useState(false);
  const [logs, setLogs] = useState([]);
  const originals = useRef(null);

  const startCapture = () => {
    if (originals.current) return;
    const o = { log: console.log, warn: console.warn, error: console.error };
    originals.current = o;
    const push = (level) => (...args) => {
      const message = args.map((a) => {
        if (a instanceof Error) return `${a.message}\n${a.stack || ''}`;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
        return String(a);
      }).join(' ');
      setLogs((prev) => [...prev, { level, message, ts: Date.now() }]);
      o[level](...args);
    };
    console.log = push('log');
    console.warn = push('warn');
    console.error = push('error');
  };

  const stopCapture = () => {
    if (!originals.current) return;
    Object.assign(console, originals.current);
    originals.current = null;
  };

  useEffect(() => () => stopCapture(), []);

  const handleReproduce = () => {
    setLogs([]);
    startCapture();
    setShowScene(true);
  };

  const handleStop = () => {
    setShowScene(false);
    stopCapture();
  };

  const handleClear = () => setLogs([]);

  const captureRuntimeError = (err) => {
     
    console.error('Captured scene error:', err);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Box className="h-4 w-4" />
            3D Stack Compatibility
          </CardTitle>
          <CardDescription>
            Loaded versions of React, react-three-fiber, drei and three. Mismatches will block the 3D scene from mounting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
            {Object.entries(compat.versions).map(([k, v]) => (
              <div key={k} className="rounded-md border p-2">
                <div className="text-xs uppercase text-muted-foreground">{k}</div>
                <div className="font-mono">{v}</div>
              </div>
            ))}
          </div>
          {compat.ok ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Compatible</AlertTitle>
              <AlertDescription>The installed 3D libraries are compatible with the running React version.</AlertDescription>
            </Alert>
          ) : (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Incompatible versions detected</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 text-sm">
                  {compat.issues.map((i, idx) => <li key={idx}>{i}</li>)}
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Play className="h-4 w-4" />
            Reproduce Login 3D Scene
          </CardTitle>
          <CardDescription>
            Mounts the same lazy <code>HospitalScene3D</code> chunk used on the login page and captures all console output (log / warn / error with full stack traces).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {!showScene ? (
              <Button size="sm" onClick={handleReproduce}><Play className="mr-2 h-4 w-4" />Reproduce 3D Scene</Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={handleStop}>Stop Scene</Button>
            )}
            <Button size="sm" variant="outline" onClick={handleClear}><Trash2 className="mr-2 h-4 w-4" />Clear Logs</Button>
            <Badge variant="outline">{logs.length} entries</Badge>
          </div>

          {showScene && (
            <div className="relative h-48 overflow-hidden rounded-md border bg-[hsl(215,30%,8%)]">
              <SafeScene onError={captureRuntimeError} />
            </div>
          )}

          <ConsoleCapture logs={logs} />
        </CardContent>
      </Card>
    </div>
  );
}
