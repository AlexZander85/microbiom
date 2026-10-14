import {GPU} from '../webgl2/gpu.js';

export class NativeAdapter {
 constructor(canvas,fixture) {
  this.gpu=new GPU(canvas);this.fixture=fixture;this.gl=this.gpu.gl;
  this.meshes=fixture.batches.map(b=>this.gpu.mesh(b.geometry));
 }
 render(frame,width,height,{showMucus=true,highlight=-1}={}) {
  this.gpu.begin(0,1);this.gpu.camera(frame.vp,frame.eye,.014);this.gpu.fields(this.fixture.fields);
  this.fixture.batches.forEach((b,i)=>{
   if(b.kind==='mucus'&&!showMucus)return;
   this.gpu.upload(this.meshes[i],b.data,b.count);
   this.gpu.draw(this.meshes[i],b.count,highlight<0||b.layer===highlight?1:.25,b.material,b.depthWrite);
  });
 }
 get stats(){return {calls:this.gpu.calls,triangles:this.gpu.triangles,instances:this.gpu.instances};}
 dispose(){for(const mesh of this.meshes)this.gpu.release(mesh);this.gl.deleteTexture(this.gpu.texture);this.gl.deleteProgram(this.gpu.program);}
}
