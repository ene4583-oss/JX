'use strict';
const companies = ['DE', 'MCM'];
const types = ['ATN', 'ATS', 'ATP', 'ATE', 'SLL', 'SLC', 'ATL', 'BTU', 'ATP (M)'];
const details = {
  shop_out:'Shop/Out', stamping_fee:'Penentusahan fee', capacity:'Had Terima', manufacturer:'Nama Pembuat', interval:'Senggatan',
  new_reg:'No. Daftar Baru', old_reg:'No. Daftar Lama', last_reg:'No. Penentusahan Terakhir',
  last_date:'Tarikh Penentusahan Terakhir', last_branch:'Cawangan Penentusahan Terakhir', condition:'Keadaan Alat',
  usage:'Kegunaan Alat', instrument_kind:'Jenis Alat', tray:'Bentuk Dulang',
  indicator:'Jenis Penunjuk', material:'Jenis Bahan', shape:'Bentuk', steelyard_capacity:'Had Terima Steelyard',
  counterpoise_count:'Bilangan Kaunterpois', counterpoise_weights:'Nilai Berat Kaunterpois (kg)', notes:'Catatan Dalaman (Tidak Dicetak)'
};
for(let i=1;i<=8;i++)details['check_'+i]='Pemeriksaan '+i+' (Ya / Tidak)';
const layouts=require('../assets/templates/layouts.json');
const formFields=Object.fromEntries(types.map(type=>[type,[...new Set(companies.flatMap(company=>{const spec=layouts[company+'/'+type];return [...Object.keys(spec.fields).filter(key=>Object.hasOwn(details,key)),...spec.checks.map(check=>check.key)];}))]]));
const formOptions=Object.fromEntries(types.map(type=>{const values={};for(const company of companies)for(const item of layouts[company+'/'+type].checks)values[item.key]=[...new Set([...(values[item.key]||[]),...Object.keys(item.options)])];return [type,values];}));
function normalize(value) {
  const type = String(value ?? '').trim().toUpperCase();
  return type === 'SIC' ? 'SLC' : ['ATP_M', 'ATP(M)'].includes(type) ? 'ATP (M)' : type;
}
const valid = (company, type) => companies.includes(company) && types.includes(type);
module.exports = { companies, types, details, formFields, formOptions, normalize, valid };
