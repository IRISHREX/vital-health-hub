const CounterBase = require('../models/Counter');
const { getModel } = require('./tenantModel');

/**
 * Tenant-aware atomic sequence generator.
 * Returns e.g. BR000123 for ('BR', 'birthRecord').
 */
const nextTenantSequence = async (req, counterName, prefix, padLength = 6) => {
  const Counter = getModel(req, 'Counter', CounterBase);
  const result = await Counter.findByIdAndUpdate(
    counterName,
    { $inc: { sequence_value: 1 } },
    { new: true, upsert: true }
  );
  return `${prefix}${String(result.sequence_value).padStart(padLength, '0')}`;
};

module.exports = { nextTenantSequence };
