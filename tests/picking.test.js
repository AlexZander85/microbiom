import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {anatomyBufferGeometry,installInstances} from '../src/render-lab/three-adapter.js';
import {MeshBVH,rayBox,rayTriangle,intersectInstance,pickRecords} from '../src/webgl2/picking.js';
import {sphere,capsule,microbeGeometry,mediumMicrobeGeometry,lightMicrobeGeometry} from '../src/webgl2/geometry.js';
import {quatFromY} from '../src/webgl2/math.js';
import {writeInstance,STRIDE} from '../src/webgl2/gpu.js';
import {cellBlueprint} from '../src/webgl2/cell-blueprints.js';
import {layerLayout,layerDescription} from '../src/webgl2/layers.js';
import {SPECIES,SITES} from '../src/data.js';
function record(kind,pos,scale=[1,1,1],geometry=sphere(12,10),q){
 const data=new Float32Array(STRIDE);writeInstance(data,0,pos,scale,'#ffffff',q);
 return {kind,data,geometry:{vertices:new Float32Array(geometry.vertices),indices:new Uint32Array(geometry.indices)},agent:kind==='agent'?42:undefined,layer:1,opacity:1};
}
const down={origin:[0,10,0],dir:[0,-1,0]};
test('native triangle intersection is double sided and rejects empty proxy space',()=>{
 const tri=[[-1,0,-1],[1,0,-1],[0,0,1]];
 assert.equal(rayTriangle(down,...tri),10);assert.equal(rayTriangle(down,...tri.toReversed()),10);
 assert.equal(rayTriangle({origin:[.9,10,.9],dir:down.dir},...tri),Infinity);
 assert.equal(intersectInstance({origin:[.4,10,0],dir:down.dir},record('agent',[0,0,0],[.1,2,.1],capsule())),Infinity);
});
test('native BVH handles an origin inside bounds, parallel rays and finite limits',()=>{
 const tree=new MeshBVH(sphere(16,12));assert.ok(tree.intersect({origin:[0,0,0],dir:[1,0,0]})>.9);
 assert.equal(rayBox({origin:[0,0,0],dir:[0,1,0]},[-1,-1,-1],[1,1,1]),0);
 assert.equal(rayBox({origin:[2,0,0],dir:[0,1,0]},[-1,-1,-1],[1,1,1]),Infinity);
 assert.equal(tree.intersect(down,3),Infinity);
 const zero=record('agent',[0,0,0],[0,1,1]);assert.equal(intersectInstance(down,zero),Infinity);
});
test('native picking sorts real hits, blocks opaque tissue, skips fluid by explicit policy',()=>{
 const cell=record('agent',[0,0,0]),tissue=record('tissue',[0,3,0]),fluid=record('fluid',[0,6,0]);
 assert.equal(pickRecords(down,[cell,tissue,fluid]).kind,'tissue');
 assert.equal(pickRecords(down,[cell,fluid]).agent,42);
 assert.equal(pickRecords(down,[cell,fluid],{blockFluid:true}).kind,'fluid');
 assert.equal(pickRecords(down,[cell,fluid],{layersOnly:true}).kind,'fluid');
 tissue.visible=false;assert.equal(pickRecords(down,[cell,tissue]).agent,42);
 cell.opacity=0;assert.equal(pickRecords(down,[cell]),null);
});
test('native intersections match Three raycasting across every rendered LOD and transformed instance',()=>{
 let rays=0,hits=0;
 for(const shapes of [microbeGeometry(),mediumMicrobeGeometry(),lightMicrobeGeometry()])for(const geometry of Object.values(shapes)){
  const rec=record('agent',[2,3,-4],[.8,1.7,.4],geometry,quatFromY([1,2,.4]));
  const object=installInstances(new THREE.InstancedMesh(anatomyBufferGeometry(rec.geometry),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),1),{data:rec.data,count:1});object.updateMatrixWorld(true);
  for(let x=-2;x<=2;x+=.5)for(let y=-2;y<=2;y+=.5){
   const ray={origin:[2+x,3+y,6],dir:[0,0,-1]},caster=new THREE.Raycaster(new THREE.Vector3(...ray.origin),new THREE.Vector3(...ray.dir));
   const expected=caster.intersectObject(object)[0]?.distance??Infinity,actual=intersectInstance(ray,rec);rays++;
   if(expected===Infinity)assert.equal(actual,Infinity);else{hits++;assert.ok(Math.abs(actual-expected)<2e-5,`${actual} != ${expected}`);}
  }
  object.geometry.dispose();object.material.dispose();
 }
 assert.ok(rays>1000&&hits>100);
});
test('every habitat has valid layer membership and nonempty explanations',()=>{
 for(const site of SITES){const layout=layerLayout(site);for(const i of [layout.micro,...layout.fluid])assert.ok(i>=0&&i<site.layers.length);site.layers.forEach((_,i)=>assert.ok(layerDescription(site,i).length>30));}
 assert.equal(layerLayout(SITES.find(s=>s.id==='mouth')).micro,2);
 assert.equal(layerLayout(SITES.find(s=>s.id==='nose')).micro,1);
});
test('cell structures distinguish five groups without universal nuclei or plasmids',()=>{
 for(const s of SPECIES){const b=cellBlueprint(s.id);assert.equal(new Set(b.parts.map(p=>p.id)).size,b.parts.length);assert.equal(b.nucleus,['Грибы','Протисты'].includes(s.group));assert.ok(b.approximate);}
 assert.ok(cellBlueprint('coli').parts.some(p=>p.id==='outer'));
 assert.ok(!cellBlueprint('lacto').parts.some(p=>p.id==='outer'));
 assert.ok(cellBlueprint('cand').parts.some(p=>p.id==='vacuole'));
 assert.ok(cellBlueprint('blast').parts.some(p=>p.id==='vacuole'));
 assert.ok(cellBlueprint('meth').parts.find(p=>p.id==='wall').text.includes('псевдомуреин'));
 assert.deepEqual(cellBlueprint('phage').parts.map(p=>p.id),['capsid','genome','tail','fibres']);
 assert.throws(()=>cellBlueprint('missing'));
});

test('tissue disassembly remains reversible while biology is paused, calm mode is immediate',async()=>{
 const {World}=await import('../src/webgl2/world.js');
 const stub={clock:0,explodeElapsed:0,exploded:true,calm:false,travel:{x:2,v:0},goal:2,yaw:{x:0,v:0},targetYaw:0,pitch:{x:0,v:0},targetPitch:0,lifts:Array.from({length:5},()=>({x:0,v:0})),follow:false};
 for(let i=0;i<150;i++)World.prototype.updateCamera.call(stub,1/30,true);
 assert.equal(stub.clock,0);assert.ok(stub.lifts.every(l=>Math.abs(l.x-1)<.001));
 stub.exploded=false;stub.explodeElapsed=0;for(let i=0;i<150;i++)World.prototype.updateCamera.call(stub,1/30,true);
 assert.ok(stub.lifts.every(l=>Math.abs(l.x)<.001));
 stub.calm=true;stub.exploded=true;stub.explodeElapsed=0;World.prototype.updateCamera.call(stub,1/60,true);
 assert.ok(stub.lifts.every(l=>l.x===1));
});

test('near/far limits skip clipped surfaces but can hit the far side of a cut object',()=>{
 const rec=record('agent',[0,0,0]);
 assert.equal(pickRecords(down,[rec],{limit:8}),null);
 const hit=pickRecords(down,[rec],{minDistance:10});assert.ok(hit.distance>10&&hit.distance<12);
 assert.equal(pickRecords(down,[rec],{occludersOnly:true}),null);
});
