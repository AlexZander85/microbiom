import {surface} from './geometry.js';
export function oralSurfaceHeight(sim,x,z){
 const o=sim.oral,g=v=>Math.max(0,Math.min(5,(v+24)/8-.5)),gx=g(x),gz=g(z),ix=Math.floor(gx),iz=Math.floor(gz),fx=gx-ix,fz=gz-iz;
 const c=(a,b)=>o.capacity[b*6+a],jx=Math.min(5,ix+1),jz=Math.min(5,iz+1);
 const cap=(c(ix,iz)*(1-fx)+c(jx,iz)*fx)*(1-fz)+(c(ix,jz)*(1-fx)+c(jx,jz)*fx)*fz;
 return 2.8+1.2*Math.cos(x*.055)*Math.cos(z*.055)-1.1*Math.exp(-x*x/18)-(1-cap)*4;
}
export const oralSurfaceGeometry=sim=>surface((x,z)=>oralSurfaceHeight(sim,x,z),24,36);
