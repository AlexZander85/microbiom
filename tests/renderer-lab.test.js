import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from '../vendor/three/three.module.js';
import {createFixture,bufferSignature,cameraFrame} from '../src/render-lab/fixture.js';
import {anatomyBufferGeometry,installInstances,pickWithOcclusion} from '../src/render-lab/three-adapter.js';
import {sphere,surface,microbeGeometry} from '../src/webgl2/geometry.js';
import {STRIDE,writeInstance} from '../src/webgl2/gpu.js';

function mesh(kind,position,ids=[42],geometry=sphere(12,10),scale=[1,1,1]) {
 const data=new Float32Array(STRIDE);
 writeInstance(data,0,position,scale,'#abcdef');
 const batch={name:kind,kind,layer:kind==='microbe'?undefined:0,ids,count:1,data,geometry};
 const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 const object=installInstances(new THREE.InstancedMesh(anatomyBufferGeometry(geometry),material,1),batch);
 object.updateMatrixWorld(true);
 return object;
}
function dispose(objects){for(const o of objects){o.geometry.dispose();o.material.dispose();}}
const down={origin:[0,10,0],dir:[0,-1,0]};

test('comparison uses reproducible anatomy buffers and exactly 3600 representatives',()=>{
 const a=createFixture(),b=createFixture();
 assert.equal(a.signature,b.signature);assert.equal(a.signature,bufferSignature(a.batches));
 assert.equal(a.batches.filter(b=>b.kind==='microbe').reduce((n,b)=>n+b.count,0),3600);
 assert.equal(a.instances,3603);assert.equal(a.triangles,635672);
 assert.deepEqual(a.model.snapshot(),b.model.snapshot());
});
test('mesh bridge preserves vertices, normals, indices without re-tessellating anatomy',()=>{
 for(const original of Object.values(microbeGeometry())){
  const converted=anatomyBufferGeometry(original);
  assert.equal(converted.index.count,original.indices.length);
  assert.deepEqual([...converted.index.array],original.indices);
  assert.deepEqual([...converted.attributes.position.data.array],[...new Float32Array(original.vertices)]);
  converted.dispose();
 }
});
test('Three raycast returns representative ID rather than batch index',()=>{
 const objects=[mesh('microbe',[0,2,0],[987])];
 const hit=pickWithOcclusion(objects,down);
 assert.equal(hit.id,987);assert.equal(hit.instanceId,0);assert.equal(hit.kind,'microbe');dispose(objects);
});
test('opaque tissue in front of a cell blocks the cell; a front cell is selectable',()=>{
 const objects=[mesh('microbe',[0,-2,0]),mesh('tissue',[0,0,0],[],surface(()=>0,8,4))];
 assert.equal(pickWithOcclusion(objects,down).kind,'tissue');
 const above=mesh('microbe',[0,3,0],[99]);objects.push(above);
 assert.equal(pickWithOcclusion(objects,down).id,99);dispose(objects);
});
test('mucus pick-through policy is explicit and independent of visual opacity',()=>{
 const objects=[mesh('microbe',[0,0,0]),mesh('mucus',[0,3,0],[],surface(()=>0,8,4))];
 assert.equal(pickWithOcclusion(objects,down).kind,'microbe');
 assert.equal(pickWithOcclusion(objects,down,{blockMucus:true}).kind,'mucus');
 assert.equal(pickWithOcclusion(objects,down,{layersOnly:true}).kind,'mucus');
 objects[1].visible=false;
 assert.equal(pickWithOcclusion(objects,down,{blockMucus:true}).kind,'microbe');dispose(objects);
});
test('triangle picking rejects a hit inside a bounding sphere but outside a thin mesh',()=>{
 const objects=[mesh('microbe',[0,0,0],[1],sphere(16,12),[2,.2,.2])];
 const ray={origin:[0,2,1],dir:[0,-1,0]};
 assert.equal(pickWithOcclusion(objects,ray),null);dispose(objects);
});
test('shared frame uses the actual canvas aspect and finite perspective transform',()=>{
 const frame=cameraFrame(1010,540);assert.equal(frame.aspect,1010/540);
 assert.ok([...frame.vp].every(Number.isFinite));
});
