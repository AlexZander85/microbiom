export const STRIDE=17; // XYZ, scale XYZ, quaternion XYZW, RGB, opacity, glow, phase, unused
export const VS=`#version 300 es
precision highp float;
layout(location=0) in vec3 position;layout(location=1) in vec3 normal;
layout(location=2) in vec3 iPos;layout(location=3) in vec3 iScale;layout(location=4) in vec4 iQ;
layout(location=5) in vec4 iColor;layout(location=6) in vec3 iMeta;
uniform mat4 uVP;uniform float uTime;uniform float uMotion;uniform vec3 uEye;uniform float uFog;
out vec3 vNormal;out vec3 vWorld;out vec4 vColor;out float vGlow;out vec3 vLight;
vec3 rotate(vec3 v,vec4 q){return v+2.*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
void main(){vec3 p=position*iScale;vWorld=rotate(p,iQ)+iPos;
 vNormal=normalize(rotate(normal/max(iScale,vec3(.0001)),iQ));vColor=iColor;vGlow=iMeta.x;
 gl_Position=uVP*vec4(vWorld,1.);float rim=1.-max(0.,dot(vNormal,normalize(uEye-vWorld)));vLight=vec3(.48+.57*max(0.,dot(vNormal,normalize(vec3(-.45,.8,.65)))),rim*rim,clamp(gl_Position.w*uFog*.45,0.,.65));}`;
export const FS=`#version 300 es
precision highp float;
in vec3 vNormal;in vec3 vWorld;in vec4 vColor;in float vGlow;in vec3 vLight;
uniform vec3 uEye;uniform vec3 uFogColor;uniform float uFog;uniform float uOpacity;uniform float uMaterial;uniform float uTime;
uniform sampler2D uField;uniform float uFieldMode;uniform float uVivid;uniform float uHighlight;
out vec4 frag;
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
void main(){
 if(uVivid>.5){
  vec3 color=vColor.rgb*(vLight.x+.15*vLight.y+vGlow);float alpha=vColor.a*uOpacity;
  if(uMaterial>.5&&uMaterial<1.5){color=vColor.rgb*(.4+vLight.y*.6);alpha*=.16+vLight.y*.84;}
  if(uMaterial>1.5&&uMaterial<2.5){vec3 f=texture(uField,clamp((vWorld.xz+32.)/64.,0.,1.)).rgb;
   color=vec3(.25,.85,.42)*f.r+vec3(.15,.5,1.)*f.g+vec3(.86,.3,.67)*f.b;
   if(uFieldMode>.5&&uFieldMode<1.5)color=vec3(.25,.85,.42)*f.r;
   if(uFieldMode>1.5)color=vec3(.15,.5,1.)*f.g;
   alpha*=.12+.20*(color.r+color.g+color.b);
  }
  color=mix(color,vec3(1.,.88,.28),uHighlight*.50)+uHighlight*.07;color=mix(color,uFogColor,vLight.z);if(alpha<.002)discard;frag=vec4(color,alpha);return;
 }
 vec3 N=normalize(vNormal);if(!gl_FrontFacing)N=-N;vec3 V=normalize(uEye-vWorld);vec3 L=normalize(vec3(-.45,.8,.65));
 float light=max(0.,dot(N,L)),band=floor(light*4.)/4.;float diffuse=mix(light,band,.32);
 float rim=pow(1.-max(0.,dot(N,V)),2.5);float spec=pow(max(0.,dot(N,normalize(L+V))),40.);
 vec3 color=vColor.rgb*(.22+.8*diffuse)+vec3(.57,.88,.78)*rim*.24+spec*.22;
 if(uVivid>.5)color=vColor.rgb*(.50+.65*light)+vColor.rgb*rim*.20+vec3(spec*.16);
 float alpha=vColor.a*uOpacity;
 if(uMaterial>.5&&uMaterial<1.5){color=vColor.rgb*(.22+.3*light)+vec3(.33,.85,.78)*rim*.7;alpha*=.12+rim*.88;}
 if(uMaterial>1.5&&uMaterial<2.5){vec2 uv=(vWorld.xz+32.)/64.;vec3 f=texture(uField,clamp(uv,0.,1.)).rgb;
 vec3 chemical=vec3(.28,.85,.46)*f.r+vec3(.12,.5,1.)*f.g+vec3(.86,.3,.67)*f.b;
 if(uFieldMode>.5&&uFieldMode<1.5)chemical=vec3(.3,.9,.4)*f.r;
 if(uFieldMode>1.5)chemical=vec3(.17,.6,1.)*f.g;
 color=chemical+vec3(.12,.25,.18)*rim;alpha*=.13+.4*length(chemical);}
 color+=vColor.rgb*vGlow; color=mix(color,vec3(1.,.88,.28),uHighlight*.50);
 float fog=1.-exp(-length(uEye-vWorld)*uFog);color=mix(color,uFogColor,clamp(fog,0.,.93));
 if(uVivid>.5){color=pow(clamp(color,0.,1.),vec3(.92));}else{color=1.-exp(-color*1.5);color=pow(color,vec3(.83));}color+=(hash(gl_FragCoord.xy)-hash(gl_FragCoord.yx+12.))/255.;
 if(alpha<.002)discard;frag=vec4(color,alpha);}`;
