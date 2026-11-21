'use strict';
const {check}=require('./util');
const detail=key=>"JSON_UNQUOTE(JSON_EXTRACT(p.details,'$."+key+"'))";
const nonempty=value=>"NULLIF(TRIM("+value+"),'')";
function numeric(value){const cleaned="REPLACE(TRIM(COALESCE("+value+",'')),',','')";return "CASE WHEN "+cleaned+" REGEXP '^[+-]?([0-9]+|[.][0-9]+)' THEN CAST("+cleaned+" AS DECIMAL(20,6)) ELSE NULL END";}
const fields={name:'c.name',address:nonempty('c.address'),area:nonempty('c.area'),type:'p.product_type',condition:"CASE WHEN UPPER("+detail('condition')+") IN ('B','BARU') THEN 'B' WHEN UPPER("+detail('condition')+") IN ('L','LAMA') THEN 'L' ELSE NULL END",brand:'p.brand',model:nonempty('p.model'),serial:nonempty('p.serial_no'),capacity:numeric(detail('capacity')),old_reg:"COALESCE("+nonempty(detail('new_reg'))+','+nonempty(detail('old_reg'))+')',new_reg:nonempty('qd.new_reg'),shop_out:"CASE WHEN UPPER("+detail('shop_out')+") IN ('S','SHOP','KEDAI') THEN 'S' ELSE 'O' END",fee:numeric(detail('stamping_fee')),created_at:'p.created_at',saved_at:'p.updated_at',sequence:'p.updated_at'};
function orderBy(key='sequence',direction='asc'){check(Object.hasOwn(fields,key),'Invalid product sort column.');check(['asc','desc'].includes(direction),'Invalid product sort direction.');const expression=fields[key];return 'FLOOR((UNIX_TIMESTAMP(p.updated_at)+28800)/86400) ASC, '+ '('+expression+') IS NULL ASC, '+expression+' '+direction.toUpperCase()+', c.name ASC, p.id ASC';}
module.exports={fields,orderBy};
