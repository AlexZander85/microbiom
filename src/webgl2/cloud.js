import {rng,clamp} from '../model.js';
import {byId} from '../data.js';
import {heightAt} from './geometry.js';
export class RepresentativeCloud{
 constructor(model,count=3600){this.model=model;this.capacity=8000;for(const key of['x','y','z','baseX','baseY','baseZ','phase','size','angle','activity'])this[key]=new Float32Array(this.capacity);this.species=new Uint8Array(this.capacity);this.deposits=[];this.reset(count);}
 reset(requested=this.requested){requested=clamp(Math.floor(Number(requested)||3600),1,this.capacity);this.requested=requested;this.count=this.model.site.sparse?Math.min(240,requested):requested;this.ids=this.model.site.species;const random=rng(this.model.seed+19),centres=Array.from({length:24},()=>[(random()-.5)*53,(random()-.5)*53]);
 const weights=this.ids.map(id=>this.model.initial[id]),sum=weights.reduce((a,b)=>a+b,0);this.sizes=[];this.deposits=[];
 for(let i=0;i<this.count;i++){let r=random()*sum,sp=0;while(sp<weights.length-1&&r>weights[sp])r-=weights[sp++];this.species[i]=sp;const centre=centres[(i*7+sp*3)%centres.length],angle=random()*Math.PI*2,rad=Math.sqrt(random())*7;const x=clamp(centre[0]+Math.cos(angle)*rad,-29,29),z=clamp(centre[1]+Math.sin(angle)*rad,-29,29);const id=this.ids[sp],attached=['mouth','skin','vagina'].includes(this.model.site.id);const y=heightAt(this.model.site.id,x,z)+(attached?.6+random()*2.5:3+random()*9);this.x[i]=this.baseX[i]=x;this.y[i]=this.baseY[i]=y;this.z[i]=this.baseZ[i]=z;this.phase[i]=random()*6.28;this.angle[i]=random()*6.28;this.size[i]=(.18+random()*.1)*(byId[id].group==='Грибы'?1.8:id==='blast'?2.2:id==='phage'?.72:1);this.activity[i]=0;
 }
 }
 deposit(kind,pos){this.deposits.push({kind,pos:[...pos],at:this.model.time});this.deposits=this.deposits.slice(-12);}
 update(steady=false){const now=this.model.time,t=steady?0:now;this.deposits=this.deposits.filter(d=>now-d.at<28);for(let i=0;i<this.count;i++){const id=this.ids[this.species[i]],s=byId[id],p=this.phase[i],motile=!!s.flagellum,drift=motile?2.2:.25;let x=this.baseX[i]+Math.sin(t*(motile?.17:.05)+p)*drift,z=this.baseZ[i]+Math.cos(t*.09+p)*drift,a=0;
  for(const d of this.deposits){const dx=d.pos[0]-x,dz=d.pos[2]-z,d2=dx*dx+dz*dz;const available=d.kind==='fiber'?['degrader','butyrate'].includes(s.guild):!['virus','methane'].includes(s.guild);if(available&&d2<100){a=Math.max(a,(1-d2/100)*Math.exp(-(now-d.at)/18));if(motile){x+=dx*.2*a;z+=dz*.2*a;}}}
  this.x[i]=x;this.y[i]=this.baseY[i]+Math.sin(t*.2+p)*.1;this.z[i]=z;this.activity[i]=a;
 }}
 position(i){return[this.x[i],this.y[i],this.z[i]];}
}
