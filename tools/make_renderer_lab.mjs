// Optional maintainer tool. Runtime/offline users do not install Node or esbuild.
import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const result=await build({entryPoints:[new URL('src/render-lab/app.js',root).pathname],bundle:true,format:'iife',
 minify:true,target:'es2022',legalComments:'inline',write:false});
let html=await readFile(new URL('renderer-lab.html',root),'utf8');
const css=await readFile(new URL('renderer-lab.css',root),'utf8');
const license=await readFile(new URL('vendor/three/LICENSE',root),'utf8');
html=html.replace('<link rel="stylesheet" href="renderer-lab.css">',`<style>${css}</style>`)
 .replace('<script type="module" src="src/render-lab/app.js"></script>',
  `<script>/* Three.js 0.186.1 — ${license} */\n${result.outputFiles[0].text.replace(/<\/script/gi,'<\\/script')}</script>`);
await writeFile(new URL('renderer-lab-standalone.html',root),html);
console.log('renderer-lab-standalone.html:',Buffer.byteLength(html),'bytes; local code, no runtime imports.');
