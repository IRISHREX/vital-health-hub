import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bed, Stethoscope, TestTube, Pill, Scan, Activity, Receipt, Users, ShieldCheck,
  Mail, Phone, MessageCircle, MapPin, Check, ArrowRight, Sparkles, Menu, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  BRAND, CONTACT, FEATURES, HIGHLIGHTS, FALLBACK_PLANS, FAQS, PUBLIC_API_BASE,
} from '@/lib/public-config';

const ICONS = { Bed, Stethoscope, TestTube, Pill, Scan, Activity, Receipt, Users, ShieldCheck };

const formatPrice = (n, currency = 'INR') =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n || 0);

const waHref = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent(CONTACT.whatsappMessage)}`;
const mailHref = `mailto:${CONTACT.email}?subject=${encodeURIComponent('BIOMECHASOFT enquiry')}`;
const telHref = `tel:${CONTACT.phone.replace(/\s+/g, '')}`;

const NAV = [
  { id: 'features', label: 'Features' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' },
];

export default function PublicLanding() {
  const { toast } = useToast();
  const [plans, setPlans] = useState(FALLBACK_PLANS);
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'
  const [submitting, setSubmitting] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${PUBLIC_API_BASE}/plans`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled && Array.isArray(json?.data) && json.data.length) setPlans(json.data);
      } catch { /* keep fallback */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.priceMonthly || 0) - (b.priceMonthly || 0)),
    [plans]
  );

  const handleScroll = (id) => (e) => {
    e.preventDefault();
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const submitContact = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    setSubmitting(true);
    try {
      const res = await fetch(`${PUBLIC_API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Could not send your message.');
      toast({ title: 'Message sent', description: json?.message || 'We will be in touch soon.' });
      e.currentTarget.reset();
    } catch (err) {
      toast({ title: 'Could not send', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#top" onClick={handleScroll('top')} className="flex items-center gap-2">
            <img src={BRAND.logoUrl} alt={`${BRAND.name} logo`} className="h-8 w-8" />
            <span className="text-lg font-semibold">{BRAND.name}</span>
          </a>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <a key={n.id} href={`#${n.id}`} onClick={handleScroll(n.id)}
                className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
            <Button asChild><a href="#contact" onClick={handleScroll('contact')}>Book a demo</a></Button>
          </div>
          <button className="md:hidden p-2 -mr-2" onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {mobileOpen && (
          <div className="border-t border-border/60 bg-background md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
              {NAV.map((n) => (
                <a key={n.id} href={`#${n.id}`} onClick={handleScroll(n.id)}
                  className="rounded-md px-2 py-2 text-sm hover:bg-muted">
                  {n.label}
                </a>
              ))}
              <div className="mt-2 flex gap-2">
                <Button variant="outline" className="flex-1" asChild><Link to="/login">Sign in</Link></Button>
                <Button className="flex-1" asChild>
                  <a href="#contact" onClick={handleScroll('contact')}>Book a demo</a>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-60"
          style={{ background: 'var(--gradient-primary)' }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-background/80" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 text-center">
          <Badge variant="secondary" className="mb-5 inline-flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5" /> Trusted by modern healthcare teams
          </Badge>
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            {BRAND.tagline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {BRAND.description}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" asChild>
              <a href="#contact" onClick={handleScroll('contact')}>
                Book a free demo <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href={waHref} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-4 w-4" /> Chat on WhatsApp
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Everything your hospital needs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            One unified platform across every department - no more juggling tools.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = ICONS[f.icon] || Sparkles;
            return (
              <Card key={f.title} className="group transition-all hover:-translate-y-0.5 hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="mt-3 text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">{f.desc}</CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Highlights */}
      <section id="highlights" className="bg-muted/40 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Why teams choose {BRAND.name}</h2>
          </div>
          <ul className="mx-auto grid max-w-4xl gap-3 sm:grid-cols-2">
            {HIGHLIGHTS.map((h) => (
              <li key={h} className="flex items-start gap-3 rounded-lg bg-background p-4 shadow-sm">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">Simple, transparent pricing</h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Pick the plan that fits today - switch anytime as you grow.
          </p>
          <div className="mx-auto mt-6 inline-flex rounded-full border border-border bg-background p-1">
            {['monthly', 'yearly'].map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`rounded-full px-4 py-1.5 text-sm capitalize transition-colors ${
                  billing === b ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {b}{b === 'yearly' && <span className="ml-1 text-xs opacity-80">save ~17%</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {sortedPlans.map((p) => {
            const price = billing === 'monthly' ? p.priceMonthly : p.priceYearly;
            const suffix = billing === 'monthly' ? '/mo' : '/yr';
            return (
              <Card key={p._id || p.code}
                className={`relative flex flex-col ${p.isPopular ? 'border-primary shadow-lg' : ''}`}>
                {p.isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most popular</Badge>
                )}
                <CardHeader>
                  <CardTitle>{p.name}</CardTitle>
                  {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{formatPrice(price, p.currency)}</span>
                    <span className="text-muted-foreground">{suffix}</span>
                  </div>
                  <ul className="mb-6 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />
                      {p.maxUsers ? `Up to ${p.maxUsers} users` : 'Unlimited users'}
                    </li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />
                      {p.maxBeds ? `Up to ${p.maxBeds} beds` : 'Unlimited beds'}
                    </li>
                    <li className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" />
                      {p.maxPatients ? `Up to ${p.maxPatients} patients` : 'Unlimited patients'}
                    </li>
                    {(p.includedModules || []).slice(0, 6).map((m) => (
                      <li key={m} className="flex items-center gap-2 capitalize">
                        <Check className="h-4 w-4 text-accent" /> {m}
                      </li>
                    ))}
                    {(p.includedModules || []).length > 6 && (
                      <li className="text-xs text-muted-foreground">
                        + {p.includedModules.length - 6} more modules
                      </li>
                    )}
                  </ul>
                  <Button className="mt-auto w-full" variant={p.isPopular ? 'default' : 'outline'} asChild>
                    <a href="#contact" onClick={handleScroll('contact')}>Get started</a>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-muted/40 py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="mb-8 text-center text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-lg border border-border bg-background p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">
                  {f.q}
                  <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Talk to us</h2>
            <p className="mt-3 text-muted-foreground">
              Reach out on any channel - we usually respond within a few hours.
            </p>
            <div className="mt-6 space-y-3">
              <a href={waHref} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted">
                <MessageCircle className="h-5 w-5 text-accent" />
                <div>
                  <div className="font-medium">WhatsApp</div>
                  <div className="text-sm text-muted-foreground">Chat with sales instantly</div>
                </div>
              </a>
              <a href={mailHref}
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">{CONTACT.email}</div>
                </div>
              </a>
              <a href={telHref}
                className="flex items-center gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-muted">
                <Phone className="h-5 w-5 text-primary" />
                <div>
                  <div className="font-medium">Call</div>
                  <div className="text-sm text-muted-foreground">{CONTACT.phone}</div>
                </div>
              </a>
              <div className="flex items-center gap-3 rounded-lg border border-border p-4">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Office</div>
                  <div className="text-sm text-muted-foreground">{CONTACT.address}</div>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader><CardTitle>Send us a message</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={submitContact} className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" required autoComplete="name" />
                  </div>
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Input id="organization" name="organization" autoComplete="organization" />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" type="tel" autoComplete="tel" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">How can we help? *</Label>
                  <Textarea id="message" name="message" required rows={4}
                    placeholder="Tell us about your hospital or nursing home..." />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Sending...' : 'Send message'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <img src={BRAND.logoUrl} alt="" className="h-5 w-5" />
            <span>&copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-foreground">Sign in</Link>
            <a href={mailHref} className="hover:text-foreground">{CONTACT.email}</a>
            <a href={waHref} target="_blank" rel="noreferrer" className="hover:text-foreground">WhatsApp</a>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp button */}
      <a
        href={waHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat on WhatsApp"
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
    </div>
  );
}
