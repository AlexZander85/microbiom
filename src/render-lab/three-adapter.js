import * as THREE from '../../vendor/three/three.module.js';
import {VS, FS, STRIDE} from '../webgl2/gpu.js';

export function anatomyBufferGeometry(data) {
 const geometry=new THREE.BufferGeometry();
 const buffer=new THREE.InterleavedBuffer(new Float32Array(data.vertices),6);
 geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(buffer,3,0));
 geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(buffer,3,3));
 geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data.indices),1));
 geometry.computeBoundingSphere();
 return geometry;
}

export function installInstances(mesh,batch) {
 const buffer=new THREE.InstancedInterleavedBuffer(batch.data,STRIDE,1);
 for(const [name,size,offset] of [['iPos',3,0],['iScale',3,3],['iQ',4,6],['iColor',4,10],['iMeta',3,14]]) {
  mesh.geometry.setAttribute(name,new THREE.InterleavedBufferAttribute(buffer,size,offset));
 }
 buffer.setUsage(THREE.DynamicDrawUsage);
 const matrix=new THREE.Matrix4(),pos=new THREE.Vector3(),scale=new THREE.Vector3(),q=new THREE.Quaternion();
 // Keep native instance attributes for pixel-equivalent shaders; matrices serve CPU raycasting.
 // They are intentionally redundant in this spike, not the proposed final representation.
 for(let i=0;i<batch.count;i++) {
  const o=i*STRIDE;
  pos.fromArray(batch.data,o);scale.fromArray(batch.data,o+3);q.fromArray(batch.data,o+6);
  matrix.compose(pos,q,scale);mesh.setMatrixAt(i,matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;
 mesh.computeBoundingSphere();
 mesh.userData.batch=batch;
 mesh.userData.instanceBuffer=buffer;
 return mesh;
}

export function pickWithOcclusion(objects,ray,{blockMucus=false,layersOnly=false}={}) {
 const raycaster=new THREE.Raycaster(new THREE.Vector3(...ray.origin),new THREE.Vector3(...ray.dir).normalize());
 // Include tissue in the same hit list: picking just microbes would pick through walls.
 const targets=objects.filter(o=>o.visible && (layersOnly?o.userData.batch.kind!=='microbe':true));
 for(const hit of raycaster.intersectObjects(targets,false)) {
  const b=hit.object.userData.batch;
  if(b.kind==='mucus'&&!blockMucus&&!layersOnly)continue;
  return {kind:b.kind,layer:b.layer,name:b.name,
   id:b.kind==='microbe'?b.ids[hit.instanceId]:null,
   instanceId:hit.instanceId,distance:hit.distance,point:hit.point.toArray()};
 }
 return null;
}

export class ThreeAdapter {
 constructor(canvas,fixture) {
  this.fixture=fixture;
  const context=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});
  if(!context)throw new Error('WEBGL2_UNAVAILABLE');
  this.renderer=new THREE.WebGLRenderer({canvas,context,alpha:false,antialias:false,powerPreference:'high-performance'});
  this.gl=this.renderer.getContext();
  this.renderer.setPixelRatio(1);
  this.renderer.outputColorSpace=THREE.LinearSRGBColorSpace;
  this.renderer.toneMapping=THREE.NoToneMapping;
  this.renderer.setClearColor(new THREE.Color().setRGB(.025,.049,.05,THREE.LinearSRGBColorSpace),1);
  this.renderer.sortObjects=false;
  this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera();
  const pixels=new Uint8Array(20*20*4);
  for(let i=0;i<400;i++){for(let j=0;j<3;j++)pixels[i*4+j]=Math.round(fixture.fields[i*3+j]*255);pixels[i*4+3]=255;}
  this.texture=new THREE.DataTexture(pixels,20,20,THREE.RGBAFormat);
  this.texture.minFilter=this.texture.magFilter=THREE.LinearFilter;
  this.texture.needsUpdate=true;
  this.objects=fixture.batches.map(batch=>{
   const material=new THREE.RawShaderMaterial({
    glslVersion:THREE.GLSL3,vertexShader:VS.replace('#version 300 es',''),fragmentShader:FS.replace('#version 300 es',''),
    uniforms:{uVP:{value:new THREE.Matrix4()},uEye:{value:new THREE.Vector3()},
     uFogColor:{value:new THREE.Vector3(.025,.049,.05)},uFog:{value:.014},
     uOpacity:{value:1},uMaterial:{value:batch.material},uTime:{value:0},uMotion:{value:0},
     uField:{value:this.texture},uFieldMode:{value:0}},
    side:THREE.DoubleSide,transparent:true,forceSinglePass:true,depthTest:true,depthWrite:batch.depthWrite,
    blending:THREE.CustomBlending,blendEquation:THREE.AddEquation,
    blendSrc:THREE.SrcAlphaFactor,blendDst:THREE.OneMinusSrcAlphaFactor,toneMapped:false
   });
   const mesh=installInstances(new THREE.InstancedMesh(anatomyBufferGeometry(batch.geometry),material,batch.count),batch);
   mesh.frustumCulled=false;this.scene.add(mesh);return mesh;
  });
  this.scene.updateMatrixWorld(true);
 }
 render(frame,width,height,{showMucus=true,highlight=-1}={}) {
  const size=this.renderer.getSize(new THREE.Vector2());
  if(size.x!==width||size.y!==height)this.renderer.setSize(width,height,false);
  this.camera.fov=frame.fov*180/Math.PI;this.camera.aspect=frame.aspect;
  this.camera.near=frame.near;this.camera.far=frame.far;
  this.camera.position.fromArray(frame.eye);this.camera.lookAt(...frame.target);this.camera.updateProjectionMatrix();
  for(const object of this.objects) {
   const b=object.userData.batch;
   object.visible=b.kind!=='mucus'||showMucus;
   const u=object.material.uniforms;
   u.uVP.value.fromArray(frame.vp);u.uEye.value.fromArray(frame.eye);
   u.uOpacity.value=highlight<0||b.layer===highlight?1:.25;
   // Match the native renderer's per-frame instance upload, even for a frozen fixture.
   object.userData.instanceBuffer.needsUpdate=true;
  }
  this.renderer.render(this.scene,this.camera);
 }
 get stats(){return {calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,
  instances:this.objects.filter(o=>o.visible).reduce((n,o)=>n+o.count,0)};}
 pick(ray,options){return pickWithOcclusion(this.objects,ray,options);}
 dispose(){for(const o of this.objects){o.geometry.dispose();o.material.dispose();}this.texture.dispose();this.renderer.dispose();}
}