export function colorOf(hex){const v=parseInt(hex.replace('#',''),16);return[(v>>16)/255,((v>>8)&255)/255,(v&255)/255];}
export function writeInstance(buffer,i,pos,scale,color,q=[0,0,0,1],alpha=1,glow=0,phase=0){const o=i*STRIDE;buffer.set(pos,o);buffer.set(scale,o+3);buffer.set(q,o+6);buffer.set(typeof color==='string'?colorOf(color):color,o+10);buffer[o+13]=alpha;buffer[o+14]=glow;buffer[o+15]=phase;buffer[o+16]=0;}
export class GPU{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{alpha:false,antialias:false,powerPreference:'high-performance',preserveDrawingBuffer:false});if(!this.gl)throw new Error('WEBGL2_UNAVAILABLE');const gl=this.gl;
 const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;};
 this.program=gl.createProgram();const vs=compile(gl.VERTEX_SHADER,VS),fs=compile(gl.FRAGMENT_SHADER,FS);gl.attachShader(this.program,vs);gl.attachShader(this.program,fs);gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(this.program));gl.deleteShader(vs);gl.deleteShader(fs);gl.useProgram(this.program);this.u={};for(const name of['uVP','uEye','uFogColor','uFog','uOpacity','uMaterial','uTime','uMotion','uFieldMode','uVivid','uHighlight'])this.u[name]=gl.getUniformLocation(this.program,name);
 this.texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.pixels=new Uint8Array(20*20*3);gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB8,20,20,0,gl.RGB,gl.UNSIGNED_BYTE,this.pixels);gl.enable(gl.DEPTH_TEST);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);this.calls=0;this.triangles=0;this.instances=0;this.meshes=[];
 }
 mesh(data){const geometry={vertices:new Float32Array(data.vertices),indices:new Uint32Array(data.indices)};const gl=this.gl,vao=gl.createVertexArray();gl.bindVertexArray(vao);const vertex=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,vertex);gl.bufferData(gl.ARRAY_BUFFER,geometry.vertices,gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);const index=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,index);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,geometry.indices,gl.STATIC_DRAW);const instances=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,instances);for(const[loc,n,offset]of[[2,3,0],[3,3,3],[4,4,6],[5,4,10],[6,3,14]]){gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,n,gl.FLOAT,false,STRIDE*4,offset*4);gl.vertexAttribDivisor(loc,1);}const mesh={vao,vertex,index,instances,count:data.indices.length,capacity:0,geometry};this.meshes.push(mesh);return mesh;}
 morph(mesh,vertices){const a=mesh.geometry.vertices;if(vertices.length!==a.length)throw new Error('Topology changed during mesh morph');a.set(vertices);mesh.geometry.revision=(mesh.geometry.revision||0)+1;const g=this.gl;g.bindBuffer(g.ARRAY_BUFFER,mesh.vertex);g.bufferSubData(g.ARRAY_BUFFER,0,a);}
 release(mesh){const gl=this.gl;gl.deleteVertexArray(mesh.vao);gl.deleteBuffer(mesh.vertex);gl.deleteBuffer(mesh.index);gl.deleteBuffer(mesh.instances);this.meshes=this.meshes.filter(m=>m!==mesh);}
 upload(mesh,data,count){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,mesh.instances);if(mesh.capacity<data.byteLength){gl.bufferData(gl.ARRAY_BUFFER,data.byteLength,gl.DYNAMIC_DRAW);mesh.capacity=data.byteLength;}gl.bufferSubData(gl.ARRAY_BUFFER,0,data,0,count*STRIDE);}
 begin(time,ratio=1.4){const gl=this.gl,w=Math.max(1,Math.round(this.canvas.clientWidth*Math.min(devicePixelRatio||1,ratio))),h=Math.max(1,Math.round(this.canvas.clientHeight*Math.min(devicePixelRatio||1,ratio)));if(this.canvas.width!==w||this.canvas.height!==h){this.canvas.width=w;this.canvas.height=h;}gl.viewport(0,0,w,h);gl.clearColor(.025,.049,.05,1);gl.depthMask(true);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniform1f(this.u.uTime,time);gl.uniform1f(this.u.uVivid,this.vivid||0);this.calls=0;this.triangles=0;this.instances=0;}
 camera(vp,eye,fog=.005){const g=this.gl;g.uniformMatrix4fv(this.u.uVP,false,vp);g.uniform3fv(this.u.uEye,eye);g.uniform3f(this.u.uFogColor,.025,.049,.05);g.uniform1f(this.u.uFog,fog);}
 fields(fields,mode=0){const g=this.gl;g.bindTexture(g.TEXTURE_2D,this.texture);for(let i=0;i<this.pixels.length;i++)this.pixels[i]=Math.round(fields[i]*255);g.texSubImage2D(g.TEXTURE_2D,0,0,0,20,20,g.RGB,g.UNSIGNED_BYTE,this.pixels);g.uniform1f(this.u.uFieldMode,mode);}
 draw(mesh,count,opacity=1,material=0,depthWrite=true,highlight=0){if(!count||opacity<.002)return;const g=this.gl;g.uniform1f(this.u.uOpacity,opacity);g.uniform1f(this.u.uMaterial,material);g.uniform1f(this.u.uHighlight,highlight);g.depthMask(depthWrite);g.bindVertexArray(mesh.vao);g.drawElementsInstanced(g.TRIANGLES,mesh.count,g.UNSIGNED_INT,0,count);this.calls++;this.triangles+=mesh.count/3*count;this.instances+=count;}
}
