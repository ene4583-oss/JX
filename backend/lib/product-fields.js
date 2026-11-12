'use strict';
function shopOut(value){return ['S','SHOP','KEDAI'].includes(String(value??'').trim().toUpperCase())?'S':'O';}
module.exports={shopOut};
