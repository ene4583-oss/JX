'use strict';
const {hash,normalized}=require('./util');
const identity=c=>hash([normalized(c.name||''),normalized(c.address||''),normalized(c.area||'')].join('\n'));
const sql=field=>"CAST(UPPER(REGEXP_REPLACE(TRIM("+field+"),'[[:space:]]+',' ')) AS BINARY)";
module.exports={identity,sql};
