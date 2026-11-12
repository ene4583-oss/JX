'use strict';
importScripts('/vendor/jsQR.js','/vendor/zxing.min.js');
function zxingDecode(pixels,width,height){
 const gray=new Uint8ClampedArray(width*height);for(let i=0,j=0;i<gray.length;i++,j+=4)gray[i]=(pixels[j]*77+pixels[j+1]*150+pixels[j+2]*29)>>8;
 const hints=new Map([[ZXing.DecodeHintType.TRY_HARDER,true],[ZXing.DecodeHintType.POSSIBLE_FORMATS,[ZXing.BarcodeFormat.QR_CODE]]]);
 for(const inverted of [false,true]){if(inverted)for(let i=0;i<gray.length;i++)gray[i]=255-gray[i];for(const Binarizer of [ZXing.HybridBinarizer,ZXing.GlobalHistogramBinarizer])try{const bitmap=new ZXing.BinaryBitmap(new Binarizer(new ZXing.RGBLuminanceSource(gray,width,height)));return new ZXing.QRCodeReader().decode(bitmap,hints).getText();}catch{}}
 return null;
}
self.onmessage=({data})=>{try{const pixels=new Uint8ClampedArray(data.pixels),result=jsQR(pixels,data.width,data.height,{inversionAttempts:'attemptBoth'});self.postMessage({value:result?.data||zxingDecode(pixels,data.width,data.height)});}catch(error){self.postMessage({error:error.message});}};
