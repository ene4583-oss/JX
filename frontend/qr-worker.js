'use strict';
importScripts('/vendor/jsQR.js');
self.onmessage=({data})=>{try{const result=jsQR(new Uint8ClampedArray(data.pixels),data.width,data.height,{inversionAttempts:'attemptBoth'});self.postMessage({value:result?.data||null});}catch(error){self.postMessage({error:error.message});}};
