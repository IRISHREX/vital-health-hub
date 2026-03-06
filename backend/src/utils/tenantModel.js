const getModel = (req, modelName, baseModel) => {
  if (!baseModel || !baseModel.schema) {
    throw new Error(`Base model with schema is required for ${modelName}`);
  }

  const conn = req?.tenantConn || req?.tenantConnection || null;
  if (!conn) return baseModel;

  return conn.models[modelName] || conn.model(modelName, baseModel.schema);
};

module.exports = { getModel };

