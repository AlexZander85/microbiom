import {Model} from '../model.js';
import {RepresentativeCloud} from '../webgl2/cloud.js';
import {byId} from '../data.js';
import {microbeGeometry, surface, heightAt} from '../webgl2/geometry.js';
import {STRIDE, writeInstance} from '../webgl2/gpu.js';
import {perspective, lookAt, multiply, quatFromY} from '../webgl2/math.js';

// One frozen biological snapshot, exact same buffers and camera for both renderers.
// Not a replacement for the full expedition: no model advance, LOD or auto DPR.
export function createFixture(count=3600) {
 const model=new Model('colon'), cloud=new RepresentativeCloud(model,count);
 cloud.update(true);
 const shapes=microbeGeometry();
 const groups=new Map();
 for(let i=0;i<cloud.count;i++) {
  const species=byId[cloud.ids[cloud.species[i]]], shape=species.shape;
  if(!groups.has(shape))groups.set(shape,[]);
  groups.get(shape).push(i);
 }
 const tissueData=new Float32Array(STRIDE);
 writeInstance(tissueData,0,[0,0,0],[1,1,1],'#947a72');
 const batches=[{name:'Эпителий с криптами',kind:'tissue',layer:0,
  geometry:surface((x,z)=>heightAt('colon',x,z),32,50),data:tissueData,ids:[],count:1,depthWrite:true,material:0}];
 for(const [shape,ids] of groups) {
  const data=new Float32Array(ids.length*STRIDE);
  ids.forEach((id,j)=>{
   const s=byId[cloud.ids[cloud.species[id]]], size=cloud.size[id], angle=cloud.angle[id];
   writeInstance(data,j,cloud.position(id),[size,size,size],s.color,
    quatFromY([Math.cos(angle),Math.sin(cloud.phase[id])*.3,Math.sin(angle)]));
  });
  batches.push({name:shape,kind:'microbe',geometry:shapes[shape],data,ids,count:ids.length,depthWrite:true,material:0});
 }
 for(let layer=1;layer<=2;layer++) {
  const data=new Float32Array(STRIDE);
  writeInstance(data,0,[0,layer*1.4,0],[1,1,1],'#659e95',undefined,.14);
  batches.push({name:layer===1?'Плотная слизь':'Рыхлая слизь',kind:'mucus',layer,
   geometry:surface((x,z)=>.35*Math.sin(x*.18)*Math.cos(z*.18),32,20),data,ids:[],count:1,depthWrite:false,material:2});
 }
 return {model,cloud,batches,fields:model.fields,
  signature:bufferSignature(batches),
  triangles:batches.reduce((n,b)=>n+b.geometry.indices.length/3*b.count,0),
  instances:batches.reduce((n,b)=>n+b.count,0)};
}

export function cameraFrame(width,height,yaw=.2,pitch=.46,distance=29.5) {
 const target=[0,4,0],eye=[Math.sin(yaw)*Math.cos(pitch)*distance,
  target[1]+Math.sin(pitch)*distance,Math.cos(yaw)*Math.cos(pitch)*distance];
 const projection=perspective(.72,width/height,.02,200), view=lookAt(eye,target);
 return {eye,target,projection,view,vp:multiply(projection,view),near:.02,far:200,fov:.72,aspect:width/height};
}

export function bufferSignature(batches) {
 let hash=2166136261;
 for(const b of batches)for(const array of [new Float32Array(b.geometry.vertices),new Uint32Array(b.geometry.indices),b.data]) {
  for(const byte of new Uint8Array(array.buffer,array.byteOffset,array.byteLength))hash=Math.imul(hash^byte,16777619);
 }
 return (hash>>>0).toString(16).padStart(8,'0');
}
