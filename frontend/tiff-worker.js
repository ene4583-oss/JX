'use strict';
importScripts('/vendor/pako.min.js','/vendor/UTIF.js');
self.onmessage=({data})=>{try{const pages=UTIF.decode(data),page=pages[0];if(!page||Number(page.t256?.[0])*Number(page.t257?.[0])>40000000)throw Error('Image is empty or too large.');UTIF.decodeImage(data,page);const rgba=UTIF.toRGBA8(page);self.postMessage({width:page.width,height:page.height,pixels:rgba.buffer},[rgba.buffer]);}catch(e){self.postMessage({error:e.message});}};
