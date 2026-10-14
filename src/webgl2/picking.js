import {qrotate} from './math.js';

// All ray parameters remain in world units: never normalise a scaled local ray.
export function localRay(ray,data,offset=0){
 const p=[data[offset],data[offset+1],data[offset+2]],scale=[data[offset+3],data[offset+4],data[offset+5]];
 if(scale.some(s=>!Number.isFinite(s)||Math.abs(s)<1e-10))return null;
 const q=[-data[offset+6],-data[offset+7],-data[offset+8],data[offset+9]];
 return {origin:qrotate(ray.origin.map((v,i)=>v-p[i]),q).map((v,i)=>v/scale[i]),
  dir:qrotate(ray.dir,q).map((v,i)=>v/scale[i])};
}
export function rayBox(ray,min,max,limit=Infinity){
 let lo=0,hi=limit;
 for(let i=0;i<3;i++){
  const d=ray.dir[i],o=ray.origin[i];
  if(Math.abs(d)<1e-12){if(o<min[i]||o>max[i])return Infinity;continue;}
  let a=(min[i]-o)/d,b=(max[i]-o)/d;if(a>b)[a,b]=[b,a];
  lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi)return Infinity;
 }
 return hi>=0?lo:Infinity;
}
export function rayTriangle(ray,a,b,c){
 const e1=[b[0]-a[0],b[1]-a[1],b[2]-a[2]],e2=[c[0]-a[0],c[1]-a[1],c[2]-a[2]],d=ray.dir;
 const p=[d[1]*e2[2]-d[2]*e2[1],d[2]*e2[0]-d[0]*e2[2],d[0]*e2[1]-d[1]*e2[0]];
 const det=e1[0]*p[0]+e1[1]*p[1]+e1[2]*p[2];if(Math.abs(det)<1e-10)return Infinity;
 const inv=1/det,t=ray.origin.map((v,i)=>v-a[i]),u=(t[0]*p[0]+t[1]*p[1]+t[2]*p[2])*inv;
 if(u<0||u>1)return Infinity;
 const q=[t[1]*e1[2]-t[2]*e1[1],t[2]*e1[0]-t[0]*e1[2],t[0]*e1[1]-t[1]*e1[0]],v=(d[0]*q[0]+d[1]*q[1]+d[2]*q[2])*inv;
 if(v<0||u+v>1)return Infinity;
 const distance=(e2[0]*q[0]+e2[1]*q[1]+e2[2]*q[2])*inv;
 return distance>1e-7?distance:Infinity;
}
export class MeshBVH{
 constructor(geometry){
  const v=geometry.vertices,idx=geometry.indices;
  this.triangles=[];
  for(let i=0;i<idx.length;i+=3){const points=[0,1,2].map(j=>Array.from(v.slice(idx[i+j]*6,idx[i+j]*6+3)));
   this.triangles.push({points,min:[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max:[0,1,2].map(k=>Math.max(...points.map(p=>p[k])))});
  }
  const build=ids=>{
   const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];
   for(const id of ids)for(let k=0;k<3;k++){min[k]=Math.min(min[k],this.triangles[id].min[k]);max[k]=Math.max(max[k],this.triangles[id].max[k]);}
   const node={min,max};if(ids.length<=12){node.ids=ids;return node;}
   let axis=0;for(let k=1;k<3;k++)if(max[k]-min[k]>max[axis]-min[axis])axis=k;
   ids.sort((a,b)=>(this.triangles[a].min[axis]+this.triangles[a].max[axis])-(this.triangles[b].min[axis]+this.triangles[b].max[axis]));
   const m=Math.floor(ids.length/2);node.left=build(ids.slice(0,m));node.right=build(ids.slice(m));return node;
  };
  this.root=build(this.triangles.map((_,i)=>i));
 }
 intersect(ray,limit=Infinity,minDistance=0){
  let nearest=limit,found=false;
  const visit=node=>{
   if(rayBox(ray,node.min,node.max,nearest)===Infinity)return;
   if(node.ids){for(const id of node.ids){const d=rayTriangle(ray,...this.triangles[id].points);if(d>=minDistance&&d<nearest){nearest=d;found=true;}}return;}
   const a=rayBox(ray,node.left.min,node.left.max,nearest),b=rayBox(ray,node.right.min,node.right.max,nearest);
   if(a<b){if(a<nearest)visit(node.left);if(b<nearest)visit(node.right);}else{if(b<nearest)visit(node.right);if(a<nearest)visit(node.left);}
  };
  visit(this.root);return found?nearest:Infinity;
 }
}
const trees=new WeakMap();
export function geometryTree(geometry){let tree=trees.get(geometry);if(!tree){tree=new MeshBVH(geometry);trees.set(geometry,tree);}return tree;}
// Cheap conservative instance bound before inverse rotation or triangle traversal.
const radii=new WeakMap();
function geometryRadius(geometry){
 let radius=radii.get(geometry);if(radius!==undefined)return radius;
 let r2=0;const v=geometry.vertices;for(let i=0;i<v.length;i+=6)r2=Math.max(r2,v[i]**2+v[i+1]**2+v[i+2]**2);
 radius=Math.sqrt(r2);radii.set(geometry,radius);return radius;
}
export function intersectInstance(ray,record,limit=Infinity,minDistance=0){
 const data=record.data,o=record.offset||0,r=geometryRadius(record.geometry)*Math.max(Math.abs(data[o+3]),Math.abs(data[o+4]),Math.abs(data[o+5]))+1e-5;
 const x=ray.origin[0]-data[o],y=ray.origin[1]-data[o+1],z=ray.origin[2]-data[o+2],d=ray.dir;
 const a=d[0]*d[0]+d[1]*d[1]+d[2]*d[2],b=x*d[0]+y*d[1]+z*d[2],c=x*x+y*y+z*z-r*r,disc=b*b-a*c;
 if(a===0||disc<0||(-b+Math.sqrt(disc))/a<minDistance||(-b-Math.sqrt(disc))/a>limit)return Infinity;
 const local=localRay(ray,data,o);return local?geometryTree(record.geometry).intersect(local,limit,minDistance):Infinity;
}
export function pickRecords(ray,records,{blockFluid=false,layersOnly=false,occludersOnly=false,limit=Infinity,minDistance=0}={}){
 let nearest=limit,result=null;
 for(const record of records){
  if(record.visible===false||record.opacity<.002)continue;
  if((layersOnly||occludersOnly)&&record.kind==='agent')continue;
  if(record.kind==='fluid'&&!blockFluid&&!layersOnly)continue;
  const distance=intersectInstance(ray,record,nearest,minDistance);
  if(distance<nearest){nearest=distance;result={kind:record.kind,agent:record.agent,layer:record.layer,distance,
   point:ray.origin.map((v,i)=>v+ray.dir[i]*distance)};}
 }
 return result;
}
