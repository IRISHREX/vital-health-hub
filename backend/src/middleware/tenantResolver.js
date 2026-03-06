const Organization = require('../models/GM_Organization');
const { getTenantConnection, registerTenantModels } = require('../config/tenantManager');

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);
const EMAIL_RESOLUTION_PATHS = new Set(['/auth/login']);

const parseHost = (req) => {
  const forwarded = req.headers['x-forwarded-host'];
  const host = (forwarded || req.headers.host || '').split(',')[0].trim();
  return host.split(':')[0].toLowerCase();
};

const getSubdomainSlug = (host) => {
  if (!host || LOCAL_HOSTS.has(host)) return null;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;

  const parts = host.split('.');
  if (parts.length < 3) return null;

  const subdomain = parts[0];
  if (!subdomain || subdomain === 'www') return null;
  return subdomain;
};

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const resolveOrganizationByEmail = async (email) => {
  if (!email) return null;

  const matches = await Organization.find({
    status: { $ne: 'deactivated' },
    $or: [{ 'adminDetails.email': email }, { email }],
  })
    .select('+dbUri')
    .limit(2);

  if (matches.length > 1) {
    const error = new Error('multiple_orgs');
    error.code = 'MULTIPLE_ORGS';
    throw error;
  }

  return matches[0] || null;
};

const attachTenantContext = (req, org) => {
  const conn = getTenantConnection({ dbName: org.dbName, dbUri: org.dbUri });
  registerTenantModels(conn);

  req.tenant = {
    slug: org.slug,
    organizationId: org._id,
    organization: org,
    dbName: org.dbName,
    dbUri: org.dbUri || null,
    connection: conn,
  };
  req.tenantConn = conn;
  req.tenantConnection = conn;
};

/**
 * Resolves tenant context from:
 * 1) x-org-slug header
 * 2) request subdomain
 * 3) login email (POST /auth/login) when header/subdomain is missing
 *
 * When resolved, attaches:
 * - req.tenant
 * - req.tenantConn / req.tenantConnection
 *
 * Non-breaking behavior:
 * - If no tenant hint is provided, request continues without tenant context.
 * - If a hint is provided but invalid/not found, returns 4xx.
 */
const resolveTenant = async (req, res, next) => {
  try {
    const headerSlug = String(req.headers['x-org-slug'] || '').trim().toLowerCase();
    const host = parseHost(req);
    const subdomainSlug = getSubdomainSlug(host);
    const slug = headerSlug || subdomainSlug;
    const path = String(req.path || '').toLowerCase();
    const shouldTryEmailResolution =
      !slug && req.method === 'POST' && EMAIL_RESOLUTION_PATHS.has(path);

    let org = null;

    if (slug) {
      org = await Organization.findOne({ slug, status: { $ne: 'deactivated' } }).select('+dbUri');
      if (!org) {
        return res.status(404).json({ success: false, message: `Organization not found for slug '${slug}'` });
      }
    } else if (shouldTryEmailResolution) {
      const email = normalizeEmail(req.body?.email);
      if (email) {
        try {
          org = await resolveOrganizationByEmail(email);
        } catch (error) {
          if (error.code === 'MULTIPLE_ORGS') {
            return res.status(409).json({
              success: false,
              message: 'Multiple organizations match this email. Please provide x-org-slug.',
            });
          }
          throw error;
        }
      }
    } else {
      return next();
    }

    // If no organization is resolved from email, continue for backward compatibility.
    if (!org) {
      return next();
    }

    if (org.status === 'suspended') {
      return res.status(403).json({ success: false, message: 'Organization is suspended' });
    }

    attachTenantContext(req, org);

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = { resolveTenant };

