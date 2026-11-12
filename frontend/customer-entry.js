'use strict';
function attachAreaSuggestions(input,list){
 let timer,blurTimer,choosing=false,request=0,values=[],active=-1;
 const close=()=>{list.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');active=-1;};
 const choose=value=>{request++;clearTimeout(timer);input.value=value.toUpperCase();close();choosing=true;input.focus();choosing=false;};
 async function search(){const current=++request,term=input.value.trim();try{const rows=await api('/areas?q='+encodeURIComponent(term),{timeout:8000});if(current!==request||input.value.trim()!==term||!input.closest('dialog').open)return;values=rows;list.replaceChildren();active=-1;rows.forEach((value,index)=>{const button=btn(value,()=>choose(value));button.id=list.id+'-'+index;button.setAttribute('role','option');button.setAttribute('aria-selected','false');list.append(button);});list.hidden=!rows.length;input.setAttribute('aria-expanded',String(!!rows.length));}catch{if(current===request)close();}}
 const schedule=event=>{request++;clearTimeout(timer);close();if(event?.isComposing)return;timer=setTimeout(()=>run(search),150);};
 input.addEventListener('input',schedule);input.addEventListener('compositionend',schedule);input.addEventListener('focus',()=>{clearTimeout(blurTimer);if(!choosing)run(search);});input.addEventListener('blur',()=>{blurTimer=setTimeout(close,150);});
 input.addEventListener('keydown',event=>{if(event.key==='Escape'){close();return;}if(list.hidden)return;if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();const delta=event.key==='ArrowDown'?1:-1;active=active<0?(delta>0?0:values.length-1):(active+delta+values.length)%values.length;for(const [i,option]of [...list.children].entries())option.setAttribute('aria-selected',String(i===active));input.setAttribute('aria-activedescendant',list.children[active].id);list.children[active].scrollIntoView({block:'nearest'});}else if(event.key==='Enter'&&values.length){event.preventDefault();choose(values[active<0?0:active]);}});
 input.form.addEventListener('reset',()=>{request++;clearTimeout(timer);close();list.replaceChildren();});
}
attachAreaSuggestions($('product-form').elements.customer_area,$('product-area-options'));
attachAreaSuggestions($('customer-form').elements.area,$('customer-area-options'));
