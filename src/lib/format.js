// Centralised formatters. Use these instead of ad-hoc toLocaleString / toFixed.

const CURRENCY_LOCALE = 'en-IN';
const DEFAULT_CURRENCY = 'INR';

const currencyCache = new Map();
const getCurrencyFmt = (currency = DEFAULT_CURRENCY, opts = {}) => {
  const key = `${currency}|${opts.minimumFractionDigits ?? 2}|${opts.maximumFractionDigits ?? 2}`;
  let fmt = currencyCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: 'currency',
      currency,
      minimumFractionDigits: opts.minimumFractionDigits ?? 2,
      maximumFractionDigits: opts.maximumFractionDigits ?? 2,
    });
    currencyCache.set(key, fmt);
  }
  return fmt;
};

export const formatCurrency = (amount, opts = {}) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return opts.fallback ?? '—';
  return getCurrencyFmt(opts.currency, opts).format(n);
};

const DATE_LOCALE = 'en-IN';
const dateFmtCache = new Map();
const getDateFmt = (options) => {
  const key = JSON.stringify(options);
  let fmt = dateFmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(DATE_LOCALE, options);
    dateFmtCache.set(key, fmt);
  }
  return fmt;
};

const toDate = (value) => {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return getDateFmt({ year: 'numeric', month: 'short', day: '2-digit' }).format(d);
};

export const formatDateTime = (value, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return getDateFmt({
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).format(d);
};

export const formatTime = (value, fallback = '—') => {
  const d = toDate(value);
  if (!d) return fallback;
  return getDateFmt({ hour: '2-digit', minute: '2-digit' }).format(d);
};

export const formatRelative = (value) => {
  const d = toDate(value);
  if (!d) return '—';
  const diff = (Date.now() - d.getTime()) / 1000;
  const abs = Math.abs(diff);
  const past = diff >= 0;
  const fmt = (n, unit) => `${past ? '' : 'in '}${n} ${unit}${n === 1 ? '' : 's'}${past ? ' ago' : ''}`;
  if (abs < 60) return past ? 'just now' : 'in a moment';
  if (abs < 3600) return fmt(Math.round(abs / 60), 'min');
  if (abs < 86400) return fmt(Math.round(abs / 3600), 'hr');
  if (abs < 2592000) return fmt(Math.round(abs / 86400), 'day');
  return formatDate(d);
};

export const formatNumber = (n, opts = {}) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return opts.fallback ?? '—';
  return new Intl.NumberFormat(CURRENCY_LOCALE, opts).format(v);
};

export const formatPercent = (n, fractionDigits = 0) => {
  const v = Number(n);
  if (!Number.isFinite(v)) return '—';
  return `${v.toFixed(fractionDigits)}%`;
};
