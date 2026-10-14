import {glLayer,glCamera} from '../gl.mjs';
export function createFX(canvas,P,width,height,onError){
 const view=[width,height],camera=glCamera(P);
 const fragment=`
 uniform sampler2D uFields;uniform float uHeight;uniform float uActive;uniform float uMode;
 void main(){
 vec2 vb=viewOf(gl_FragCoord.xy);vec3 p=onFloor(vb,uHeight);
 vec2 uv=vec2((p.x+76.)/152.,(p.y+57.)/114.);
 float edge=window(p.x,-76.,76.,3.)*window(p.y,-57.,57.,3.);
 vec3 f=texture2D(uFields,clamp(uv,0.,1.)).rgb;
 float rip=.72+.28*sin(p.x*.19+p.y*.14-uTime*1.6);
 vec3 col=vec3(.2,.9,.6)*f.r*(.65+.35*noise2(p.xy*.08+uTime*.04));
 col+=vec3(.15,.55,1.)*f.g*.65;col+=vec3(.85,.38,.65)*f.b*rip*.65;
 float filterB=step(.5,uMode)*step(uMode,1.5),filterO=step(1.5,uMode)*step(uMode,2.5);
 if(filterB>.5)col=vec3(.2,1.,.6)*f.r;
 if(filterO>.5)col=vec3(.2,.5,1.)*f.g;
 col=tonemap(col,1.1);col+=(hash12(gl_FragCoord.xy)-hash12(gl_FragCoord.yx+17.))/255.;
 float alpha=edge*uActive*.62;gl_FragColor=vec4(max(col,0.)*alpha,alpha);
 }`;
 const layer=glLayer({canvas,fragment,view,camera,uniforms:['uHeight','uActive','uMode'],maxRatio:.75,onError});
 if(!layer)return null;
 const gl=layer.gl,texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 let pixels=new Uint8Array(20*20*3);
 gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);
 return {draw(model,P,w,h,z,mode,active){view[0]=w;view[1]=h;Object.assign(camera,glCamera(P));for(let i=0;i<pixels.length;i++)pixels[i]=Math.round(model.fields[i]*255);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,20,20,0,gl.RGB,gl.UNSIGNED_BYTE,pixels);layer.draw({uHeight:z,uMode:mode,uActive:active},model.time);},clear:()=>layer.clear()};
}
