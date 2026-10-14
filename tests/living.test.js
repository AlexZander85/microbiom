import test from 'node:test';import assert from 'node:assert/strict';
import {Model} from '../src/model.js';import {LivingCloud,liveColor} from '../src/webgl2/living.js';
import {heightAt,lightMicrobeGeometry,microbeGeometry,splitPlane,sphere} from '../src/webgl2/geometry.js';
import {humanGeometry} from '../src/webgl2/human.js';

test('visible travel is substantial at normal speed and does not advance biological time',()=>{
 const m=new Model(),before=m.snapshot(),c=new LivingCloud(m,1800),start=c.position(0);
 for(let i=0;i<150;i++)c.advance(1/30);
 assert.ok(Math.hypot(...c.position(0).map((v,j)=>v-start[j]))>1);
 assert.deepEqual(m.snapshot(),before);assert.ok(c.events.length>0);
});
test('pause and reduced motion freeze positions, orientation, visual time and events',()=>{
 const c=new LivingCloud(new Model(),1800);c.advance(.2);
 const snapshot=()=>JSON.stringify([c.visualTime,...c.position(0),c.angle[0],c.events]);const before=snapshot();
 for(let i=0;i<20;i++){c.advance(.2,{paused:true});c.advance(.2,{calm:true});}
 assert.equal(snapshot(),before);
});
test('visual clock uses deterministic fixed steps independent of frame partition',()=>{
 const a=new LivingCloud(new Model(),240),b=new LivingCloud(new Model(),240);
 for(let i=0;i<90;i++)a.advance(1/30);for(let i=0;i<180;i++)b.advance(1/60);
 assert.deepEqual(a.x,b.x);assert.deepEqual(a.z,b.z);assert.deepEqual(a.events,b.events);
});
test('faster storytelling does not speed up physiology and quality does not set abundance',()=>{
 const m=new Model(),before=m.snapshot(),a=new LivingCloud(m,240),b=new LivingCloud(m,240);
 for(let i=0;i<30;i++){a.advance(1/30);b.advance(1/30,{rate:4});}
 assert.ok(b.visualTime>a.visualTime*3.9);assert.deepEqual(m.snapshot(),before);
});
test('food changes nearby narration/activity without inventing feeding everywhere',()=>{
 const c=new LivingCloud(new Model(),1800);let i=0;while(c.ids[c.species[i]]!=='bact')i++;
 c.deposit('fiber',c.position(i));c.update();assert.ok(c.activity[i]>.99);assert.match(c.thought(i),/волокно/);
 c.deposits=[];c.update();assert.equal(c.activity[i],0);
});
test('visual representatives remain bounded above the local tissue for every habitat',()=>{
 for(const site of['colon','mouth','skin','nose','lung','stomach','small','vagina','urinary']){
  const c=new LivingCloud(new Model(site),240);for(let j=0;j<120;j++)c.advance(1/30,{rate:2});
  for(let i=0;i<c.count;i++){assert.ok(c.position(i).every(Number.isFinite));assert.ok(Math.abs(c.x[i])<=30&&Math.abs(c.z[i])<=30);assert.ok(c.y[i]>heightAt(site,c.x[i],c.z[i])-.2);}
 }
});
test('coarse geometry cuts triangle cost and each species has its own visual colour',()=>{
 const fine=microbeGeometry(),coarse=lightMicrobeGeometry();
 for(const key in fine)assert.ok(coarse[key].indices.length<fine[key].indices.length);
 assert.notEqual(liveColor('faec'),liveColor('bact'));assert.notEqual(liveColor('phage'),liveColor('coli'));
});
test('human geometry and clipped cutaway have finite normals and valid indices',()=>{
 const human=humanGeometry();for(const g of[human.skin,human.window,...human.features.map(f=>f.mesh)]){assert.ok(g.vertices.every(Number.isFinite));assert.ok(g.indices.every(i=>i<g.vertices.length/6));}
 const halves=splitPlane(sphere(),0,0);for(const i of halves[0].indices)assert.ok(halves[0].vertices[i*6]>=-1e-8);for(const i of halves[1].indices)assert.ok(halves[1].vertices[i*6]<=1e-8);
});
