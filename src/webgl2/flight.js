import {vadd,vsub,vmul,dot,cross,unit,qrotate} from './math.js';
import {geometryTree} from './picking.js';
const EPS=1e-5,overlap=(a,b,c,d)=>a.every((v,i)=>v<=d[i]&&b[i]>=c[i]);
// Closest point on the triangle, including its edges and vertices (Ericson).
export function closestTriangle(p,a,b,c){
 const ab=vsub(b,a),ac=vsub(c,a),ap=vsub(p,a),d1=dot(ab,ap),d2=dot(ac,ap);if(d1<=0&&d2<=0)return a;
 const bp=vsub(p,b),d3=dot(ab,bp),d4=dot(ac,bp);if(d3>=0&&d4<=d3)return b;
 const vc=d1*d4-d3*d2;if(vc<=0&&d1>=0&&d3<=0)return vadd(a,vmul(ab,d1/(d1-d3)));
 const cp=vsub(p,c),d5=dot(ab,cp),d6=dot(ac,cp);if(d6>=0&&d5<=d6)return c;
 const vb=d5*d2-d1*d6;if(vb<=0&&d2>=0&&d6<=0)return vadd(a,vmul(ac,d2/(d2-d6)));
 const va=d3*d6-d5*d4;if(va<=0&&d4-d3>=0&&d5-d6>=0)return vadd(b,vmul(vsub(c,b),(d4-d3)/((d4-d3)+(d5-d6))));
 const den=va+vb+vc;if(Math.abs(den)<1e-20)return a;return vadd(a,vadd(vmul(ab,vb/den),vmul(ac,vc/den)));
}
// Query the shared local-space BVH, then transform only candidate triangles.
// Nonuniform scale and rotation are included; collision radius stays in world units.
export function flightTriangles(records,start,end,radius){
 const min=start.map((v,i)=>Math.min(v,end[i])-radius-EPS),max=start.map((v,i)=>Math.max(v,end[i])+radius+EPS),triangles=[];
 for(const record of records){
  if(record.kind==='fluid'||record.kind==='agent'||record.visible===false||record.opacity<.002)continue;
  const d=record.data,o=record.offset||0,pos=Array.from(d.slice(o,o+3)),scale=Array.from(d.slice(o+3,o+6)),q=Array.from(d.slice(o+6,o+10));if(scale.some(v=>Math.abs(v)<1e-10))continue;
  const inverse=[-q[0],-q[1],-q[2],q[3]],corners=[];
  for(let k=0;k<8;k++)corners.push(qrotate(vsub([k&1?max[0]:min[0],k&2?max[1]:min[1],k&4?max[2]:min[2]],pos),inverse).map((v,i)=>v/scale[i]));
  const lo=[0,1,2].map(i=>Math.min(...corners.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...corners.map(p=>p[i]))),tree=geometryTree(record.geometry);
  const visit=node=>{if(!overlap(lo,hi,node.min,node.max))return;if(node.ids){for(const id of node.ids){const t=tree.triangles[id];if(overlap(lo,hi,t.min,t.max))triangles.push(t.points.map(p=>vadd(pos,qrotate(p.map((v,i)=>v*scale[i]),q))));}}else{visit(node.left);visit(node.right);}};visit(tree.root);
 }
 return triangles;
}
function roots(a,b,c){if(a<1e-20)return [];const disc=b*b-4*a*c;if(disc<0)return [];const d=Math.sqrt(disc);return [(-b-d)/(2*a),(-b+d)/(2*a)];}
export function sweepSphere(start,delta,radius,triangles){
 let hit=null;
 const consider=(t,normal)=>{if(t>=-EPS&&t<=1&&dot(delta,normal)<-1e-10&&(!hit||t<hit.t))hit={t:Math.max(0,t),normal};};
 for(const points of triangles){const [a,b,c]=points,n=unit(cross(vsub(b,a),vsub(c,a))),distance=dot(vsub(start,a),n),speed=dot(delta,n);
  if(Math.abs(speed)>1e-12)for(const side of [-1,1]){const t=(side*radius-distance)/speed;if(t< -EPS||t>1)continue;const centre=vadd(start,vmul(delta,t)),point=vsub(centre,vmul(n,side*radius)),near=closestTriangle(point,a,b,c);if(Math.hypot(...vsub(point,near))<EPS*4)consider(t,vmul(n,side));}
  for(let i=0;i<3;i++){
   const p=points[i],edge=vsub(points[(i+1)%3],p),length=dot(edge,edge),w=vsub(start,p);
   for(const t of roots(dot(delta,delta),2*dot(w,delta),dot(w,w)-radius*radius))consider(t,unit(vadd(w,vmul(delta,t))));
   if(length<1e-20)continue;
   const dp=vsub(delta,vmul(edge,dot(delta,edge)/length)),wp=vsub(w,vmul(edge,dot(w,edge)/length));
   for(const t of roots(dot(dp,dp),2*dot(wp,dp),dot(wp,wp)-radius*radius)){const along=dot(vadd(w,vmul(delta,t)),edge)/length;if(along>=0&&along<=1)consider(t,unit(vadd(wp,vmul(dp,t))));}
  }
 }
 return hit;
}
export function moveSphere(start,delta,radius,records){
 let position=[...start],remaining=[...delta],contacts=0;
 for(let i=0;i<5&&Math.hypot(...remaining)>EPS;i++){
  const end=vadd(position,remaining),triangles=flightTriangles(records,position,end,radius),hit=sweepSphere(position,remaining,radius,triangles);
  if(!hit){position=end;break;}
  const travel=Math.max(0,hit.t-EPS/Math.hypot(...remaining));position=vadd(position,vmul(remaining,travel));remaining=vmul(remaining,1-travel);
  const into=dot(remaining,hit.normal);if(into<0)remaining=vsub(remaining,vmul(hit.normal,into));contacts++;
 }
 return {position,contacts};
}
export function safeFlightStart(position,radius,records){
 let p=[...position];for(let i=0;i<12;i++){
  let moved=false;for(const tri of flightTriangles(records,p,p,radius)){const near=closestTriangle(p,...tri),diff=vsub(p,near),d=Math.hypot(...diff);if(d<radius-EPS){const normal=d>EPS?vmul(diff,1/d):unit(cross(vsub(tri[1],tri[0]),vsub(tri[2],tri[0])));p=vadd(p,vmul(normal,radius+2*EPS-d));moved=true;}}
  if(!moved)return p;
 }
 return null;
}
export class FlightCamera{
 constructor(){this.active=false;this.keys=new Set();this.position=[0,0,0];this.yaw=0;this.pitch=0;this.radius=.15;this.speed=5;this.contacts=0;}
 direction(){return [Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),-Math.cos(this.yaw)*Math.cos(this.pitch)];}
 enter(camera,records,micro=false){const radius=micro?.25:.035,p=safeFlightStart(camera.eye,radius,records);if(!p)return false;this.position=p;const dir=unit(vsub(camera.target,camera.eye));this.yaw=Math.atan2(dir[0],-dir[2]);this.pitch=Math.asin(dir[1]);this.radius=radius;this.speed=micro?8:1;this.keys.clear();this.contacts=0;this.active=true;return true;}
 exit(){this.active=false;this.keys.clear();}
 look(dx,dy){this.yaw-=dx*.004;this.pitch=Math.max(-1.52,Math.min(1.52,this.pitch-dy*.004));}
 update(dt,records){if(!this.active)return;const k=this.keys,f=this.direction(),right=[Math.cos(this.yaw),0,Math.sin(this.yaw)],forward=(+k.has('KeyW'))-(+k.has('KeyS')),side=(+k.has('KeyD'))-(+k.has('KeyA')),up=(+k.has('KeyE'))-(+k.has('KeyQ'));
  const input=vadd(vadd(vmul(f,forward),vmul(right,side)),[0,up,0]),distance=this.speed*Math.min(dt,.05)*(k.has('ShiftLeft')||k.has('ShiftRight')?3:1);
  if(Math.hypot(...input)>0){const result=moveSphere(this.position,vmul(unit(input),distance),this.radius,records);this.position=result.position;this.contacts+=result.contacts;}
 }
}
