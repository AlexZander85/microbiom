import {surface} from './geometry.js';
import {MUCUS_RULES} from '../local/mucus.js';

// Scene x/z and height are twice the biological coordinates. Interpolation is
// presentation only; uptake and permeability use the original finite-volume grid.
export function filmHeight(m,n,x,z,outer=false){
 const grid=v=>Math.max(0,Math.min(n-1,(v+24)/48*n-.5));
 const gx=grid(x),gz=grid(z),ix=Math.floor(gx),iz=Math.floor(gz),jx=Math.min(n-1,ix+1),jz=Math.min(n-1,iz+1),fx=gx-ix,fz=gz-iz;
 const value=(i,j)=>m.inner[j*n+i]/MUCUS_RULES.inner*2.4+(outer?m.outer[j*n+i]/MUCUS_RULES.outer*1.4:0);
 return (value(ix,iz)*(1-fx)+value(jx,iz)*fx)*(1-fz)+(value(ix,jz)*(1-fx)+value(jx,jz)*fx)*fz;
}
export function filmGeometry(m,n,outer=false){
 const height=(x,z)=>filmHeight(m,n,x,z,outer),res=48,data=surface(height,24,res);
 // Visible side walls give the two pools volume, not just coloured flat overlays.
 for(let side=0;side<4;side++)for(let i=0;i<res;i++){
  const a=-24+i/res*48,b=-24+(i+1)/res*48;
  const p=side<2?[side===0?-24:24,a]:[a,side===2?-24:24],q=side<2?[p[0],b]:[b,p[1]];
  const normal=side<2?[side===0?-1:1,0,0]:[0,0,side===2?-1:1];
  const low=(x,z)=>outer?filmHeight(m,n,x,z,false):0,offset=data.vertices.length/6;
  for(const [x,y,z] of [[p[0],low(...p),p[1]],[q[0],low(...q),q[1]],[p[0],height(...p),p[1]],[q[0],height(...q),q[1]]])data.vertices.push(x,y,z,...normal);
  data.indices.push(offset,offset+1,offset+2,offset+2,offset+1,offset+3);
 }
 return data;
}
