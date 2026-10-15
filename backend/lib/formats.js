'use strict';
const companies = ['DE', 'MCM'];
const types = ['ATN', 'ATS', 'ATP', 'ATE', 'SLL', 'SLC', 'ATL', 'BTU', 'ATP (M)'];
const details = {
  shop_out:'Shop/Out', stamping_fee:'Default Stamping Fee (List Format only)', capacity: 'Capacity', manufacturer: 'Manufacturer', interval: 'Interval',
  new_reg: 'New registration', old_reg: 'Old registration', last_reg: 'Last verification number (blank uses new registration)',
  last_date: 'Last verification date', last_branch: 'Last verification branch', condition: 'Condition (B/L)',
  usage: 'Usage', instrument_kind: 'Instrument type', tray: 'Tray type',
  indicator: 'Indicator', material: 'Material', shape: 'Shape', steelyard_capacity: 'Steelyard capacity',
  counterpoise_count: 'Counterpoise count', counterpoise_weights: 'Counterpoise weights (one per line)', notes: 'Internal notes (not printed)'
};
for (let i = 1; i <= 8; i++) details['check_' + i] = 'Inspection item ' + i + ' / Yes, No or blank';
function normalize(value) {
  const type = String(value ?? '').trim().toUpperCase();
  return type === 'SIC' ? 'SLC' : ['ATP_M', 'ATP(M)'].includes(type) ? 'ATP (M)' : type;
}
const valid = (company, type) => companies.includes(company) && types.includes(type);
module.exports = { companies, types, details, normalize, valid };
