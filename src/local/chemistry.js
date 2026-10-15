// Finite-volume amounts on a uniform 3D grid. Every internal face flux is paired.
export const CHEMICALS=['food','acetate','butyrate','detritus','waste','oxygen','signal','drug'];
export const CARBON=['food','acetate','butyrate','detritus','waste'];
export class ChemicalGrid {
 constructor(n=12){
  this.n=n;this.ny=8;this.dx=24/n;this.dy=1;this.length=n*n*this.ny;
  this.values=Object.fromEntries(CHEMICALS.map(k=>[k,new Float64Array(this.length)]));
  this.next=Object.fromEntries(CHEMICALS.map(k=>[k,new Float64Array(this.length)]));
  this.faces=[];
  for(let y=0;y<this.ny;y++)for(let z=0;z<n;z++)for(let x=0;x<n;x++){
   const i=this.index(x,y,z);
   if(x+1<n)this.faces.push([i,i+1,1/(this.dx*this.dx),false]);
   if(z+1<n)this.faces.push([i,i+n,1/(this.dx*this.dx),false]);
   if(y+1<this.ny)this.faces.push([i,i+n*n,1,y===1]); // interface y=0
  }
 }
 index(x,y,z){return(y*this.n+z)*this.n+x;}
 voxel(pos){const bound=(v,max)=>Math.max(0,Math.min(max-1,Math.floor(v)));return this.index(bound((pos[0]+12)/this.dx,this.n),bound(pos[1]+2,this.ny),bound((pos[2]+12)/this.dx,this.n));}
 sample(kind,pos){return this.values[kind][this.voxel(pos)];}
 add(kind,pos,amount){if(!Number.isFinite(amount)||amount<0)throw new Error('Invalid chemical source');this.values[kind][this.voxel(pos)]+=amount;}
 take(kind,pos,amount){const a=this.values[kind],i=this.voxel(pos),used=Math.min(a[i],Math.max(0,amount));a[i]-=used;return used;}
 total(kind){let sum=0;for(const x of this.values[kind])sum+=x;return sum;}
 carbon(){return CARBON.reduce((s,k)=>s+this.total(k),0);}
 diffuse(dt,barrier=1){
  if(!Number.isFinite(dt)||dt<0||dt>1)throw new Error('Invalid diffusion step');
  const diffusion={food:.35,acetate:.65,butyrate:.45,detritus:.06,waste:.5,oxygen:.8,signal:.6,drug:.5};
  const substeps=Math.max(1,Math.ceil(dt*.8*(2/this.dx**2+1)/.45)),h=dt/substeps;
  for(let step=0;step<substeps;step++)for(const k of CHEMICALS){
   const a=this.values[k],b=this.next[k];b.set(a);
   for(const [i,j,inv,wall] of this.faces){
    const permeability=wall?(k==='oxygen'?.4:k==='signal'?.25:.03)+.6*(1-barrier):1;
    const flux=(a[i]-a[j])*diffusion[k]*h*inv*permeability;b[i]-=flux;b[j]+=flux;
   }
   this.values[k]=b;this.next[k]=a;
  }
 }
 snapshot(){return Object.fromEntries(CHEMICALS.map(k=>[k,Array.from(this.values[k])]));}
}
