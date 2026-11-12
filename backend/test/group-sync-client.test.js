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
  location:{hash:'',pathname:'/',search:'',origin:'http://test'},history:{replaceState(){}},
  localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},
  document:{addEventListener(){}},window:{addEventListener(){}},
  $:key=>{if(!elements.has(key))elements.set(key,{onclick(){},textContent:''});return elements.get(key);},
  auth:{authenticated:false,user:{id:'employee'}},formats:null,newRequestId:()=>crypto.randomUUID(),
  setSyncStatus(){},handleScan(){},renderConnectedDevices(){},phonePair(){},phoneState(){},loadPairs(){},
  startDevicePresence(){},stopDevicePresence(){},pollSharedQueue(){},queueConnection(){},publishQueue(){},checkDelivery(){},deliverToComputer(){}});
 vm.runInContext(source,context);
 vm.runInContext("auth.authenticated=true;deviceGroup={id:'group',member_id:'device',token:'secret',user:'employee'}",context);
 return {context,storage,run:code=>vm.runInContext(code,context)};
}
test('device outbox survives reload and replays the original request ID',async()=>{
 const first=runtime();first.context.transport=async()=>{throw Error('offline');};first.run('groupCall=transport');
 await assert.rejects(first.run("sendGroupEvent('queue_add',['product'])"),/offline/);
 const saved=JSON.parse([...first.storage.values()][0]);assert.equal(saved.length,1);assert.equal(saved[0].kind,'queue_add');
 const restored=runtime(first.storage),sent=[];restored.context.transport=async(method,input)=>{sent.push(input);return {event_id:7};};restored.run('groupCall=transport');
 await restored.run('flushGroupOutbox(activeDeviceGroup())');assert.equal(sent.length,1);assert.equal(sent[0].request_id,saved[0].request_id);assert.equal(restored.run('groupOutbox(activeDeviceGroup()).length'),0);
});
test('lost response retries idempotently rather than creating a fresh action',async()=>{
 const app=runtime(),committed=new Set(),requests=[];let lose=true;
 app.context.transport=async(method,input)=>{requests.push(input.request_id);committed.add(input.request_id);if(lose){lose=false;throw Error('response lost');}return {event_id:8};};app.run('groupCall=transport');
 await assert.rejects(app.run("sendGroupEvent('queue_complete',['product'])"),/response lost/);
 await app.run('flushGroupOutbox(activeDeviceGroup())');assert.equal(requests.length,2);assert.equal(requests[0],requests[1]);assert.equal(committed.size,1);
});
test('offline actions preserve add/remove ordering on reconnection',async()=>{
 const app=runtime(),delivered=[];let online=false;
 app.context.transport=async(method,input)=>{if(!online)throw Error('offline');delivered.push(input.kind);return {event_id:delivered.length};};app.run('groupCall=transport');
 await assert.rejects(app.run("sendGroupEvent('queue_add',['product'])"));
 await assert.rejects(app.run("sendGroupEvent('queue_remove',['product'])"));
 online=true;await app.run('flushGroupOutbox(activeDeviceGroup())');assert.deepEqual(delivered,['queue_add','queue_remove']);assert.equal(app.run('groupOutbox(activeDeviceGroup()).length'),0);
});
test('a rejected product does not block later valid shared actions',async()=>{
 const app=runtime(),delivered=[];
 app.context.transport=async(method,input)=>{if(input.product_ids[0]==='deleted'){const error=Error('Product removed');error.status=404;throw error;}delivered.push(input.kind);return {event_id:9};};app.run('groupCall=transport');
 await assert.rejects(app.run("sendGroupEvent('queue_add',['deleted'])"),/Product removed/);
 await app.run("sendGroupEvent('seen',['valid'])");assert.deepEqual(delivered,['seen']);assert.equal(app.run('groupOutbox(activeDeviceGroup()).length'),0);
});
