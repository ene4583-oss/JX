'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../../frontend/group-sync.js'),'utf8');
function runtime(storage=new Map()){
 const elements=new Map();
 const context=vm.createContext({URLSearchParams,URL,Map,Set,Promise,Error,JSON,setTimeout,clearTimeout,
  lastDelivery:null,location:{hash:'',pathname:'/',search:'',origin:'http://test'},history:{replaceState(){}},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{addEventListener(){}},window:{addEventListener(){}},
  $:key=>{if(!elements.has(key))elements.set(key,{onclick(){},textContent:''});return elements.get(key);},
  auth:{authenticated:false,user:{id:'employee'}},formats:null,api:async()=>({}),newRequestId:()=>crypto.randomUUID(),
  setSyncStatus(){},handleScan(){},renderConnectedDevices(){},phonePair(){},phoneState(){},loadPairs(){},
  startDevicePresence(){},stopDevicePresence(){},pollSharedQueue(){},queueConnection(){},publishQueue(){},checkDelivery(){},deliverToComputer(){}});
 vm.runInContext(source,context);
 vm.runInContext("auth.authenticated=true;deviceGroup={id:'group',member_id:'device',token:'secret',user:'employee',hydrated:true}",context);
 return {context,storage,run:code=>vm.runInContext(code,context)};
}
test('offline publish pauses the device and drops old operations instead of replaying them',async()=>{
 const app=runtime();app.run("stopGroupSync=()=>{};saveDeviceGroup=()=>{};showReconnect=()=>{}");app.context.transport=async()=>{throw Error('offline');};app.run('groupCall=transport');
 await assert.rejects(app.run("sendGroupEvent('queue_add',['product'])"),/offline/);assert.equal(app.run('activeDeviceGroup().suspended'),true);assert.equal(app.run('groupOutbox(activeDeviceGroup()).length'),0);
 await assert.rejects(app.run("sendGroupEvent('queue_remove',['product'])"),/Reconnect/);
});
test('lost publish response never replays an old action after a disconnect',async()=>{
 const app=runtime(),sent=[];app.run("stopGroupSync=()=>{};saveDeviceGroup=()=>{};showReconnect=()=>{}");app.context.transport=async(method,input)=>{sent.push(input.request_id);throw Error('response lost');};app.run('groupCall=transport');
 await assert.rejects(app.run("sendGroupEvent('queue_complete',['product'])"));app.run('activeDeviceGroup().suspended=false;activeDeviceGroup().hydrated=true');await app.run('flushGroupOutbox(activeDeviceGroup())');assert.equal(sent.length,1);
});
test('joining an existing host discards the device list and never merges it into the host',async()=>{
 const app=runtime();app.context.recentProducts=new Map([['stale',{}]]);app.context.selected=new Map([['stale',{}]]);app.run("stopGroupSync=()=>{};saveDeviceGroup=()=>{};phoneState=()=>{};pollDeviceGroup=async()=>{deviceGroup.hydrated=true};mergeWorkspaceIntoGroup=async()=>{throw Error('Must not merge')}");await app.run("installDeviceGroup({id:'host',member_id:'device',token:'secret'})");assert.equal(app.run('activeDeviceGroup().id'),'host');
});
test('disconnected devices block product edits until reconnection',async()=>{const app=runtime();app.run('activeDeviceGroup().suspended=true');await assert.rejects(app.run("api('/products/one',{method:'PUT',body:{brand:'STALE'}})"),/Reconnect/);});
test('a rejected product does not block later valid shared actions',async()=>{
 const app=runtime(),delivered=[];
 app.context.transport=async(method,input)=>{if(input.product_ids[0]==='deleted'){const error=Error('Product removed');error.status=404;throw error;}delivered.push(input.kind);return {event_id:9};};app.run('groupCall=transport');
 await assert.rejects(app.run("sendGroupEvent('queue_add',['deleted'])"),/Product removed/);
 await app.run("sendGroupEvent('seen',['valid'])");assert.deepEqual(delivered,['seen']);assert.equal(app.run('groupOutbox(activeDeviceGroup()).length'),0);
});
test('shared customer updates refresh related products while preserving unsaved corrections',()=>{
 const app=runtime();app.context.recentProducts=new Map([['one',{customer_id:'customer',name:'Old'}],['two',{customer_id:'customer',name:'Old'}]]);
 app.context.selected=new Map([['one',{customer_id:'customer',name:'Old',customer_version:1}],['two',{customer_id:'customer',name:'Draft',customer_version:1}]]);
 app.context.productOverrides=new Map([['two',{name:'Draft'}]]);app.context.chosenFormCustomer={id:'customer',version:1};
 app.run("refreshSharedCustomerCaches({customer_id:'customer',name:'New',address:'New road',area:'RAUB',phone:'0123',customer_version:2})");
 assert.equal(app.context.recentProducts.get('two').name,'New');assert.equal(app.context.selected.get('one').customer_version,2);assert.equal(app.context.selected.get('two').name,'Draft');assert.equal(app.context.selected.get('two').customer_version,1);assert.equal(app.context.chosenFormCustomer.version,1);
});
test('late group responses cannot replace newer autosaved product or customer data',()=>{
 const app=runtime();app.context.selected=new Map([['one',{id:'one',version:3,customer_version:2,name:'Latest owner',address:'Latest road',details:{stamping_fee:'20'}}]]);app.context.recentProducts=new Map();
 const old=app.run("freshGroupProduct({id:'one',version:2,customer_version:1,name:'Old owner',details:{stamping_fee:'10'}})");assert.equal(old.version,3);assert.equal(old.details.stamping_fee,'20');
 const owner=app.run("freshGroupProduct({id:'one',version:3,customer_version:1,name:'Old owner',details:{stamping_fee:'20'}})");assert.equal(owner.name,'Latest owner');assert.equal(owner.customer_version,2);
});

test('a product reassigned to another Kawasan keeps its new customer even when the old customer version was higher',()=>{const app=runtime();app.context.selected=new Map([['one',{id:'one',customer_id:'old',version:3,customer_version:9,name:'OWNER',address:'ROAD',area:'RAUB'}]]);app.context.recentProducts=new Map();const incoming=app.run("freshGroupProduct({id:'one',customer_id:'new',version:4,customer_version:0,name:'OWNER',address:'ROAD',area:'BENTONG'})");assert.equal(incoming.customer_id,'new');assert.equal(incoming.area,'BENTONG');assert.equal(incoming.customer_version,0);});
