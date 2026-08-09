// Re-exports the on-duty check from the roster controller so other
// controllers (e.g. appointments) can import it without a require cycle.
const { isEmployeeOnDuty, isDoctorOnDuty } = require('../controllers/NH_hrmsRosterController');

module.exports = { isEmployeeOnDuty, isDoctorOnDuty };
