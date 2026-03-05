/**
 * Multi-Tenant Database Connection Manager
 * Manages separate MongoDB database connections for each organization.
 * Uses a connection pool cache to avoid creating new connections for every request.
 */
const mongoose = require('mongoose');
const config = require('../config');

// Cache of tenant connections: { cacheKey: mongoose.Connection }
const tenantConnections = new Map();

const buildTenantUri = (dbName, dbUri) => {
  if (dbUri) return dbUri;

  const baseUri = config.mongoUri;
  if (/\/[^/?]+(\?|$)/.test(baseUri)) {
    return baseUri.replace(/\/[^/?]+(\?|$)/, `/${dbName}$1`);
  }

  const [withoutQuery, query = ''] = baseUri.split('?');
  return `${withoutQuery.replace(/\/+$/, '')}/${dbName}${query ? `?${query}` : ''}`;
};

/**
 * Get or create a mongoose connection for a specific tenant database.
 * Re-uses cached connections for performance.
 *
 * @param {string|{dbName?: string, dbUri?: string}} input
 */
const getTenantConnection = (input) => {
  const opts = typeof input === 'string' ? { dbName: input } : (input || {});
  const { dbName, dbUri } = opts;

  if (!dbName && !dbUri) {
    throw new Error('getTenantConnection requires dbName or dbUri');
  }

  const cacheKey = dbUri ? `uri:${dbUri}` : `db:${dbName}`;
  const label = dbName || 'custom-uri';

  if (tenantConnections.has(cacheKey)) {
    const conn = tenantConnections.get(cacheKey);
    if (conn.readyState === 1 || conn.readyState === 2) {
      return conn;
    }
    // Connection is closed/closing - remove from cache and recreate
    tenantConnections.delete(cacheKey);
  }

  const tenantUri = buildTenantUri(dbName, dbUri);

  const conn = mongoose.createConnection(tenantUri, {
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });

  conn.on('error', (err) => {
    console.error(`[Tenant:${label}] Connection error:`, err.message);
  });

  conn.on('connected', () => {
    console.log(`[Tenant:${label}] Connected`);
  });

  tenantConnections.set(cacheKey, conn);
  return conn;
};

/**
 * Register all hospital models on a tenant connection.
 * Models are bound to the specific tenant's database.
 */
const registerTenantModels = (conn) => {
  // Only register if not already registered
  if (!conn.models.User) {
    const User = require('../models/NH_User');
    conn.model('User', User.schema);
  }
  if (!conn.models.Patient) {
    const Patient = require('../models/NH_Patient');
    conn.model('Patient', Patient.schema);
  }
  // Add more models as needed - this is the extension point
  return conn;
};

/**
 * Close all tenant connections (for graceful shutdown).
 */
const closeAllTenantConnections = async () => {
  const promises = [];
  for (const [key, conn] of tenantConnections) {
    console.log(`[Tenant:${key}] Closing connection`);
    promises.push(conn.close());
  }
  await Promise.all(promises);
  tenantConnections.clear();
};

/**
 * Get count of active tenant connections.
 */
const getActiveTenantCount = () => {
  let count = 0;
  for (const [, conn] of tenantConnections) {
    if (conn.readyState === 1) count++;
  }
  return count;
};

/**
 * Generate a safe database name from organization slug.
 */
const generateDbName = (slug) => {
  return `nh_tenant_${slug.replace(/[^a-z0-9_]/g, '_')}`;
};

module.exports = {
  getTenantConnection,
  registerTenantModels,
  closeAllTenantConnections,
  getActiveTenantCount,
  generateDbName,
};
