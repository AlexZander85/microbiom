export const vadd=(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]];
export const vsub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
export const vmul=(a,s)=>a.map(x=>x*s);
export const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const unit=a=>vmul(a,1/(Math.hypot(...a)||1));
export function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
export function lookAt(eye,target,up=[0,1,0]){const z=unit(vsub(eye,target)),x=unit(cross(up,z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
export function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
export function project(p,m,w,h){const q=[0,0,0,0];for(let r=0;r<4;r++)q[r]=m[r]*p[0]+m[4+r]*p[1]+m[8+r]*p[2]+m[12+r];if(q[3]<=0)return null;return{x:(q[0]/q[3]*.5+.5)*w,y:(.5-q[1]/q[3]*.5)*h,z:q[2]/q[3],w:q[3]};}
export function rayFromCamera(x,y,w,h,eye,target,fov){const forward=unit(vsub(target,eye)),right=unit(cross(forward,[0,1,0])),up=cross(right,forward),k=Math.tan(fov/2);return {origin:eye,dir:unit(vadd(forward,vadd(vmul(right,(x/w*2-1)*k*w/h),vmul(up,(1-y/h*2)*k))))};}
export function raySphere(ray,center,radius){const oc=vsub(ray.origin,center),b=dot(oc,ray.dir),c=dot(oc,oc)-radius*radius,d=b*b-c;if(d<0)return Infinity;const t=-b-Math.sqrt(d);return t>0?t:Infinity;}
export function quatFromY(direction){const u=unit(direction),d=u[1];if(d<-.99999)return[1,0,0,0];const a=cross([0,1,0],u),s=Math.sqrt((1+d)*2);return[a[0]/s,a[1]/s,a[2]/s,s/2];}
export function qrotate(p,q){const t=vmul(cross(q,p),2);return vadd(p,vadd(vmul(t,q[3]),cross(q,t)));}
export const mix=(a,b,t)=>a+(b-a)*t;
export const mix3=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));
