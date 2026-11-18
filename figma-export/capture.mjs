import express from 'express';
import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createApp } from '../backend/src/app.js';
import { MemoryRepository } from '../backend/tests/support/memoryRepository.js';
import { createProviders } from '../backend/src/providers/index.js';
import { createAuthService } from '../backend/src/services/authService.js';
import { createTripPlannerService } from '../backend/src/services/tripPlannerService.js';
import { tripFixture } from '../backend/tests/support/fixture.js';

const out=resolve('figma-export'); await mkdir(out+'/previews',{recursive:true});
await mkdir(out+'/temp',{recursive:true});process.env.TEMP=out+'/temp';process.env.TMP=out+'/temp';
const base='http://127.0.0.1:5186';
const repository=new MemoryRepository();
const getBaseTrip=repository.getTrip.bind(repository);
repository.getTrip=async(userId,id)=>{const trip=await getBaseTrip(userId,id);trip.plans=[...repository.plans.values()].filter(p=>p.tripId===id).map(p=>({id:p.id,version:p.version,title:p.title,isSelected:p.isSelected,isSaved:p.isSaved,createdAt:p.createdAt}));return trip;};
const config={mock:true,production:false,clientOrigin:base,sessionDays:7,trustProxy:false};
const providers=createProviders(config),auth=createAuthService(repository,config),planner=createTripPlannerService(repository,providers);
const app=express();app.use('/api',(req,res,next)=>{req.url='/api'+req.url;return createApi(req,res,next)});
const createApi=createApp({repository,providers,config});
app.use(express.static(resolve('frontend/dist')));app.get('/{*path}',(req,res)=>res.sendFile(resolve('frontend/dist/index.html')));
const server=app.listen(5186,'127.0.0.1');
console.log('Starting render browser');
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,timeout:30000,args:['--disable-dev-shm-usage']});
console.log('Render browser ready');
const screens=[],assets={};

