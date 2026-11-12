'use strict';
const {text,check}=require('./util');
// Blank numbered rows are meaningful; ordinary text trimming would move row (2) into row (1).
function detailText(input,key,max){if(key!=='counterpoise_weights')return text(input,key,max);text(input,key,max);const value=String(input?.[key]??'').replace(/\r\n?/g,'\n').split('\n').map(row=>row.trim()).join('\n').replace(/\n+$/,'');check(value.length<=max,'Nilai Berat Kaunterpois terlalu panjang.');return value;}
module.exports={detailText};
