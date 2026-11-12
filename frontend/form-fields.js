'use strict';
// Labels follow the printed forms; storage keys and PDF checkbox values stay stable.
const bmBaseLabels={name:'Nama Tuan Punya',address:'Alamat Tuan Punya',area:'Kawasan',phone:'No. Telefon',brand:'Jenama',model:'No. Model',serial_no:'No. Siri',product_type:'Jenis Borang',_list_stamping_fee:'Penentusahan fee',_list_sticker_no:'No. Siri Pelekat Keselamatan'};
const removedFormFields=new Set(['manufacturer','last_date','notes','last_branch']);
function normalizeShopOut(value){return ['S','SHOP','KEDAI'].includes(String(value??'').trim().toUpperCase())?'S':'O';}
function formDetailKeys(type,printing=false){const keys=new Set(['capacity','old_reg','stamping_fee','shop_out','condition',...(formats.form_fields?.[type]||[])]);for(const key of removedFormFields)keys.delete(key);if(printing)keys.add('new_reg');else keys.delete('new_reg');return keys;}
function malayChoice(key,title,values,current=''){const box=radioField(key,title,values.map(v=>[v,key==='condition'?(v==='Baru'?'Baru (B)':'Lama (L)'):v]),current);box.dataset.formDetail=key;return box;}
function detailControl(key,title,current=''){
 if(key==='counterpoise_weights')return counterpoiseFields(title,current);
 if(key==='usage')return malayChoice(key,title,['Perdagangan','Bukan Perdagangan'],current);
 if(key==='condition')return malayChoice(key,title,['Baru','Lama'],current);
 if(key==='shop_out')return malayChoice(key,'Shop/Out',['S','O'],normalizeShopOut(current));
 const wrap=node('label',title);wrap.dataset.formDetail=key;let input;
 const values=key.startsWith('check_')?['Ya','Tidak']:key==='instrument_kind'?null:options[key];
 if(values){input=node('select');input.append(new Option('Tidak diisi',''),...values.map(value=>new Option(value,value)));if(current&&!values.includes(current))input.append(new Option('Nilai tersimpan: '+current,current));}
 else{input=node(['notes','counterpoise_weights'].includes(key)?'textarea':'input');input.maxLength=key==='notes'?1000:key==='stamping_fee'?20:200;if(key==='stamping_fee'){input.type='number';input.min='0';input.step='.01';}}
 input.name='detail_'+key;input.setAttribute('aria-label',title);input.value=current;wrap.append(input);return wrap;
}
function arrangeFormFields(form){
 const root=form.getAttribute('id')==='product-form'?$('detail-fields'):$('print-product-fields');
 const wrappers=[...root.querySelectorAll('[data-form-detail],[data-atn-choice],[data-print-option]')];
 const priority=['old_reg','new_reg','capacity','interval','steelyard_capacity','counterpoise_count','counterpoise_weights','indicator','material','shape'];
 const order=wrap=>{const key=wrap.dataset.formDetail||wrap.dataset.atnChoice;const i=priority.indexOf(key);return i<0?100:i;};
 const temp=document.createDocumentFragment();for(const wrap of wrappers)temp.append(wrap);for(const old of root.querySelectorAll('.form-measurements,.form-options'))old.remove();
 wrappers.sort((a,b)=>order(a)-order(b));for(const wrap of wrappers)root.append(wrap);
 const capacity=wrappers.find(w=>w.dataset.formDetail==='capacity'),interval=wrappers.find(w=>w.dataset.formDetail==='interval');
 if(capacity&&interval){const pair=node('div',undefined,'form-measurements wide');root.insertBefore(pair,capacity);pair.append(capacity,interval);pair.classList.toggle('single-measurement',interval.hidden);}
 const group=node('div',undefined,'form-options grid wide');for(const key of ['condition','usage','instrument_kind','tray','shop_out','stamping_fee'])for(const wrap of wrappers)if((wrap.dataset.formDetail||wrap.dataset.atnChoice)===key)group.append(wrap);
 for(const wrap of wrappers)if(wrap.dataset.printOption)group.append(wrap);root.append(group);
}
function refreshProductFormFields(){const type=$('product-form').elements.product_type.value,keys=formDetailKeys(type);for(const wrap of $('product-form').querySelectorAll('[data-form-detail]')){const key=wrap.dataset.formDetail,visible=keys.has(key)&&!(type==='ATN'&&['instrument_kind','tray'].includes(key));wrap.hidden=!visible;refreshFieldTitle(wrap,key,type);for(const input of wrap.querySelectorAll('input,select,textarea'))input.disabled=!visible;}arrangeFormFields($('product-form'));}
detailsForm=function(){const f=$('product-form');f.elements.product_type.replaceChildren(...['',...formats.types].map(type=>new Option(type||'Pilih jenis borang',type)));$('detail-fields').replaceChildren();$('advanced-fields').replaceChildren();for(const [key,title]of Object.entries(formats.details))$('detail-fields').append(detailControl(key,title));f.querySelector('details').hidden=true;f.elements.product_type.onchange=refreshProductFormFields;refreshProductFormFields();};
const bmEditProduct=editProduct;editProduct=function(p){bmEditProduct(p);for(const [key,title]of Object.entries(formats.details)){const old=$('product-form').querySelector('[data-form-detail="'+key+'"]');if(old)old.replaceWith(detailControl(key,title,key==='old_reg'?(p?.details.new_reg||p?.details.old_reg||''):p?.details?.[key]||''));}$('product-title').textContent=p?'Edit Product':'Add Product';refreshProductFormFields();$('product-dialog').scrollTop=0;};
function applyPrintFormFields(){const f=$('print-product-form'),keys=formDetailKeys(f.elements.product_type.value,true);for(const wrap of f.querySelectorAll('[data-form-detail],[data-atn-choice]')){const key=wrap.dataset.formDetail||wrap.dataset.atnChoice,visible=keys.has(key);wrap.hidden=!visible;refreshFieldTitle(wrap,key,f.elements.product_type.value);for(const input of wrap.querySelectorAll('input,select,textarea'))input.disabled=!visible;}arrangeFormFields(f);}
const bmEditPrintProduct=editPrintProduct;editPrintProduct=function(p){bmEditPrintProduct(p);const f=$('print-product-form');for(const [key,title]of Object.entries(bmBaseLabels)){const input=f.elements.namedItem(key);if(input){input.parentElement.firstChild.textContent=title;input.setAttribute('aria-label',title);if(key==='_list_stamping_fee')input.parentElement.dataset.formDetail='stamping_fee';if(key==='_list_sticker_no')input.parentElement.dataset.printOption='sticker';}}
 for(const [key,title]of Object.entries(formats.details)){const input=f.elements.namedItem('detail_'+key);if(input){const value=key==='new_reg'&&!editingJobId?(productOverrides.get(p.id)?.details?.new_reg??''):key==='old_reg'&&!editingJobId?(p.details.new_reg||p.details.old_reg||''):p.details[key]??input.value??'';input.closest('label').replaceWith(detailControl(key,title,value));}}applyPrintFormFields();f.elements.product_type.onchange=applyPrintFormFields;};
