// Local, network-free import of the Gilgamish website's rendered design layers.
figma.showUI(__html__, {width:420,height:310,themeColors:true});
const importedImages={},fonts={},warnings=[];
const rgb=c=>({r:c.r,g:c.g,b:c.b});
const solid=c=>({type:'SOLID',color:rgb(c),opacity:c.a===undefined?1:c.a});
const pause=()=>new Promise(resolve=>setTimeout(resolve,1));
function gradient(css){
  if(!css||!css.startsWith('linear-gradient('))return null;
  const matches=[...css.matchAll(/rgba?\(([^)]+)\)\s*([\d.]+%)?/g)];
  if(matches.length<2)return null;
  const stops=matches.map((m,i)=>{const a=m[1].split(',').map(Number);return {position:m[2]?parseFloat(m[2])/100:i/(matches.length-1),color:{r:a[0]/255,g:a[1]/255,b:a[2]/255,a:a[3]===undefined?1:a[3]}}});
  const degrees=parseFloat(css.slice(16));const angle=(Number.isFinite(degrees)?degrees:180)*Math.PI/180;
  const dx=Math.sin(angle),dy=-Math.cos(angle);
  return {type:'GRADIENT_LINEAR',gradientTransform:[[dx,dy,.5-.5*dx-.5*dy],[-dy,dx,.5+.5*dy-.5*dx]],gradientStops:stops};
}
function fontKey(n){return n.font+'|'+n.weight+'|'+n.italic;}
async function prepareFonts(){
  const available=await figma.listAvailableFontsAsync();
  for(const screen of DATA.screens)for(const n of screen.nodes){if(n.type!=='text'||fonts[fontKey(n)])continue;
    const families=n.font.split(',').map(s=>s.trim().replace(/["']/g,''));
    if(n.dir==='rtl')families.unshift('Noto Naskh Arabic');families.push('Inter');
    const styles=n.italic?(n.weight>=600?['Bold Italic','SemiBold Italic','Italic']:['Italic','Regular']):n.weight>=700?['Bold','SemiBold','Semi Bold','Regular']:n.weight>=550?['SemiBold','Semi Bold','Medium','Bold','Regular']:['Regular','Normal','Medium'];
    let selected;
    for(const family of families){for(const style of styles){selected=available.find(f=>f.fontName.family===family&&f.fontName.style===style);if(selected)break;}if(selected)break;}
    const font=selected?selected.fontName:{family:'Inter',style:'Regular'};await figma.loadFontAsync(font);fonts[fontKey(n)]=font;
  }
}
function makeNode(n){
  let node;
  if(n.type==='text'){
    node=figma.createText();node.fontName=fonts[fontKey(n)];node.fontSize=n.size||14;node.characters=n.text;
    node.fills=n.textGradient?[gradient(n.textGradient)]:[solid(n.color||{r:0,g:0,b:0,a:1})];node.letterSpacing={unit:'PIXELS',value:n.spacing||0};
    node.textAutoResize='NONE';node.resize(Math.max(1,n.w+2),Math.max(1,n.h+3));
    node.textAlignHorizontal=n.dir==='rtl'?'RIGHT':'LEFT';node.textAlignVertical='CENTER';
  }else if(n.type==='svg'){
    try{node=figma.createNodeFromSvg(n.svg);node.resize(n.w,n.h);}catch(e){warnings.push('SVG '+n.name);node=figma.createFrame();node.fills=[];}
  }else if(n.type==='image'){
    const asset=DATA.assets[n.asset];
    if(asset.svg){node=figma.createNodeFromSvg(asset.svg);node.resize(n.w,n.h);}
    else{node=figma.createRectangle();node.resize(n.w,n.h);if(!importedImages[n.asset])importedImages[n.asset]=figma.createImage(figma.base64Decode(asset.base64)).hash;
      node.fills=[{type:'IMAGE',imageHash:importedImages[n.asset],scaleMode:n.fit==='contain'?'FIT':'FILL'}];}
  }else{
    node=figma.createFrame();node.resize(Math.max(.01,n.w),Math.max(.01,n.h));node.fills=[];node.clipsContent=!!n.clip;
    if(n.bg&&n.bg.a>0)node.fills=[solid(n.bg)];const g=gradient(n.gradient);if(g)node.fills=[...node.fills,g];
    if(n.borderWidth>0&&n.border?.a>0){node.strokes=[solid(n.border)];node.strokeWeight=n.borderWidth;node.strokeAlign='INSIDE';}
    const shadow=n.shadow&&n.shadow.match(/rgba?\(([^)]+)\)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px/);
    if(shadow&&!n.shadow.includes('inset')){const c=shadow[1].split(',').map(Number);node.effects=[{type:'DROP_SHADOW',color:{r:c[0]/255,g:c[1]/255,b:c[2]/255,a:c[3]??1},offset:{x:+shadow[2],y:+shadow[3]},radius:+shadow[4],visible:true,blendMode:'NORMAL'}];}
  }
  if(n.radius&&'topLeftRadius' in node){const max=Math.min(n.w,n.h)/2;node.topLeftRadius=Math.min(max,n.radius[0]||0);node.topRightRadius=Math.min(max,n.radius[1]||0);node.bottomRightRadius=Math.min(max,n.radius[2]||0);node.bottomLeftRadius=Math.min(max,n.radius[3]||0);}
  node.name=n.name||n.type;if(n.opacity!==undefined)node.opacity=n.opacity;return node;
}
async function run(){
  const existing=figma.currentPage.children.filter(n=>n.type==='SECTION'&&n.name.endsWith(' · Editable website screens'));
  if(existing.reduce((sum,n)=>sum+n.children.length,0)===DATA.screens.length){
    let corrected=0,textCount=0;
    for(const s of DATA.screens){const section=existing.find(n=>n.name.startsWith(s.group+' ·'));const frame=section.children.find(n=>n.name===s.name);const mapped=[],cursors=new Map();
      for(let j=0;j<s.nodes.length;j++){const n=s.nodes[j],parent=n.parent===null?frame:mapped[n.parent];if(!parent||!('children' in parent))continue;const index=cursors.get(parent.id)||0;const node=parent.children[index];cursors.set(parent.id,index+1);mapped[j]=node;if(!node)continue;
        if(n.textClip){node.fills=[];corrected++;}if(n.type==='text'){textCount++;if(n.textGradient)node.fills=[gradient(n.textGradient)];}
      }
    }
    const hero=existing.find(n=>n.name.startsWith('Desktop EN')).children.find(n=>n.name==='01 · Home');figma.currentPage.selection=[hero];figma.viewport.scrollAndZoomIntoView([hero]);
    figma.ui.postMessage({status:'Verified: '+DATA.screens.length+' screens · '+textCount+' editable text layers · '+corrected+' heading refinements',done:true});return;
  }
  figma.ui.postMessage({status:'Loading fonts…'});await prepareFonts();
  const pageName='Gilgamish Smart · Website UI · 2026-10-13';const page=figma.currentPage.name===pageName?figma.currentPage:figma.createPage();page.name=pageName;await figma.setCurrentPageAsync(page);
  let groupY=0,count=0,totalNodes=0;const firstFrames=[];
  for(const group of [...new Set(DATA.screens.map(s=>s.group))]){
    const sectionName=group+' · Editable website screens';const section=page.children.find(n=>n.name===sectionName)||figma.createSection();section.name=sectionName;section.x=0;section.y=groupY;
    section.fills=[solid({r:.14,g:.13,b:.12,a:1})];
    const list=DATA.screens.filter(s=>s.group===group);const columns=group.startsWith('Mobile')?6:5;const cellW=group.startsWith('Mobile')?470:1640;let y=100,rowH=0,maxW=0;
    for(let i=0;i<list.length;i++){
      const s=list[i];if(i>0&&i%columns===0){y+=rowH+130;rowH=0;}
      const frame=section.children.find(n=>n.name===s.name)||figma.createFrame();frame.name=s.name;frame.resize(s.w,s.h);frame.fills=[solid({r:252/255,g:246/255,b:237/255,a:1})];frame.clipsContent=true;
      section.appendChild(frame);frame.x=80+(i%columns)*cellW;frame.y=y;
      if(i===0)firstFrames.push(frame);const created=[];
      for(let j=0;j<s.nodes.length;j++){
        const n=s.nodes[j];try{const node=makeNode(n);const parent=n.parent===null?frame:created[n.parent];
          (parent&&'appendChild' in parent?parent:frame).appendChild(node);
          const p=n.parent===null?{x:0,y:0}:s.nodes[n.parent];node.x=n.x-p.x;node.y=n.y-p.y;created[j]=node;totalNodes++;
        }catch(e){warnings.push(s.name+' / '+n.name+' / '+String(e));}
      }
      rowH=Math.max(rowH,s.h);maxW=Math.max(maxW,frame.x+s.w);count++;
      figma.ui.postMessage({status:'Imported '+count+' / '+DATA.screens.length+' screens',count,total:DATA.screens.length});await pause();
    }
    const h=y+rowH+100;section.resizeWithoutConstraints(maxW+80,h);groupY+=h+400;
  }
  console.log('Import report',JSON.stringify({screens:count,nodes:totalNodes,warnings}));
  figma.currentPage.selection=[];figma.viewport.scrollAndZoomIntoView(firstFrames.slice(0,1));
  figma.ui.postMessage({status:'Complete: '+count+' editable screens · '+totalNodes+' layers',done:true,warnings:warnings.length});
  figma.notify('Imported '+count+' editable screens', {timeout:8000});
}
let started=false;figma.ui.onmessage=async message=>{if(message.type==='close')figma.closePlugin();if(message.type==='import'&&!started){started=true;try{await run();}catch(e){figma.ui.postMessage({status:'Import error: '+String(e),error:true});console.error(e);}}};
