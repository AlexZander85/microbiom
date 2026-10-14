// Direct Path2D adapter: no SVG DOM, no dependency on canvas-painter's SVG traversal.
export function paths(raw){const result={};for(const [k,v]of Object.entries(raw)){if(typeof v==='string')result[k]=new Path2D(v);else if(k==='shades')result[k]=v.map(s=>new Path2D(s));}return result;}
export function rgb(hex,m=1){const n=parseInt(hex.slice(1),16);return `rgb(${Math.min(255,(n>>16)*m)},${Math.min(255,((n>>8)&255)*m)},${Math.min(255,(n&255)*m)})`;}
export function paint(ctx,p,color,alpha=1){
 ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=rgb(color,.67);if(p.fill)ctx.fill(p.fill);
 if(p.shades)p.shades.forEach((s,i)=>{ctx.fillStyle=rgb(color,.4+i*.15);ctx.fill(s);});
 ctx.fillStyle=rgb(color,1.04);if(p.top)ctx.fill(p.top);
 ctx.strokeStyle=rgb(color,1.25);ctx.globalAlpha*=.45;ctx.lineWidth=.65;if(p.outline)ctx.stroke(p.outline);if(p.bevel)ctx.stroke(p.bevel);ctx.restore();
}
export function paintTube(ctx,p,color){ctx.fillStyle=color;ctx.fill(p.body);ctx.fillStyle='#ffffff45';ctx.fill(p.shine);ctx.fillStyle='#001c2855';ctx.fill(p.shade);}