const inspectionQuestions={SLL:[
 '1. Adakah sukat linar diperbuat daripada keluli, tembaga, pancalogam aluminium, ivory, bakelit berlapis, kaca gentian yang diperkukuhkan, kayu kekeras atau bahan lain yang diluluskan oleh Penyimpan Timbang & Sukat?',
 '2. Adakah sukat linar lurus dan tiada kecacatan?',
 '3. Adakah kedua-dua hujung sukat linar kayu dibubuh logam dan dipaku menembusi kayu?',
 '4. Adakah senggatan jelas, tidak boleh dipadam, dan senggatan bernombor lebih panjang?',
 '5.1 Adakah sukat linar fabrik disenggat dengan jelas dan tidak boleh dipadam dalam sentimeter pada satu belah dan sukuan meter di sebelah belakang, dengan senggatan bernombor lebih panjang daripada senggatan tidak bernombor?',
 '5.2 Adakah panjang sukat itu 1 m (satu meter)?',
 '6. Adakah nilai jangkaan maksimum mudah dilihat, dibaca dan tidak boleh dipadam?',
 '7. Adakah sukat linar ditanda dengan cap dekat permukaan skel pada setiap tepi bersenggat?'
 ],ATL:[
 '1. Adakah beam diperbuat daripada bahan yang tahan lama?',
 '2. Adakah beam lurus, tidak cacat dan tidak bercorak?',
 '3. Adakah talam berbentuk bulat dan diperbuat daripada tembaga?',
 '4. Adakah kaunterpois diperbuat daripada tembaga?',
 '5. Adakah tali penggantung talam dan batu timbang kaunterpois diperbuat daripada bahan tahan lama?',
 '6. Adakah tali fulkrum tidak melebihi tiga utas dan diperbuat daripada benang halus tahan lama?',
 '7. Adakah senggatan ditanda dengan titik hitam yang tertanam dalam beam?',
 '8. Adakah semua senggatan pada alat mudah dibaca?'
 ]};
