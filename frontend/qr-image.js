'use strict';
// Decode the original pixels rather than the small on-screen camera preview.
// The worker keeps large phone photos from blocking the rest of the workspace.
window.decodeQRImage=async function(file,{signal,onProgress=()=>{}}={}){
 const cancelled=()=>{if(signal?.aborted)throw new DOMException('Scan cancelled','AbortError');};
 if(file.size>50*1024*1024)throw Error('Choose an image smaller than 50MB.');
 let worker,url,image,bitmap,timer;
 const abort=()=>{worker?.terminate();};signal?.addEventListener('abort',abort,{once:true});
 try{
  cancelled();let blob=file;
  async function loadImage(source){try{if(typeof createImageBitmap==='function'){bitmap=await createImageBitmap(source,{imageOrientation:'from-image'});return bitmap;}}catch{}url=URL.createObjectURL(source);const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('Image cannot be opened.'));img.src=url;});return img;}
  try{image=await loadImage(blob);}catch{
   if(url){URL.revokeObjectURL(url);url=null;}
   const bytes=new Uint8Array(await file.slice(0,4).arrayBuffer());
   if((bytes[0]===73&&bytes[1]===73&&bytes[2]===42)||(bytes[0]===77&&bytes[1]===77&&bytes[3]===42)){
    onProgress('Reading TIFF image…');worker=new Worker('/tiff-worker.js');
    const result=await new Promise(async(resolve,reject)=>{const cancel=()=>reject(new DOMException('Scan cancelled','AbortError'));signal?.addEventListener('abort',cancel,{once:true});const finish=(fn,value)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);fn(value);};timer=setTimeout(()=>finish(reject,Error('TIFF reading timed out. Export as PNG or JPEG.')),20000);worker.onmessage=e=>e.data.error?finish(reject,Error('TIFF could not be opened: '+e.data.error)):finish(resolve,e.data);worker.onerror=()=>finish(reject,Error('TIFF reader could not start.'));try{const buffer=await file.arrayBuffer();cancelled();worker.postMessage(buffer,[buffer]);}catch(e){finish(reject,e);}});
    worker.terminate();worker=null;image=document.createElement('canvas');image.width=result.width;image.height=result.height;image.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(result.pixels),result.width,result.height),0,0);
   }else{
   const header=new Uint8Array(await file.slice(0,32).arrayBuffer());const brand=String.fromCharCode(...header);
   if(!/heic|heix|hevc|hevx|mif1|msf1/i.test(brand)&&! /\.(heic|heif)$/i.test(file.name))throw Error('This file is not a readable image. Choose JPG/JPEG/JPE, PNG, WebP, GIF, BMP, TIFF, AVIF or HEIC/HEIF. Rename alone does not convert a file.');
   onProgress('Converting HEIC photo…');
   if(!window.heic2any){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='/vendor/heic2any.min.js';script.onload=resolve;script.onerror=()=>reject(Error('Could not load the photo converter. Refresh and try again.'));document.head.append(script);});}
   cancelled();try{const converted=await new Promise((resolve,reject)=>{const cancel=()=>reject(new DOMException('Scan cancelled','AbortError'));signal?.addEventListener('abort',cancel,{once:true});const finish=(fn,v)=>{clearTimeout(timer);signal?.removeEventListener('abort',cancel);fn(v);};timer=setTimeout(()=>finish(reject,Error('HEIC conversion timed out.')),20000);window.__heic2any__worker.addEventListener('error',()=>finish(reject,Error('HEIC converter failed.')),{once:true});window.heic2any({blob:file,toType:'image/png'}).then(v=>finish(resolve,v),e=>finish(reject,e));});blob=Array.isArray(converted)?converted[0]:converted;image=await loadImage(blob);}catch(e){if(e.name==='AbortError')throw e;throw Error('This HEIC/HEIF photo could not be converted. Export it as JPEG or take a QR screenshot and select that image.');}finally{window.__heic2any__worker?.terminate();window.heic2any=undefined;}
   }
  }
  cancelled();const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
  if(!width||!height)throw Error('This image is empty or damaged.');
  worker=new Worker('/qr-worker.js');
  const decode=(pixels,w,h)=>new Promise((resolve,reject)=>{const onAbort=()=>reject(new DOMException('Scan cancelled','AbortError'));signal?.addEventListener('abort',onAbort,{once:true});const finish=(fn,v)=>{clearTimeout(timer);signal?.removeEventListener('abort',onAbort);fn(v);};timer=setTimeout(()=>finish(reject,Error('Image reading timed out. Crop around the QR and try again.')),15000);worker.onmessage=e=>e.data.error?finish(reject,Error(e.data.error)):finish(resolve,e.data.value);worker.onerror=()=>finish(reject,Error('QR reader could not start. Refresh this page and retry.'));worker.postMessage({pixels:pixels.buffer,width:w,height:h},[pixels.buffer]);});
  // Whole image at several scales, then overlapping crops for a small label in a large photo.
  const views=[[0,0,width,height,2200],[0,0,width,height,1400],[0,0,width,height,850],[0,0,width,height,3000]];
  for(const [x,y] of [[0,0],[.25,0],[.5,0],[0,.25],[.25,.25],[.5,.25],[0,.5],[.25,.5],[.5,.5]])views.push([x*width,y*height,width*.5,height*.5,1600]);
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  let detector;try{if(window.BarcodeDetector)detector=new BarcodeDetector({formats:['qr_code']});}catch{}
  for(let i=0;i<views.length;i++){
   cancelled();onProgress('Reading QR image… '+(i+1)+' / '+views.length);
   const [x,y,w,h,max]=views[i],scale=Math.min(1,max/Math.max(w,h));canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,x,y,w,h,0,0,canvas.width,canvas.height);
   if(detector)try{const found=await detector.detect(canvas);if(found[0]?.rawValue){cancelled();return found[0].rawValue;}}catch{}
   const result=await decode(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);cancelled();if(result)return result;
  }
  throw Error('No readable QR found. Keep the whole code visible, move closer if needed, and avoid blur or glare. No on-screen frame alignment is required.');
 }finally{clearTimeout(timer);worker?.terminate();bitmap?.close();if(url)URL.revokeObjectURL(url);signal?.removeEventListener('abort',abort);}
};
