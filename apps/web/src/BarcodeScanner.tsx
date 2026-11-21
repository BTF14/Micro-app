import { useEffect, useId, useRef, useState } from "react";
import {
  getBarcodeScannerSupport, mapCameraScannerError, normalizeScannedBarcode,
  selectSupportedBarcodeFormats, shouldAcceptDetectedBarcode,
  type BarcodeDetectorConstructorLike, type BarcodeDetectorLike,
} from "./barcode-scanner";

type Props = { onDetected: (code: string) => void; onClose: () => void };

export default function BarcodeScanner({ onDetected, onClose }: Props) {
  const titleId=useId(), videoRef=useRef<HTMLVideoElement>(null);
  const cleanupRef=useRef<()=>void>(()=>undefined);
  const detectedRef=useRef(onDetected), closeRef=useRef(onClose);
  const lastAccepted=useRef<{code:string;at:number}|null>(null);
  const [message,setMessage]=useState("Preparando la cámara…");
  const [manualOnly,setManualOnly]=useState(false);
  detectedRef.current=onDetected; closeRef.current=onClose;

  useEffect(()=>{
    let disposed=false, stream:MediaStream|null=null, frameId:number|null=null, detecting=false;
    const cleanup=()=>{
      if(disposed)return;
      disposed=true;
      if(frameId!==null){window.cancelAnimationFrame(frameId);frameId=null;}
      if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
      if(videoRef.current)videoRef.current.srcObject=null;
    };
    cleanupRef.current=cleanup;
    const close=()=>{cleanup();closeRef.current();};
    const onKeyDown=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();close();}};
    const onVisibility=()=>{if(document.visibilityState==="hidden")close();};
    document.addEventListener("keydown",onKeyDown);
    document.addEventListener("visibilitychange",onVisibility);

    const start=async()=>{
      const BarcodeDetector=(window as unknown as {BarcodeDetector?:BarcodeDetectorConstructorLike}).BarcodeDetector;
      const support=getBarcodeScannerSupport({isSecureContext:window.isSecureContext,navigator,BarcodeDetector});
      if(!support.supported){if(!disposed){setMessage(support.message);setManualOnly(true);}return;}
      try{
        const reported=await BarcodeDetector.getSupportedFormats?.();
        if(disposed)return;
        const formats=selectSupportedBarcodeFormats(reported);
        if(formats.length===0){
          setMessage("Este dispositivo no admite los formatos de códigos de barras habituales. Puedes buscar el producto escribiendo su código.");
          setManualOnly(true);return;
        }
        const detector:BarcodeDetectorLike=new BarcodeDetector({formats});
        const media=navigator.mediaDevices;
        if(!media?.getUserMedia){setMessage("Este navegador no permite acceder a la cámara. Puedes buscar el producto escribiendo su código.");setManualOnly(true);return;}
        const acquired=await media.getUserMedia({video:{facingMode:{ideal:"environment"}},audio:false});
        if(disposed){for(const track of acquired.getTracks())track.stop();return;}
        stream=acquired;
        const video=videoRef.current;
        if(!video){cleanup();return;}
        video.srcObject=acquired;
        await video.play();
        if(disposed)return;
        setMessage("Apunta la cámara al código de barras");
        const tick=()=>{
          if(disposed)return;
          const currentVideo=videoRef.current;
          if(detecting||!currentVideo||currentVideo.readyState<2){frameId=window.requestAnimationFrame(tick);return;}
          detecting=true;
          void detector.detect(currentVideo).then(results=>{
            if(disposed)return;
            for(const result of results){
              const code=normalizeScannedBarcode(result.rawValue);
              if(!code)continue;
              const now=Date.now(),previous=lastAccepted.current;
              if(!shouldAcceptDetectedBarcode({candidate:code,lastAcceptedCode:previous?.code??null,lastAcceptedAtMs:previous?.at??null,nowMs:now}))continue;
              lastAccepted.current={code,at:now};
              cleanup();detectedRef.current(code);return;
            }
          }).catch((reason:unknown)=>{
            if(disposed)return;
            setMessage(mapCameraScannerError(reason));setManualOnly(true);cleanup();
          }).finally(()=>{detecting=false;if(!disposed)frameId=window.requestAnimationFrame(tick);});
        };
        frameId=window.requestAnimationFrame(tick);
      }catch(reason){
        if(disposed)return;
        setMessage(mapCameraScannerError(reason));setManualOnly(true);cleanup();
      }
    };
    void start();
    return ()=>{
      cleanup();
      document.removeEventListener("keydown",onKeyDown);
      document.removeEventListener("visibilitychange",onVisibility);
      if(cleanupRef.current===cleanup)cleanupRef.current=()=>undefined;
    };
  },[]);

  const close=()=>{cleanupRef.current();closeRef.current();};
  return <div className="barcode-scanner-backdrop" role="presentation">
    <section className="barcode-scanner-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="barcode-scanner-heading">
        <h2 id={titleId}>Escanear código de barras</h2>
        <button type="button" className="barcode-scanner-close" onClick={close}>Cerrar</button>
      </header>
      {manualOnly?<div className="barcode-scanner-fallback">
        <p role="status">{message}</p>
        <button type="button" className="barcode-scanner-manual" onClick={close}>Volver a la búsqueda manual</button>
      </div>:<>
        <div className="barcode-scanner-video-wrap">
          <video ref={videoRef} playsInline muted autoPlay aria-label="Vista de la cámara"/>
          <span className="barcode-scanner-guide" aria-hidden="true"/>
        </div>
        <p className="barcode-scanner-message" role="status">{message}</p>
        <button type="button" className="barcode-scanner-manual" onClick={close}>Cerrar</button>
      </>}
    </section>
  </div>;
}
