const { ModuleOperationsSettings } = require('../models/NH_Settings');

const MODULE_KEYS = ['pathology', 'radiology', 'pharmacy'];

const DEFAULT_MODULE_CONFIG = {
  enabled: true,
  runIndependently: true,
  integrateWithHospitalCore: true,
  allowExternalWalkIns: true,
  externalBillingEnabled: true,
  trackExternalBillingSeparately: true
};

const DEFAULT_SETTINGS = {
  deploymentMode: 'hybrid',
  modules: {
    pathology: { ...DEFAULT_MODULE_CONFIG },
    radiology: { ...DEFAULT_MODULE_CONFIG },
    pharmacy: { ...DEFAULT_MODULE_CONFIG }
  },
  userOverrides: []
};

const boolOrDefault = (value, fallback) => {
  if (value === undefined || value === null) return fallback;
  return !!value;
};

const sanitizeModuleConfig = (input = {}, fallback = DEFAULT_MODULE_CONFIG) => ({
  enabled: boolOrDefault(input.enabled, fallback.enabled),
  runIndependently: boolOrDefault(input.runIndependently, fallback.runIndependently),
  integrateWithHospitalCore: boolOrDefault(input.integrateWithHospitalCore, fallback.integrateWithHospitalCore),
  allowExternalWalkIns: boolOrDefault(input.allowExternalWalkIns, fallback.allowExternalWalkIns),
  externalBillingEnabled: boolOrDefault(input.externalBillingEnabled, fallback.externalBillingEnabled),
  trackExternalBillingSeparately: boolOrDefault(
    input.trackExternalBillingSeparately,
    fallback.trackExternalBillingSeparately
  )
});

const sanitizeSettingsPayload = (payload = {}, fallback = DEFAULT_SETTINGS) => {
  const deploymentMode = ['integrated', 'independent', 'hybrid'].includes(payload.deploymentMode)
    ? payload.deploymentMode
    : fallback.deploymentMode;

  const modules = {};
  for (const moduleKey of MODULE_KEYS) {
    modules[moduleKey] = sanitizeModuleConfig(
      payload.modules?.[moduleKey],
      fallback.modules?.[moduleKey] || DEFAULT_MODULE_CONFIG
    );
  }

  const userOverrides = Array.isArray(payload.userOverrides)
    ? payload.userOverrides
      .filter((entry) => entry?.user)
      .map((entry) => {
        const moduleSettings = {};
        for (const moduleKey of MODULE_KEYS) {
          if (entry.modules?.[moduleKey]) {
            moduleSettings[moduleKey] = sanitizeModuleConfig(
              entry.modules[moduleKey],
              modules[moduleKey]
            );
          }
        }
        return {
          user: entry.user,
          modules: moduleSettings
        };
      })
    : fallback.userOverrides;

  return {
    deploymentMode,
    modules,
    userOverrides
  };
};

const getOrCreateModuleOperationsSettings = async () => {
  let settings = await ModuleOperationsSettings.findOne();
  if (!settings) {
    settings = await ModuleOperationsSettings.create(DEFAULT_SETTINGS);
  }
  return settings;
};

const getEffectiveModuleConfig = async ({ moduleKey, userId }) => {
  if (!MODULE_KEYS.includes(moduleKey)) {
    throw new Error(`Unsupported module key: ${moduleKey}`);
  }

  const settings = await getOrCreateModuleOperationsSettings();
  const base = {
    ...DEFAULT_MODULE_CONFIG,
    ...(settings.modules?.[moduleKey] || {})
  };

  const userOverride = (settings.userOverrides || []).find(
    (entry) => String(entry?.user) === String(userId)
  );

  const overrideConfig = userOverride?.modules?.[moduleKey] || {};
  return {
    ...base,
    ...overrideConfig,
    deploymentMode: settings.deploymentMode
  };
};

module.exports = {
  MODULE_KEYS,
  DEFAULT_MODULE_CONFIG,
  DEFAULT_SETTINGS,
  sanitizeModuleConfig,
  sanitizeSettingsPayload,
  getOrCreateModuleOperationsSettings,
  getEffectiveModuleConfig
};
