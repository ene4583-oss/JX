'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');const {lanUrls,phoneUrl,allowedOrigin}=require('../lib/network');
test('QR network discovery selects private IPv4 only, while public HTTPS remains authoritative',()=>{
 const entries={wifi:[{family:'IPv4',address:'192.168.1.12',internal:false},{family:'IPv4',address:'127.0.0.1',internal:true},{family:'IPv4',address:'8.8.8.8',internal:false}]};assert.deepEqual(lanUrls(3000,entries),['http://192.168.1.12:3000']);
 const production={production:true,port:3000,publicUrl:'https://jx.example.com'};assert.equal(phoneUrl(production),production.publicUrl);assert.equal(allowedOrigin(production,'http://localhost:3000'),false);assert.equal(allowedOrigin(production,'https://other.example.com'),false);assert.equal(allowedOrigin(production,production.publicUrl),true);
 assert.equal(allowedOrigin({...production,production:false},'http://127.0.0.1:3000'),true);
});