async function snapshot(page,name,group,dialog=false){
  console.log('Extracting '+group+' '+name);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('img').evaluateAll(ims=>Promise.all(ims.map(im=>{im.loading='eager';return im.decode().catch(()=>{});} )));
  await page.evaluate(()=>{document.querySelectorAll('.toast').forEach(e=>e.style.display='none');window.scrollTo(0,0);});
  if(dialog)await page.locator('dialog').evaluate(e=>{e.style.maxHeight='none';e.style.position='relative';e.style.margin='20px auto';});
  const data=await page.evaluate(({dialog})=>{
    const root=dialog?document.querySelector('dialog'):document.body;
    const rr=root.getBoundingClientRect();const ox=dialog?rr.x:0,oy=dialog?rr.y:0;
    const W=dialog?rr.width:innerWidth,H=dialog?rr.height:Math.max(document.body.scrollHeight,innerHeight);
    const nodes=[];
    const color=c=>{const m=c.match(/[\d.]+/g);return m?{r:+m[0]/255,g:+m[1]/255,b:+m[2]/255,a:m[3]===undefined?1:+m[3]}:null;};
    const bounds=e=>{const r=e.getBoundingClientRect();return {x:r.x-ox,y:r.y-oy,w:r.width,h:r.height};};
    function textNode(n,s,parent){
      const value=n.textContent;if(!value.trim())return;
      const lines=[];const range=document.createRange();
      for(let i=0;i<value.length;i++){
        range.setStart(n,i);range.setEnd(n,i+1);const r=range.getBoundingClientRect();
        if(r.width<.01||r.height<.01)continue;
        let line=lines.find(l=>Math.abs(l.top-r.top)<2);
        if(!line){line={top:r.top,left:r.left,right:r.right,height:r.height,text:''};lines.push(line);}
        line.left=Math.min(line.left,r.left);line.right=Math.max(line.right,r.right);line.height=Math.max(line.height,r.height);line.text+=value[i];
      }
      for(const l of lines){let text=l.text.replace(/\s+/g,' ');if(!text.trim())continue;if(s.textTransform==='uppercase')text=text.toUpperCase();
        nodes.push({type:'text',name:text.slice(0,70),text,x:l.left-ox,y:l.top-oy,w:l.right-l.left,h:l.height,color:color(s.color),font:s.fontFamily,size:parseFloat(s.fontSize),weight:parseInt(s.fontWeight),italic:s.fontStyle==='italic',spacing:parseFloat(s.letterSpacing)||0,dir:s.direction,parent});}
    }
    function walk(e,parent=null){
      if(e.nodeType!==1)return;const s=getComputedStyle(e),b=bounds(e);
      if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0||b.w<.1||b.h<.1||['SCRIPT','STYLE','META','LINK','OPTION'].includes(e.tagName))return;
      if(e.tagName==='DIALOG'&&!dialog)return;
      const id=nodes.length;const node={type:'box',name:e.getAttribute('aria-label')||e.className?.baseVal||String(e.className||e.tagName).slice(0,80),...b,parent,bg:color(s.backgroundColor),gradient:s.backgroundImage,opacity:+s.opacity,radius:[s.borderTopLeftRadius,s.borderTopRightRadius,s.borderBottomRightRadius,s.borderBottomLeftRadius].map(parseFloat),border:color(s.borderTopColor),borderWidth:parseFloat(s.borderTopWidth),clip:s.overflow==='hidden'||s.overflow==='clip',shadow:s.boxShadow};
      if(e.tagName==='svg'){
        const clone=e.cloneNode(true);[e,...e.querySelectorAll('*')].forEach((el,i)=>{const c=[clone,...clone.querySelectorAll('*')][i],st=getComputedStyle(el);for(const k of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin','opacity'])c.setAttribute(k,st.getPropertyValue(k));});
        clone.setAttribute('xmlns','http://www.w3.org/2000/svg');node.type='svg';node.svg=clone.outerHTML;nodes.push(node);return;
      }
      if(e.tagName==='IMG'){node.type='image';node.src=e.currentSrc;node.fit=s.objectFit;nodes.push(node);return;}
      nodes.push(node);
      if(['INPUT','TEXTAREA','SELECT'].includes(e.tagName)){
        let value=e.tagName==='SELECT'?e.selectedOptions[0]?.textContent:e.type==='password'?'':e.value||e.placeholder;
        if(e.type==='checkbox'||e.type==='radio'){if(e.checked)nodes.push({type:'text',name:'Checked',text:'✓',x:b.x+2,y:b.y,w:b.w,h:b.h,size:12,font:'Inter',weight:600,color:color(s.color),parent:id});}
        else if(value){const px=parseFloat(s.paddingLeft),py=parseFloat(s.paddingTop),fs=parseFloat(s.fontSize);nodes.push({type:'text',name:value.slice(0,70),text:value,x:b.x+px,y:b.y+Math.max(py,(b.h-fs*1.25)/2),w:Math.max(1,b.w-px-parseFloat(s.paddingRight)),h:Math.max(fs*1.3,b.h-py*2),size:fs,font:s.fontFamily,weight:parseInt(s.fontWeight),color:color(s.color),dir:s.direction,parent:id});}
        return;
      }
      const children=[...e.childNodes];
      children.sort((a,b)=>{const z=n=>n.nodeType===1?(parseInt(getComputedStyle(n).zIndex)||0):0;return z(a)-z(b);});
      for(const child of children){if(child.nodeType===3)textNode(child,s,id);else walk(child,id);}
    }
    walk(root);return {w:W,h:H,nodes,bg:color(getComputedStyle(document.body).backgroundColor)};
  },{dialog});
  for(const n of data.nodes){if(n.type==='image'){
    const url=new URL(n.src);const key=url.pathname; if(!assets[key]){const f=resolve('frontend/dist','.'+decodeURIComponent(key));assets[key]={base64:(await readFile(f)).toString('base64'),ext:extname(f)};}n.asset=key;delete n.src;
  }}
  const index=screens.filter(s=>s.group===group).length+1;
  screens.push({name:String(index).padStart(2,'0')+' · '+name,group,...data});
  if(group==='Desktop EN'||name==='Home')await (dialog?page.locator('dialog'):page).screenshot({path:out+'/previews/'+group.replaceAll(' ','-')+'-'+name+'.png',...(dialog?{}:{fullPage:true})});
  await writeFile(out+'/screens.json',JSON.stringify({screens,assets}));
  console.log(group+' / '+name+' / '+data.nodes.length+' layers');
}

try{
for(const group of ['Desktop EN','Desktop AR','Mobile EN','Mobile AR']){
  const ar=group.endsWith('AR'),mobile=group.startsWith('Mobile');
  console.log('Creating context '+group);
  const ctx=await browser.newContext({viewport:{width:mobile?390:1521,height:mobile?844:960},locale:ar?'ar':'en'});
  console.log('Creating page');
  const page=await ctx.newPage();console.log('Page ready');await page.addInitScript(lang=>localStorage.setItem('gilgamish-language',lang),ar?'ar':'en');
  const shot=(name,dialog=false)=>snapshot(page,name,group,dialog);
  const go=async path=>{console.log('Loading '+path);await page.goto(base+path);await page.waitForLoadState('networkidle');};
  for(const [name,path] of [['Home','/'],['Sign in','/login'],['Create account','/register'],['About','/about'],['Contact','/contact'],['Not found','/not-found']]){await go(path);await shot(name);}
  await go('/contact');await page.getByRole('button',{name:ar?'أرسل رسالة · البريد الإلكتروني':'Send a message · Email'}).click();await shot('Contact form',true);
  const user=await auth.register({name:ar?'مسافر جلجامش':'Gilgamish Traveler',email:group.replaceAll(' ','-').toLowerCase()+'@example.com',password:'Sample-traveler-2026',language:ar?'ar':'en'});
  await ctx.addCookies([{name:'gilgamish_session',value:user.token,url:base}]);
  await go('/dashboard');await shot('Dashboard empty');await go('/trips');await shot('My trips empty');
  const trip=await repository.createTrip(user.user.id,tripFixture({language:ar?'ar':'en'}));
  const plan=await planner.generate(user.user.id,trip.id,{});await repository.favorite(user.user.id,plan.id,true);
  await go('/planner?trip='+trip.id);await shot('Trip details');
  await page.getByRole('button',{name:ar?'متابعة':'Continue',exact:true}).click();await shot('Travel preferences');
  await page.getByRole('button',{name:ar?'ابحث عن الطيران والفنادق':'Find flights & hotels',exact:true}).click();await page.locator('.offer-card').first().waitFor();await shot('Flights and hotels');
  await go('/plans/'+plan.id);await shot('Itinerary');
  const close=async()=>{await page.getByRole('button',{name:ar?'إغلاق':'Close',exact:true}).click();};
  for(const [name,en,arab] of [['Modify journey','Modify','تعديل'],['Regenerate itinerary','Regenerate','إعادة الإنشاء'],['Booking','Book now','احجز الآن'],['Adjust budget','Adjust budget →','تعديل الميزانية →']]){
    await page.getByRole('button',{name:ar?arab:en,exact:true}).click();await shot(name,true);await close();
  }
  await page.getByRole('button',{name:ar?'تعديل اليوم':'Edit day',exact:true}).nth(1).click();await shot('Edit day',true);
  await page.getByRole('button',{name:ar?'إعادة إنشاء اليوم':'Regenerate day',exact:true}).click();await shot('Regenerate day',true);await close();
  for(const [name,path] of [['Dashboard','/dashboard'],['My trips','/trips'],['Profile','/profile']]){await go(path);await shot(name);}
  await go('/trips');await page.getByRole('button',{name:ar?'حذف':'Delete',exact:true}).first().click();await shot('Delete trip confirmation',true);await close();
  await go('/profile');
  if(mobile){await page.getByRole('button',{name:ar?'قائمة التنقل':'Navigation',exact:true}).click();await shot('Mobile navigation');}
  await ctx.close();
}
await writeFile(out+'/screens.json',JSON.stringify({screens,assets}));
console.log('COMPLETE '+screens.length+' screens');
}finally{await browser.close();server.close();}
