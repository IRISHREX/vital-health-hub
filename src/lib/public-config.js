// Public-facing brand & contact configuration.
// Update these values to point to the real product channels.

export const BRAND = {
  name: 'NurseHub',
  tagline: 'The all-in-one operating system for modern hospitals & nursing homes.',
  description:
    'Multi-tenant healthcare management — admissions, billing, pharmacy, lab, radiology, OT and more, in one secure platform.',
  logoUrl: '/logo.svg',
};

export const CONTACT = {
  email: 'sales@nursehub.app',
  supportEmail: 'support@nursehub.app',
  phone: '+91 98765 43210',
  whatsapp: '919876543210', // digits only, no '+'
  whatsappMessage: 'Hi! I’d like to learn more about NurseHub.',
  address: 'Bengaluru, India',
  socials: {
    twitter: 'https://twitter.com/',
    linkedin: 'https://linkedin.com/',
  },
};

export const FEATURES = [
  { icon: 'Bed', title: 'Beds & Admissions', desc: 'Real-time bed map, IPD admissions, transfers, discharges with auto invoicing.' },
  { icon: 'Stethoscope', title: 'OPD & Doctors', desc: 'Appointments, queues, prescriptions and doctor dashboards in one place.' },
  { icon: 'TestTube', title: 'Pathology Lab', desc: 'Section → Test → Parameter hierarchy with smart reference ranges & PDF reports.' },
  { icon: 'Pill', title: 'Pharmacy', desc: 'Medicine lifecycle, dispensing, stock and automatic billing entries.' },
  { icon: 'Scan', title: 'Radiology', desc: '7-step imaging workflow, auto-invoicing and structured report editor.' },
  { icon: 'Activity', title: 'Operating Theatre', desc: '12-step surgical workflow with conflict detection and billable item conversion.' },
  { icon: 'Receipt', title: 'Centralised Billing', desc: 'One ledger across admissions, lab, pharmacy, radiology and OT.' },
  { icon: 'Users', title: 'Roles & Permissions', desc: 'RBAC + personal permissions to delegate exactly what each staff member needs.' },
  { icon: 'ShieldCheck', title: 'Multi-Tenant & Secure', desc: 'A dedicated database per organisation with audit trails on sensitive actions.' },
];

export const HIGHLIGHTS = [
  'Standalone portals for Lab, Pharmacy & Radiology centres',
  'Walk-in patient support (internal + external modes)',
  'Real-time notifications with in-app sound feedback',
  'Light / dark / system theme, persisted per user',
  'Command palette (Ctrl+K) for instant navigation',
  'Grandmaster portal for platform-wide oversight',
];

// Fallback plans used when the backend is unreachable.
export const FALLBACK_PLANS = [
  {
    _id: 'starter',
    name: 'Starter',
    code: 'STARTER',
    description: 'For small clinics & nursing homes getting started.',
    priceMonthly: 4999,
    priceYearly: 49990,
    currency: 'INR',
    maxUsers: 15,
    maxBeds: 25,
    maxPatients: 0,
    isPopular: false,
    includedModules: ['dashboard', 'patients', 'appointments', 'billing', 'beds', 'admissions'],
  },
  {
    _id: 'growth',
    name: 'Growth',
    code: 'GROWTH',
    description: 'For growing hospitals that need lab, pharmacy and more.',
    priceMonthly: 12999,
    priceYearly: 129990,
    currency: 'INR',
    maxUsers: 50,
    maxBeds: 100,
    maxPatients: 0,
    isPopular: true,
    includedModules: ['dashboard', 'patients', 'appointments', 'billing', 'beds', 'admissions', 'lab', 'pharmacy', 'reports', 'notifications'],
  },
  {
    _id: 'enterprise',
    name: 'Enterprise',
    code: 'ENTERPRISE',
    description: 'Full suite with radiology, OT and unlimited scale.',
    priceMonthly: 24999,
    priceYearly: 249990,
    currency: 'INR',
    maxUsers: 0,
    maxBeds: 0,
    maxPatients: 0,
    isPopular: false,
    includedModules: ['dashboard', 'patients', 'appointments', 'billing', 'beds', 'admissions', 'lab', 'pharmacy', 'radiology', 'ot', 'reports', 'notifications', 'inventory'],
  },
];

export const FAQS = [
  { q: 'Do I need to install anything?', a: 'No. NurseHub runs in the browser and works on any modern device. Standalone portals are available for satellite centres.' },
  { q: 'Is my data isolated from other hospitals?', a: 'Yes. Every organisation gets a dedicated database, so your data never mixes with another hospital’s data.' },
  { q: 'Can we start with just a few modules?', a: 'Absolutely. Modules can be enabled per organisation, and we can scale up as you grow.' },
  { q: 'Do you offer training and onboarding?', a: 'Yes — our team handles setup, data import and live training for your staff.' },
];

export const PUBLIC_API_BASE = (() => {
  if (typeof window === 'undefined') return '/public/api/v1';
  if (import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/nh\/api\/v1\/?$/, '/public/api/v1');
  }
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5000/public/api/v1';
  }
  return (import.meta.env.VITE_PRODUCTION_API_URL || 'https://your-backend.railway.app/nh/api/v1')
    .replace(/\/nh\/api\/v1\/?$/, '/public/api/v1');
})();
