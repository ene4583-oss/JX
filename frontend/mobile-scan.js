'use strict';
// Phone UI is intentionally limited to scanning and adding existing products to the shared queue.
const phoneScanOnly=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
if(phoneScanOnly)document.body.classList.add('phone-scan-only');
const desktopProducts=products,desktopRoute=route,desktopScanProduct=scanProduct,desktopEditProduct=editProduct;
products=async function(){if(!phoneScanOnly)return desktopProducts();await loadRecent();const root=$('product-list');root.replaceChildren();for(const p of [...recentProducts.values()].reverse()){
 const card=node('article',undefined,'panel phone-product');card.dataset.productId=p.id;card.append(node('h2',p.name));
 for(const [label,value]of [['Address',p.address],['Type',p.product_type],['Registration',p.details.new_reg||p.details.old_reg],['Brand / Model',[p.brand,p.model].filter(Boolean).join(' / ')],['S/No',p.serial_no]]){const line=node('p');line.append(node('strong',label+': '),node('span',value||'—'));card.append(line);}
 const queued=selected.has(p.id),connected=!!activeDeviceGroup(),button=btn(queued?'Added to Print':connected?'Add to Print':'Scan pairing QR first',async()=>{add({...p,_queue_old_reg:p.details.new_reg||p.details.old_reg||''});try{await deliverToComputer(p);}finally{await products();}});button.disabled=queued||!connected;card.append(button);root.append(card);
 }if(!recentProducts.size)root.append(node('p','Scan a product QR, then tap Add to Print.'));$('customer-list').replaceChildren();$('product-pagination').hidden=true;};
route=async function(){if(phoneScanOnly&&auth?.authenticated){const params=new URLSearchParams(location.hash.slice(1));if(!params.has('product')&&!params.has('pair')&&!params.has('group'))history.replaceState(null,'',location.pathname+location.search+'#products');}return desktopRoute();};
scanProduct=async function(id){if(!phoneScanOnly)return desktopScanProduct(id);const p=await api('/products/'+encodeURIComponent(id));await shareWorkspaceProduct(p);lookupProduct=null;query='';$('product-search').reset();location.hash='products';await route();message('Product loaded. Tap Add to Print.');};
editProduct=function(p){if(phoneScanOnly){message('Use the computer to add or edit products.');return;}return desktopEditProduct(p);};
const desktopSyncStatus=setSyncStatus;setSyncStatus=function(text,error=false){desktopSyncStatus(text,error);$('mobile-sync-status').textContent=text;};
if(phoneScanOnly){$('products').querySelector('h1').textContent='Scan & Add to Print';$('open-scanner').textContent='Scan QR';$('mobile-scan-help').hidden=false;if(auth?.authenticated&&formats)run(route);}
