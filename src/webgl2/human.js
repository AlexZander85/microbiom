import {sphere,capsule,revolve,combine,tube,catmull,segment,splitPlane} from './geometry.js';

// Procedural, recognisable teaching anatomy; no claim of medical segmentation.
// Separate opaque skin and an anterior torso window keep the person readable.
export function humanGeometry(){
 const ball=sphere(18,14),finger=capsule(8,6),parts=[],features=[];
 const part=(mesh,pos,scale)=>({mesh,pos,scale});
 const torso=revolve([[-1.24,.34],[-1.04,.53],[-.76,.6],[-.30,.49],[.25,.58],[.78,.74],[1.12,.78],[1.32,.58],[1.52,.20],[1.83,.17]],28,32);
 const torsoMesh=combine([part(torso,[0,0,0],[1,1,.62])]);
 const outside=[];let window=torsoMesh;
 for(const [axis,value,side]of [[2,0,0],[1,-1.12,0],[1,1.20,1],[0,-.59,0],[0,.59,1]]){
  const halves=splitPlane(window,axis,value);outside.push({mesh:halves[1-side]});window=halves[side];
 }
 const back=combine(outside);
 parts.push(part(back,[0,0,0],[1,1,1]));
 const head=revolve([[-.40,.09],[-.32,.21],[-.19,.28],[.02,.31],[.22,.29],[.36,.20],[.42,0]],24,24);
 parts.push(part(head,[0,2.19,.01],[1,1,.91]));
 for(const sign of [-1,1]){
  const arm=tube(catmull([[sign*.66,1.14,0],[sign*.87,.89,0],[sign*1.01,.43,.01],[sign*1.04,.18,.05],[sign*1.14,-.30,.07],[sign*1.16,-.73,.09]],8),t=>.205*(1-t)+.085*t+.04*Math.sin(t*Math.PI*2),12);
  const leg=tube(catmull([[sign*.28,-.88,0],[sign*.31,-1.35,-.015],[sign*.35,-1.96,.02],[sign*.38,-2.24,.015],[sign*.39,-2.57,-.03],[sign*.4,-3.02,.04]],9),t=>.29*(1-t)+.10*t+.055*Math.sin(t*Math.PI*3),14);
  parts.push(part(ball,[sign*.70,1.085,0],[.245,.26,.225]),part(arm,[0,0,0],[1,1,1]),part(leg,[0,0,0],[1,1,1]),part(ball,[sign*.40,-3.13,.20],[.14,.12,.30]));
  parts.push(part(ball,[sign*1.16,-.88,.09],[.105,.18,.066]));
  for(let f=0;f<4;f++){
   const x=sign*(1.08+f*.051),a=[x,-1.00,.09],b=[x+sign*(f-1.5)*.01,-1.16+(f===0||f===3?.05:0),.11];
   parts.push(segment(a,b,.022,finger));
  }
  parts.push(segment([sign*1.07,-.86,.09],[sign*1.015,-1.00,.13],.033,finger));
  parts.push(part(ball,[sign*.312,2.20,.012],[.056,.10,.055]));
  features.push({mesh:combine([part(ball,[sign*.115,2.25,.255],[.066,.031,.027])]),color:'#fff1df'});
  features.push({mesh:combine([part(ball,[sign*.115,2.25,.278],[.023,.026,.012])]),color:'#514e50'});
  features.push({mesh:tube(catmull([[sign*.060,2.32,.246],[sign*.116,2.337,.258],[sign*.173,2.322,.225]],5),.014,5),color:'#765c4f'});
 }
 parts.push(part(ball,[0,2.17,.285],[.047,.093,.069]));
 parts.push(part(ball,[0,2.11,.308],[.060,.038,.045]));
 features.push({mesh:tube(catmull([[-.087,2.019,.221],[0,2.006,.258],[.087,2.019,.221]],7),.013,6),color:'#b46e6b'});
 return {skin:combine(parts),window,features};
}