function formFieldTitle(key,type){if(key.startsWith('check_'))return inspectionQuestions[type]?.[Number(key.slice(6))-1]||formats.details[key];if(type==='SLL')return ({capacity:'Nilai Jangkaan',condition:'Kategori Alat',material:'Jenis Alat'})[key]||formats.details[key];if(type==='ATL'&&key==='capacity')return 'Kapasiti';return formats.details[key];}
function refreshFieldTitle(wrap,key,type){const select=wrap.querySelector('select'),values=formats.form_options?.[type]?.[key];if(select&&values&&['material','shape','indicator'].includes(key)){const current=select.value;select.replaceChildren(new Option('Tidak diisi',''),...values.map(value=>new Option(value,value)));if(current&&!values.includes(current))select.append(new Option('Nilai tersimpan: '+current,current));select.value=current;}const title=formFieldTitle(key,type);if(!title)return;const legend=wrap.querySelector('legend');if(legend)legend.textContent=title;else if(wrap.firstChild?.nodeType===Node.TEXT_NODE)wrap.firstChild.textContent=title;for(const input of wrap.querySelectorAll('input,select,textarea'))input.setAttribute('aria-label',input.dataset.counterpoiseRow?title+' ('+input.dataset.counterpoiseRow+')':input.type==='radio'?title+': '+input.closest('label').textContent:title);if(key.startsWith('check_'))wrap.classList.add('wide');}

function counterpoiseFields(title,current=''){
 const box=node('fieldset',undefined,'counterpoise-fields wide');box.dataset.formDetail='counterpoise_weights';box.append(node('legend',title));const stored=node('input');stored.type='hidden';stored.name='detail_counterpoise_weights';stored.value=current;box.append(stored);const rows=String(current).replace(/\r\n?/g,'\n').split('\n'),grid=node('div',undefined,'counterpoise-grid'),inputs=[];
 for(let i=0;i<6;i++){const label=node('label','('+(i+1)+') kg'),input=node('input');input.type='text';input.inputMode='decimal';input.maxLength=30;input.value=rows[i]||'';input.dataset.counterpoiseRow=String(i+1);input.setAttribute('aria-label',title+' ('+(i+1)+')');input.oninput=()=>{stored.value=inputs.map(el=>el.value.trim()).join('\n').replace(/\n+$/,'');};inputs.push(input);label.append(input);grid.append(label);}box.append(grid);if(rows.length>6){box.append(node('p','Rekod lama mengandungi lebih daripada 6 baris. Semak nilai asal sebelum mengemaskini.'));const original=node('details');original.append(node('summary','Nilai asal'),node('pre',current));box.append(original);}return box;
}
