// Mesh bridge for anatomy: use the original frames, Hermite profiles and vector math.
// SVG d paths are NOT textures standing in for 3D geometry.
import {frameAlong,pointOf,profileCurve,resample,unit3,sub3} from '../../lathe.mjs';
import {qrotate,quatFromY} from './math.js';
export function revolve(profile,radial=16,rows=18){
 const curve=profileCurve(profile.map(([s,r])=>[s,r,true])),F=frameAlong([0,0,0],[0,1,0]);const vertices=[],indices=[];
 for(let i=0;i<=rows;i++){const s=curve.s0+(curve.s1-curve.s0)*i/rows,r=Math.max(0,curve.radius(s)),slope=curve.slope(s);for(let j=0;j<=radial;j++){const angle=j/radial*Math.PI*2,p=pointOf(F,s,r,angle),n=unit3(F.u.map((v,k)=>v*Math.cos(angle)+F.v[k]*Math.sin(angle)-F.a[k]*slope));vertices.push(...p,...n);}}
 for(let i=0;i<rows;i++)for(let j=0;j<radial;j++){const a=i*(radial+1)+j,b=a+radial+1;indices.push(a,a+1,b,b,a+1,b+1);}
 return{vertices,indices};
}
export function sphere(radial=14,rows=10){const p=[];for(let i=0;i<=rows;i++){const a=-Math.PI/2+i/rows*Math.PI;p.push([Math.sin(a),i===0||i===rows?0:Math.max(0,Math.cos(a))]);}return revolve(p,radial,rows);}
export function capsule(radial=12,rows=12){return revolve([[-1.7,0],[-1.5,.6],[-1,1],[1,1],[1.5,.6],[1.7,0]],radial,rows);}
export function combine(parts){const vertices=[],indices=[];for(const {mesh,pos=[0,0,0],scale=[1,1,1],q=[0,0,0,1]}of parts){const offset=vertices.length/6;for(let i=0;i<mesh.vertices.length;i+=6){const v=qrotate(mesh.vertices.slice(i,i+3).map((v,j)=>v*scale[j]),q),n=unit3(qrotate(mesh.vertices.slice(i+3,i+6).map((v,j)=>v/scale[j]),q));vertices.push(...v.map((v,j)=>v+pos[j]),...n);}for(const i of mesh.indices)indices.push(i+offset);}return{vertices,indices};}
export function catmull(points,steps=8){const out=[];for(let i=0;i<points.length-1;i++){const p0=points[Math.max(0,i-1)],p1=points[i],p2=points[i+1],p3=points[Math.min(points.length-1,i+2)];for(let j=0;j<steps;j++){const t=j/steps;out.push(p1.map((v,k)=>.5*((2*v)+(-p0[k]+p2[k])*t+(2*p0[k]-5*v+4*p2[k]-p3[k])*t*t+(-p0[k]+3*v-3*p2[k]+p3[k])*t*t*t)));}}out.push(points.at(-1));return out;}
export function tube(points,radius=.1,radial=8,spacing=0){const ps=spacing?resample(points,spacing):points,vertices=[],indices=[];for(let i=0;i<ps.length;i++){const tangent=unit3(sub3(ps[Math.min(ps.length-1,i+1)],ps[Math.max(0,i-1)])),F=frameAlong(ps[i],tangent);for(let j=0;j<=radial;j++){const a=j/radial*Math.PI*2,p=pointOf(F,0,typeof radius==='function'?radius(i/(ps.length-1)):radius,a),n=unit3(sub3(p,ps[i]));vertices.push(...p,...n);}}for(let i=0;i<ps.length-1;i++)for(let j=0;j<radial;j++){const a=i*(radial+1)+j,b=a+radial+1;indices.push(a,a+1,b,b,a+1,b+1);}return{vertices,indices};}
export function torus(radius=1,width=.03,segments=40){const points=Array.from({length:segments+1},(_,i)=>[Math.cos(i/segments*Math.PI*2)*radius,0,Math.sin(i/segments*Math.PI*2)*radius]);return tube(points,width,6);}
export function segment(a,b,r,base=capsule(8,8)){return{mesh:base,pos:a.map((v,i)=>(v+b[i])/2),scale:[r,Math.hypot(...a.map((v,i)=>v-b[i]))/3.4,r],q:quatFromY(b.map((v,i)=>v-a[i]))};}
export function surface(height,size=32,res=50){const vertices=[],indices=[],eps=.03;for(let i=0;i<=res;i++)for(let j=0;j<=res;j++){const x=(j/res-.5)*size*2,z=(i/res-.5)*size*2,y=height(x,z),dx=(height(x+eps,z)-height(x-eps,z))/(2*eps),dz=(height(x,z+eps)-height(x,z-eps))/(2*eps),n=unit3([-dx,1,-dz]);vertices.push(x,y,z,...n);}for(let i=0;i<res;i++)for(let j=0;j<res;j++){const a=i*(res+1)+j,b=a+res+1;indices.push(a,b,a+1,a+1,b,b+1);}return{vertices,indices};}
export function heightAt(site,x,z){
 if(site==='colon'){const dx=((x+45)%9+9)%9-4.5,dz=((z+45)%9+9)%9-4.5;return Math.sin(x*.19)*.6+Math.cos(z*.22)*.45-2.8*Math.exp(-(dx*dx+dz*dz)/3.4);}
 if(site==='skin'){return .3*Math.sin(x*.5)*Math.cos(z*.4)-7*Math.exp(-(x*x+z*z)/11);}
 if(site==='mouth')return -.003*(x*x+z*z)+Math.sin(x*.12)*.2;
 if(site==='small')return Math.sin(x*.2)*.5+Math.cos(z*.2)*.4;
 if(site==='stomach')return Math.sin(x*.58)*1.7+Math.cos(z*.23)*.6;
 return Math.cos(x*.25)*.5+Math.sin(z*.27)*.3;
}

// Shared by the production renderer and the renderer comparison. No Three dependency.
export function microbeGeometry() {
 const basic=capsule(8,7), ball=sphere(8,6);
 const part=(mesh,pos,scale)=>({mesh,pos,scale});
 const meshes={
  rod:capsule(8,8), oval:ball, protist:ball,
  cocci:combine([part(ball,[0,0,0],[1,1,1]),part(ball,[1.3,.6,0],[.8,.8,.8]),part(ball,[-1.1,.3,0],[.85,.85,.85])]),
  yeast:combine([part(ball,[0,0,0],[1,1.3,1]),part(ball,[.8,1.25,0],[.5,.6,.5])]),
  branch:combine([segment([0,-1.6,0],[0,.2,0],.5,basic),segment([0,0,0],[-1,1.5,0],.45,basic),segment([0,0,0],[1,1.5,0],.45,basic)]),
  spiral:tube(Array.from({length:35},(_,i)=>[Math.sin(i*.5)*.7,-2+i*.12,Math.cos(i*.5)*.7]),.35,7)
 };
 const head=sphere(5,3),stick=capsule(4,3),parts=[part(head,[0,1.5,0],[1.1,1.2,1.1]),segment([0,1,0],[0,-1,0],.18,stick)];
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,p=[Math.cos(a)*1.1,-1.6,Math.sin(a)*1.1],q=[p[0]*1.3,-2.3,p[2]*1.3];
  parts.push(segment([0,-.5,0],p,.08,stick),segment(p,q,.06,stick));
 }
 meshes.phage=combine(parts);
 return meshes;
}
