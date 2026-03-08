import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { gmLogin, setGmToken, setGmUser } from '@/lib/grandmaster-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Shield, Zap } from 'lucide-react';

const HospitalScene3D = lazy(() => import('@/components/login/HospitalScene3D'));

export default function GrandmasterLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await gmLogin({ email, password });
      if (res.data?.token && res.data?.user) {
        setGmToken(res.data.token);
        setGmUser(res.data.user);
        navigate('/grandmaster');
      } else {
        throw new Error('Login failed');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(215,30%,8%)]">
      <Suspense fallback={null}>
        <HospitalScene3D />
      </Suspense>

      <div className="absolute inset-0 z-[1] bg-gradient-to-b from-[hsl(215,30%,8%,0.3)] via-transparent to-[hsl(215,30%,8%,0.7)]" />
      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[hsl(215,30%,8%,0.5)] via-transparent to-[hsl(215,30%,8%,0.5)]" />

      <Card className="relative z-10 w-full max-w-md border border-[hsl(270,60%,30%,0.5)] bg-[hsl(215,25%,12%,0.85)] backdrop-blur-xl shadow-2xl shadow-[hsl(270,60%,40%,0.15)]">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[hsl(270,60%,50%)] to-[hsl(300,70%,40%)] shadow-lg shadow-[hsl(270,60%,50%,0.4)]">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            Grandmaster Portal
          </CardTitle>
          <CardDescription className="flex items-center justify-center gap-1.5 text-[hsl(270,40%,70%)] text-base">
            <Zap className="h-4 w-4" />
            Platform Administration Console
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="gm-email" className="text-[hsl(210,20%,80%)] text-sm font-medium">Email</Label>
              <Input
                id="gm-email"
                type="email"
                placeholder="grandmaster@platform.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-11 border-[hsl(215,25%,22%)] bg-[hsl(215,25%,15%)] text-white placeholder:text-[hsl(210,15%,40%)] focus-visible:ring-[hsl(270,60%,50%)] focus-visible:border-[hsl(270,60%,50%)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gm-password" className="text-[hsl(210,20%,80%)] text-sm font-medium">Password</Label>
              <Input
                id="gm-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="h-11 border-[hsl(215,25%,22%)] bg-[hsl(215,25%,15%)] text-white placeholder:text-[hsl(210,15%,40%)] focus-visible:ring-[hsl(270,60%,50%)] focus-visible:border-[hsl(270,60%,50%)]"
              />
            </div>
            {error && (
              <div className="rounded-lg border border-[hsl(0,72%,51%,0.3)] bg-[hsl(0,72%,51%,0.1)] px-4 py-2.5">
                <p className="text-sm text-[hsl(0,72%,65%)]">{error}</p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[hsl(270,60%,50%)] to-[hsl(300,70%,40%)] hover:from-[hsl(270,60%,55%)] hover:to-[hsl(300,70%,45%)] text-white shadow-lg shadow-[hsl(270,60%,50%,0.25)] transition-all duration-300 hover:shadow-xl hover:shadow-[hsl(270,60%,50%,0.35)]"
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Sign In
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-1.5 text-[hsl(210,15%,45%)] text-xs">
            <Shield className="h-3 w-3" />
            <span>Restricted Access — Authorized Personnel Only</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
