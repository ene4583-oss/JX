'use strict';
// Phone staff can scan, review the shared queue and correct existing products.
const phoneScanOnly=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
if(phoneScanOnly)document.body.classList.add('phone-scan-only');
const desktopProducts=products,desktopRoute=route,desktopScanProduct=scanProduct,desktopEditProduct=editProduct,desktopPrintList=printList,desktopQr=qr;
function phoneProductCard(p,inQueue=false){
 const card=node('article',undefined,'panel phone-product');card.dataset.productId=p.id;card.append(node('h2',p.name));
 for(const [label,value]of [['Address',p.address],['Type',p.product_type],['Registration',p.details.new_reg||p.details.old_reg],['Brand / Model',[p.brand,p.model].filter(Boolean).join(' / ')],['S/No',p.serial_no]]){const line=node('p');line.append(node('strong',label+': '),node('span',value||'—'));card.append(line);}
 card.append(btn('Edit product',async()=>editProduct(await api('/products/'+encodeURIComponent(p.id)))));
 if(inQueue)card.append(btn('Remove from queue',()=>removeQueue([p.id])));
 else{const queued=selected.has(p.id),connected=!!activeDeviceGroup(),button=btn(queued?'Added to Print':connected?'Add to Print':'Scan pairing QR first',async()=>{add({...p,_queue_old_reg:p.details.new_reg||p.details.old_reg||''});try{await deliverToComputer(p);}finally{await products();}});button.disabled=queued||!connected;card.append(button);}
 return card;
}
products=async function(){if(!phoneScanOnly)return desktopProducts();await loadRecent();const root=$('product-list');root.replaceChildren(...[...recentProducts.values()].reverse().map(p=>phoneProductCard(p)));if(!recentProducts.size)root.append(node('p','Scan a product QR, then tap Add to Print.'));$('customer-list').replaceChildren();$('product-pagination').hidden=true;};
printList=function(){if(!phoneScanOnly)return desktopPrintList();const root=$('print-list');root.replaceChildren(...[...selected.values()].map(p=>phoneProductCard(p,true)));if(!selected.size)root.append(node('p','No products in the queue.'));};
route=async function(){if(phoneScanOnly&&auth?.authenticated){const params=new URLSearchParams(location.hash.slice(1));if(!params.has('product')&&!params.has('pair')&&!params.has('group')&&!['#products','#print'].includes(location.hash))history.replaceState(null,'',location.pathname+location.search+'#products');}return desktopRoute();};
scanProduct=async function(id){if(!phoneScanOnly)return desktopScanProduct(id);const p=await api('/products/'+encodeURIComponent(id));await shareWorkspaceProduct(p);lookupProduct=null;query='';$('product-search').reset();location.hash='products';await route();message('Product loaded. Check the details, edit if needed, then tap Add to Print.');};
editProduct=function(p){if(phoneScanOnly&&!p){message('Use the computer to add new products.');return;}const result=desktopEditProduct(p);if(phoneScanOnly)$('product-form').querySelector('button[type=submit]').textContent='Save changes';return result;};
qr=async function(id){if(!phoneScanOnly)return desktopQr(id);};
const desktopSyncStatus=setSyncStatus;setSyncStatus=function(text,error=false){desktopSyncStatus(text,error);$('mobile-sync-status').textContent=text;};
if(phoneScanOnly){$('products').querySelector('h1').textContent='Products & Scan';$('open-scanner').textContent='Scan QR';$('mobile-scan-help').hidden=false;if(auth?.authenticated&&formats)run(route);}
$('product-dialog').addEventListener('close',()=>{if(phoneScanOnly&&!$('print').hidden)printList();});
