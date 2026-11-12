'use strict';
const bcrypt=require('bcryptjs'),{createHash}=require('node:crypto');
const digest=value=>createHash('sha256').update(value,'utf8').digest('base64');
async function encode(value){return Buffer.byteLength(value,'utf8')>72?'{bcrypt-sha256}'+await bcrypt.hash(digest(value),12):'{bcrypt}'+await bcrypt.hash(value,12);}
async function verify(value,stored){const prehashed=stored.startsWith('{bcrypt-sha256}'),encoded=prehashed?stored.slice(15):stored.startsWith('{bcrypt}')?stored.slice(8):stored;return bcrypt.compare(prehashed?digest(value):value,encoded.startsWith('$2')?encoded:'$2b$12$QhNt6bEd2Skv4Lp7tV7ySOrBN0KD5ClY8VHtCQOpmkCE1aQh2Z0fG');}
module.exports={encode,verify};
