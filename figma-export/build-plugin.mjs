import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
const dir=new URL('./',import.meta.url);const data=JSON.parse(await readFile(new URL('screens.json',dir),'utf8'));
for(const screen of data.screens){for(const n of screen.nodes){if(n.type==='text'&&n.color?.a===0){const parent=screen.nodes[n.parent];if(parent.gradient?.startsWith('linear-gradient')){n.textGradient=parent.gradient;parent.textClip=true;}}}for(const n of screen.nodes)if(n.textClip)n.gradient='none';}
for(const a of Object.values(data.assets)){const text=Buffer.from(a.base64,'base64').toString('utf8');if(text.includes('<svg'))a.svg=text;}
await mkdir(new URL('plugin/',dir),{recursive:true});
await writeFile(new URL('plugin/code.js',dir),'const DATA='+JSON.stringify(data)+';\n'+await readFile(new URL('plugin-runtime.js',dir),'utf8'));
await writeFile(new URL('plugin/manifest.json',dir),JSON.stringify({name:'Gilgamish Smart — Import Website UI',api:'1.0.0',main:'code.js',ui:'ui.html',editorType:['figma'],documentAccess:'dynamic-page',networkAccess:{allowedDomains:['none']}},null,2));
await copyFile(new URL('ui.html',dir),new URL('plugin/ui.html',dir));
const summary={screens:data.screens.length,layers:data.screens.reduce((s,x)=>s+x.nodes.length,0),groups:[...new Set(data.screens.map(s=>s.group))],assets:Object.keys(data.assets).length};
await writeFile(new URL('summary.json',dir),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
