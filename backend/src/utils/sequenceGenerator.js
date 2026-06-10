const Counter = require('../models/Counter');

/**
 * Generates a unique sequential ID using atomic counter operations
 * @param {string} counterName - The name of the counter (e.g., 'appointmentId', 'admissionId')
 * @param {string} prefix - The prefix for the ID (e.g., 'APT', 'ADM')
 * @param {number} padLength - The length to pad the number to (default: 6)
 * @returns {Promise<string>} - The generated unique ID
 */
const getNextSequenceValue = async (counterName, prefix, padLength = 6) => {
  try {
    // Use findByIdAndUpdate to atomically increment the counter
    const result = await Counter.findByIdAndUpdate(
      counterName,
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );

    const paddedNumber = String(result.sequence_value).padStart(padLength, '0');
    return `${prefix}${paddedNumber}`;
  } catch (error) {
    console.error(`Error generating ${counterName}:`, error);
    throw new Error(`Failed to generate unique ID for ${counterName}`);
  }
};

module.exports = { getNextSequenceValue };
