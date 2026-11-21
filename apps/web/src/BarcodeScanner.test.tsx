// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach,beforeEach,describe,expect,it,vi } from "vitest";
import BarcodeScanner from "./BarcodeScanner";
let container:HTMLDivElement,root:Root;
let detected:ReturnType<typeof vi.fn<(code:string)=>void>>,closed:ReturnType<typeof vi.fn<()=>void>>,getUserMedia:ReturnType<typeof vi.fn<(constraints?:MediaStreamConstraints)=>Promise<MediaStream>>>;
let track:{stop:ReturnType<typeof vi.fn>},secondTrack:{stop:ReturnType<typeof vi.fn>},nextFrame:FrameRequestCallback|null;
class FakeDetector {
 static getSupportedFormats=vi.fn(async()=>["ean_13"]);
 detect=vi.fn(async()=>[{rawValue:" 750123\n",format:"ean_13"}]);
}
function stream():MediaStream{
 const value={} as MediaStream;
 Object.defineProperty(value,"getTracks",{value:()=>[track,secondTrack]});
 return value;
}
const settle=()=>act(async()=>{await new Promise(resolve=>setTimeout(resolve,0));});
async function mount(){await act(async()=>root.render(<BarcodeScanner onDetected={detected} onClose={closed}/>));await settle();}
beforeEach(()=>{
 container=document.createElement("div");document.body.appendChild(container);root=createRoot(container);
 detected=vi.fn<(code:string)=>void>();closed=vi.fn<()=>void>();track={stop:vi.fn()};secondTrack={stop:vi.fn()};nextFrame=null;
 Object.defineProperty(window,"isSecureContext",{configurable:true,value:true});
 Object.defineProperty(window,"BarcodeDetector",{configurable:true,value:FakeDetector});
 Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:{getUserMedia:(constraints?:MediaStreamConstraints)=>getUserMedia(constraints)}});
 Object.defineProperty(HTMLVideoElement.prototype,"srcObject",{configurable:true,get(){return (this as HTMLVideoElement&{_stream?:MediaStream})._stream??null;},set(value:MediaStream|null){(this as HTMLVideoElement&{_stream?:MediaStream})._stream=value??undefined;}});
 vi.spyOn(HTMLMediaElement.prototype,"play").mockResolvedValue(undefined);
 vi.stubGlobal("requestAnimationFrame",(callback:FrameRequestCallback)=>{nextFrame=callback;return 1;});
 vi.stubGlobal("cancelAnimationFrame",vi.fn());
 getUserMedia=vi.fn(async(_constraints?:MediaStreamConstraints)=>stream());
});
afterEach(async()=>{
 await act(async()=>root.unmount());container.remove();document.body.innerHTML="";
 vi.restoreAllMocks();vi.unstubAllGlobals();Reflect.deleteProperty(window,"BarcodeDetector");
});
describe("BarcodeScanner",()=>{
 it("falls back without camera when secure context is missing",async()=>{
  Object.defineProperty(window,"isSecureContext",{configurable:true,value:false});await mount();
  expect(container.textContent).toContain("conexión segura");expect(getUserMedia).not.toHaveBeenCalled();
 });
 it("falls back when BarcodeDetector or the camera API is unavailable",async()=>{
  Reflect.deleteProperty(window,"BarcodeDetector");await mount();
  expect(container.textContent).toContain("escaneo no está disponible");expect(getUserMedia).not.toHaveBeenCalled();
  await act(async()=>root.unmount());root=createRoot(container);
  Object.defineProperty(window,"BarcodeDetector",{configurable:true,value:FakeDetector});
  Object.defineProperty(navigator,"mediaDevices",{configurable:true,value:undefined});
  await mount();expect(container.textContent).toContain("no permite acceder a la cámara");
 });
 it("does not request the camera when supported-format discovery resolves after unmount",async()=>{
  let resolveFormats!:(formats:string[])=>void;
  FakeDetector.getSupportedFormats.mockImplementationOnce(()=>new Promise<string[]>(resolve=>{resolveFormats=resolve;}));
  await act(async()=>root.render(<BarcodeScanner onDetected={detected} onClose={closed}/>));await settle();
  await act(async()=>root.unmount());resolveFormats(["ean_13"]);await settle();
  expect(getUserMedia).not.toHaveBeenCalled();
 });
 it("falls back when the browser reports no retail formats",async()=>{
  FakeDetector.getSupportedFormats.mockResolvedValueOnce([]);await mount();
  expect(container.textContent).toContain("no admite los formatos");expect(getUserMedia).not.toHaveBeenCalled();
 });
 it("requests the rear camera, emits one normalized code and stops its track",async()=>{
  await mount();expect(getUserMedia).toHaveBeenCalledWith({video:{facingMode:{ideal:"environment"}},audio:false});
  const video=container.querySelector("video")!;Object.defineProperty(video,"readyState",{configurable:true,value:4});
  await act(async()=>{nextFrame?.(0);await new Promise(resolve=>setTimeout(resolve,0));});
  expect(detected).toHaveBeenCalledTimes(1);expect(detected).toHaveBeenCalledWith("750123");expect(track.stop).toHaveBeenCalledTimes(1);expect(secondTrack.stop).toHaveBeenCalledTimes(1);
 });
 it("cleans up on manual close and hidden visibility",async()=>{
  await mount();await act(async()=>container.querySelector<HTMLButtonElement>(".barcode-scanner-close")!.click());
  expect(track.stop).toHaveBeenCalledTimes(1);expect(secondTrack.stop).toHaveBeenCalledTimes(1);expect(closed).toHaveBeenCalledTimes(1);
  await act(async()=>root.unmount());root=createRoot(container);await mount();Object.defineProperty(document,"visibilityState",{configurable:true,value:"hidden"});
  await act(async()=>document.dispatchEvent(new Event("visibilitychange")));
  expect(track.stop).toHaveBeenCalledTimes(2);expect(secondTrack.stop).toHaveBeenCalledTimes(2);expect(closed).toHaveBeenCalledTimes(2);
 });
 it("stops a late stream when unmounted during getUserMedia",async()=>{
  let resolveStream!:(value:MediaStream)=>void;
  getUserMedia.mockImplementationOnce(()=>new Promise<MediaStream>(resolve=>{resolveStream=resolve;}));
  await act(async()=>root.render(<BarcodeScanner onDetected={detected} onClose={closed}/>));await settle();
  await act(async()=>root.unmount());resolveStream(stream());await settle();
  expect(track.stop).toHaveBeenCalledTimes(1);expect(secondTrack.stop).toHaveBeenCalledTimes(1);expect(detected).not.toHaveBeenCalled();
 });
 it("maps permission errors to Spanish without exposing the DOM name",async()=>{
  getUserMedia.mockRejectedValueOnce(new DOMException("blocked","NotAllowedError"));await mount();
  expect(container.textContent).toContain("No se autorizó el acceso a la cámara");expect(container.textContent).not.toContain("NotAllowedError");
 });
 it("maps an unknown camera error without exposing its message",async()=>{
  getUserMedia.mockRejectedValueOnce(new Error("private browser details"));await mount();
  expect(container.textContent).toContain("No pudimos iniciar el escáner");
  expect(container.textContent).not.toContain("private browser details");
 });
 it("closes on Escape and releases every camera track after a camera playback error",async()=>{
  await mount();await act(async()=>document.dispatchEvent(new KeyboardEvent("keydown",{key:"Escape",bubbles:true})));
  expect(track.stop).toHaveBeenCalledTimes(1);expect(secondTrack.stop).toHaveBeenCalledTimes(1);expect(closed).toHaveBeenCalledTimes(1);
  await act(async()=>root.unmount());root=createRoot(container);
  vi.spyOn(HTMLMediaElement.prototype,"play").mockRejectedValueOnce(new DOMException("busy","NotReadableError"));
  await mount();
  expect(container.textContent).toContain("La cámara está siendo utilizada");
  expect(container.textContent).not.toContain("NotReadableError");
  expect(track.stop).toHaveBeenCalledTimes(2);expect(secondTrack.stop).toHaveBeenCalledTimes(2);
 });

});
