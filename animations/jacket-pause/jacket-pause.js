import {PixelPen} from '../../engine/pixels.js';
const rgb=h=>h.match(/\w\w/g).map(x=>parseInt(x,16));
const C=Object.fromEntries(Object.entries({ground:'c8bfb3',shade:'a99f94',wood:'765941',woodL:'98775b',woodD:'513e32',black:'292a2d',dark:'202125',mid:'3b3c40',light:'53545a',skin:'c69b79',skinL:'ddb48e',skinD:'a67d5e',hair:'bab9b7',hairL:'cfcec7',hairM:'969592',hairD:'727270',metal:'555c62',edge:'868b8d',fan:'24292d',blade:'697076',gold:'a6925a',ember:'cc8551',smoke:'c4bdb7',green:'76b900',greenD:'477a17',greenL:'99cc39',shadowSoft:'b6ac9f',steel:'a8a8a2',tile:'d4ccc1',grout:'aea497'}).map(([k,v])=>[k,rgb(v)]));
export const config={id:'jacket-pause',title:'A quiet pause',grid:216,loop:12,fps:60,palette:Object.values(C)};
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
export function state(t){const time=((t%12)+12)%12,down=smooth((time-2.8)/1.7)*(1-smooth((time-9.6)/2.4));const nod=smooth((time-4.6)/1.2)*(1-smooth((time-8.5)/1.1));const flick=time>6&&time<6.8?Math.sin((time-6)/.8*Math.PI*4)*1.3:0;const hand=[92+down*14,65+down*38+flick],elbow=[65+down*12,96+down*7];return {time,nod,hand,elbow,tip:[hand[0]+10,hand[1]+2],down};}
export function createRenderer(canvas){canvas.width=canvas.height=216;const ctx=canvas.getContext('2d');let destroyed=false;return {canvas,ctx,draw(t,o={}){if(destroyed)throw Error('destroyed');ctx.clearRect(0,0,216,216);if(o.opaque){ctx.fillStyle='#fff';ctx.fillRect(0,0,216,216)}const s=state(t),p=new PixelPen(ctx);const color=k=>o.stage==='silhouette'?[53,53,54]:o.stage==='values'?((['skin','skinL','hair','hairL','metal','edge'].includes(k))?[185,185,185]:['wood','woodL','ground','shade','tile','grout'].includes(k)?[135,135,135]:[65,65,65]):C[k];const poly=(pts,k)=>p.polygon(pts,color(k)),line=(a,b,k,w=1)=>p.line(a,b,color(k),w),ell=(q,rx,ry,k)=>p.ellipse(q,rx,ry,color(k));
ell([111,177],86,22,'ground');
// Isometric floor tiles clipped to the ground ellipse.
for(let y=155;y<=199;y++)for(let x=25;x<=197;x++){const ex=(x+.5-111)/86,ey=(y+.5-177)/22;if(ex*ex+ey*ey>1)continue;const T=7,a=(x-111)/2+(y-177),b=(111-x)/2+(y-177),ga=((a%T)+T)%T,gb=((b%T)+T)%T;p.pixel(x,y,color(ga<1||gb<1?'grout':(Math.floor(a/T)+Math.floor(b/T))&1?'tile':'ground'));}
// Fixed upper-right light. Shoe contact stays fixed; upper-body cast shadow follows nod/arm.
ell([50-s.nod*2,179+s.nod],20,5,'shadowSoft');
poly([[68,183],[58,179],[48-s.nod*2,175+s.nod],[36-s.nod*2,177+s.nod],[34-s.nod*2,180+s.nod],[45,183],[61,186]],'shade');
ell([68,182],12,3,'shade');ell([48-s.down*2,181],8,2,'shade');ell([155,172],28,5,'shade');ell([110,177],23,4,'shade');
// rack fixed construction and three splayed feet
line([157,49],[157,166],'woodD',5);line([156,49],[156,165],'wood',3);line([155,52],[155,162],'woodL');
poly([[155,159],[149,168],[137,172],[137,174],[144,175],[156,168],[158,164]],'wood');poly([[158,160],[164,165],[175,170],[179,172],[174,174],[161,169],[156,165]],'wood');poly([[155,164],[156,179],[162,180],[161,176],[159,164]],'woodD');line([156,166],[159,177],'woodL');
p.polyline([[156,60],[144,60],[140,55],[140,50]],color('wood'),3);p.polyline([[158,61],[171,57],[174,51]],color('wood'),3);ell([140,49],2.6,3,'woodL');ell([174,49],2.6,3,'woodL');ell([156,43],4,4,'wood');ell([155,42],2.5,2,'woodL');
{
// Native-cell pose blending: no larger raster or global filter.
const sway=Math.sin(s.time*Math.PI/6)*3.6;
const oldSway=Math.round(Math.sin(s.time*Math.PI/6)*.95*8)/8;
line([159+oldSway/70,64],[162,57],'edge');p.polyline([[162,57],[160,55],[158,56]],color('edge'));
const baseline=p.data.slice();
const drawCoat=(sway)=>{
const jq=([x,y])=>[x+sway*Math.max(0,y-75)/58,y];
const jpoly=(pts,k)=>poly(pts.map(jq),k),jline=(a,b,k,w=1)=>line(jq(a),jq(b),k,w);
// Leather jacket: raised shirt collar, deep open V and crisp folded planes.
jpoly([[151,64],[146,67],[138,73],[134,85],[132,105],[133,126],[139,128],[144,108],[144,130],[170,133],[175,126],[175,103],[178,128],[185,127],[184,103],[180,79],[171,70],[164,64]],'black');
jpoly([[143,73],[139,81],[137,102],[135,123],[139,124],[144,99],[148,81]],'mid');jpoly([[173,76],[179,84],[181,108],[181,124],[184,125],[181,97],[178,81]],'mid');
jpoly([[147,83],[146,107],[148,128],[156,129],[155,91]],'mid');jpoly([[163,87],[162,107],[169,130],[172,124],[171,95]],'mid');
jpoly([[151,66],[156,63],[163,64],[166,69],[163,82],[157,94],[151,82],[149,73]],'dark');
jpoly([[151,65],[147,72],[145,83],[151,80],[156,92],[153,78]],'light');jpoly([[152,68],[150,73],[150,79],[154,86],[152,76]],'black');
jpoly([[163,65],[166,69],[170,78],[166,79],[157,94],[161,79]],'light');jpoly([[163,69],[166,74],[166,77],[161,86],[163,77]],'mid');
jline([146,83],[156,95],'edge');jline([166,80],[157,95],'edge');jline([156,95],[157,130],'edge');jline([158,96],[159,129],'dark');
jline([147,105],[150,99],'edge');jline([168,103],[171,114],'edge');jline([146,106],[149,101],'dark');jline([167,104],[170,115],'dark');
jline([135,123],[140,125],'light');jline([178,124],[184,125],'light');jline([147,128],[170,131],'dark',2);
// Fixed native crease whose lighting breathes continuously with the cloth.
const f=(Math.sin(s.time*Math.PI/6+.8)+1)*.5;
const shade=C.mid.map((v,i)=>Math.round(v+(C.light[i]-v)*(.35+.55*f)));
p.line(jq([170,92]),jq([172,111]),shade,1);
};
const lo=Math.floor(sway),hi=Math.ceil(sway),w=sway-lo;
drawCoat(lo);const lower=p.data.slice();p.data.set(baseline);drawCoat(hi);
for(let i=0;i<p.data.length;i+=4){
 const a=lower[i+3]*(1-w),b=p.data[i+3]*w,sum=a+b;
 for(let k=0;k<3;k++)p.data[i+k]=sum?Math.round((lower[i+k]*a+p.data[i+k]*b)/sum):0;
 p.data[i+3]=Math.round(sum);
}
}
if(o.emptyStage){p.finish();return s;}
// Dark hourglass frame, paired fans, and fine side vents.
// Green is a restrained accent on the card, not a logo.
poly([[86,163],[121,155],[135,159],[135,181],[97,189],[85,184]],'dark');
poly([[86,163],[121,155],[135,159],[97,168]],'greenD');poly([[105,160],[121,156],[132,159],[116,163]],'green');line([101,160],[120,156],'light');
poly([[97,168],[135,159],[135,181],[97,189]],'black');poly([[86,163],[97,168],[97,189],[85,184]],'metal');
for(let y=169;y<183;y+=3)line([88,y],[93,y+1],'dark',1);
line([98,168],[134,160],'steel');line([98,188],[134,180],'edge');
poly([[98,168],[103,167],[115,173],[128,162],[134,160],[119,175],[133,181],[128,182],[115,178],[103,187],[98,188],[111,175]],'greenD');
line([109,170],[115,174],'greenL');line([115,174],[123,165],'greenL');line([116,177],[124,181],'green');line([98,188],[110,185],'green');line([127,182],[134,180],'green');
for(const [x,y] of [[105,178],[127,172]]){ell([x,y],7.2,8,'metal');ell([x,y],6.2,7,'fan');for(let j=0;j<7;j++){const a=s.time*Math.PI*2+j*Math.PI*2/7;const pt=(r,off)=>[x+Math.cos(a+off)*r,y+Math.sin(a+off)*r*1.03];poly([[x,y],pt(5.8,-.1),pt(5.6,.34),pt(2,.7)],'blade');}ell([x,y],2.1,2.2,'metal');ell([x-.5,y-.5],1.2,1.2,'mid');}
line([103,188],[118,185],'gold',2);line([119,158],[127,157],'green',1);line([89,166],[94,168],'green',1);
// legs preserve two distinct supports: straight rear leg and bent raised knee
poly([[66,113],[82,115],[80,137],[75,157],[74,176],[64,176],[63,157],[65,136]],'black');poly([[66,119],[72,122],[70,154],[68,172],[64,171],[65,148]],'mid');poly([[80,116],[91,115],[110,133],[109,139],[99,160],[88,160],[94,141],[81,134],[75,128]],'black');poly([[84,122],[106,134],[102,140],[91,134],[79,126]],'mid');poly([[102,140],[96,157],[91,157],[96,141]],'mid');line([94,138],[106,136],'light');line([103,140],[99,145],'dark');line([65,167],[73,166],'dark');line([90,156],[98,156],'dark');
// shoes sitting directly on the two support planes
poly([[63,173],[73,174],[77,181],[80,184],[78,188],[68,188],[60,184],[60,178]],'dark');poly([[63,175],[70,176],[73,182],[77,184],[69,184],[63,181]],'mid');line([61,184],[68,187],'light');line([69,187],[78,187],'light');
poly([[89,157],[98,157],[101,162],[110,163],[113,165],[109,169],[96,169],[86,166],[86,161]],'dark');poly([[89,159],[96,159],[99,163],[107,164],[108,166],[96,166],[88,164]],'mid');line([88,166],[96,168],'light');line([96,168],[109,168],'light');
// Squared shoulders, straight hem and a visible belt separate torso/pelvis.
poly([[69,69],[79,66],[88,71],[94,80],[95,88],[89,90],[90,111],[88,116],[65,119],[60,114],[59,90],[58,85],[60,76]],'black');
poly([[62,77],[69,73],[71,91],[68,111],[64,115],[62,107]],'mid');poly([[77,74],[86,76],[89,84],[87,106],[85,112],[71,115],[74,94]],'mid');
line([60,85],[67,87],'light');line([63,77],[69,80],'dark');line([69,80],[70,86],'dark');line([88,87],[94,88],'dark');line([66,115],[87,112],'light');
poly([[65,116],[88,113],[89,118],[65,122]],'dark');line([66,118],[87,115],'mid');
poly([[80,115],[86,114],[86,119],[80,120]],'edge');poly([[81,116],[85,115],[85,118],[81,119]],'dark');line([83,117],[86,116],'steel');
line([69,117],[69,121],'black',2);line([77,116],[77,120],'black',2);line([87,115],[88,119],'black',2);
line([79,122],[80,130],'dark');line([68,125],[64,134],'dark');line([84,129],[98,137],'dark');
poly([[70,65],[77,61],[85,65],[85,73],[78,77],[70,72]],'skinD');line([71,73],[78,77],'dark',2);
// relaxed arm behind front arm
poly([[89,83],[95,83],[96,104],[99,116],[98,125],[94,128],[91,126],[92,118],[90,106]],'skin');line([94,87],[94,105],'skinL',3);poly([[94,116],[99,118],[99,124],[96,129],[94,127],[95,121],[92,124],[91,121]],'skinL');
// head tilt: voluminous swept-back silver hair, half-rim glasses, brows and a warm smile
const head=pts=>pts.map(([x,y])=>{const a=s.nod*.23;return [78+(x-78)*Math.cos(a)-(y-70)*Math.sin(a),70+(x-78)*Math.sin(a)+(y-70)*Math.cos(a)];});
const hp=(pts,k)=>poly(head(pts),k),hl=(a,b,k,w=1)=>line(head([a])[0],head([b])[0],k,w),hpx=(x,y,k)=>{const [q]=head([[x,y]]);p.pixel(q[0],q[1],color(k));};
// face: broad cheeks, lit front plane, shaded jaw
hp([[69,46],[78,40],[88,42],[94,48],[95,55],[96,61],[94,64],[93,68],[90,72],[85,74],[78,71],[72,63],[66,56]],'skin');
hp([[79,47],[91,46],[94,54],[93,62],[91,68],[85,71],[79,66],[74,57]],'skinL');
hp([[72,61],[77,67],[82,72],[85,74],[78,71]],'skinD');
// ear and sideburn
ell(head([[71,57]])[0],2.6,3.4,'skin');hl([70,55],[72,59],'skinD');hpx(71,57,'skinD');
// hair: tall silver crown swept back, darker temples
hp([[64,47],[63,40],[66,34],[71,30],[79,27],[87,28],[93,31],[96,36],[97,42],[95,47],[92,48],[91,43],[86,43],[80,46],[73,49],[70,55],[66,54]],'hairM');
hp([[66,40],[70,33],[78,29],[86,29],[92,32],[95,37],[90,36],[84,35],[77,37],[70,41]],'hair');
hp([[69,36],[75,31],[83,30],[89,31],[92,33],[85,32],[78,33],[72,36]],'hairL');
hl([94,38],[80,35],'hairL');hl([95,42],[78,39],'hairL');hl([93,34],[83,31],'hairL');hl([90,44],[74,44],'hair');hl([88,40],[72,42],'hairM');
hp([[64,46],[68,47],[71,52],[70,57],[66,54]],'hairD');hl([71,49],[72,54],'hairM');hp([[90,44],[94,45],[95,48],[92,49]],'hairM');
// brows and smiling, slightly squinted eyes
hl([80,54],[85,53],'hairD');hl([88,53],[93,53],'hairD');
hl([81,58],[83,58],'dark');hl([90,57],[92,57],'dark');
// half-rim glasses: heavy top bar, fine lower rim, temple arm to the ear
hl([72,55],[79,56],'dark');
hl([79,55],[86,55],'dark',2);hl([88,54],[95,54],'dark',2);
p.polyline(head([[79,56],[80,60],[85,60],[86,56]]),color('metal'));
p.polyline(head([[88,55],[89,59],[94,59],[95,55]]),color('metal'));
hl([86,55],[88,55],'dark');
// nose, laugh lines and an open smile
hl([87,57],[89,63],'skinD');hpx(88,64,'skinD');hpx(90,64,'skinD');
hl([85,63],[84,67],'skinD');hl([93,62],[93,66],'skinD');
p.polyline(head([[84,66],[88,66.5],[92,66]]),color('skinD'));
hl([85,67],[91,67],'hairL');
p.polyline(head([[86,68],[88,68.5],[90,68]]),color('skinD'));
// connected smoking arm: elbow and hand share one trajectory
const sh=[63,85],el=s.elbow,h=s.hand;
line(sh,el,'skinD',9);ell(el,4.5,4.5,'skin');line(el,h,'skin',7);line([el[0]-1,el[1]-1],[h[0]-1,h[1]-1],'skinL',4);ell(h,3.3,3.2,'skinL');line([h[0]-2,h[1]-2],[h[0]+3,h[1]-3],'skinL',2);
line([h[0]+1,h[1]-1],s.tip,'hairL',2);ell(s.tip,1.2,1.2,'ember');
// Smoke follows the actual historic emitter positions, rising continuously.
if(!o.stage && o.effects!==false){for(let strand=0;strand<1;strand++){let prev=null;for(let i=0;i<20;i++){const age=i/14,old=state(t-age),wind=Math.sin((t-age)*Math.PI/3+age*10+strand)*(.4+age*4);const q=[old.tip[0]+wind+age*2+strand*.7,old.tip[1]-age*36];const v=Math.round(184+age*37);const col=[v,Math.min(249,v-2),Math.min(249,v-4)];if(prev && (i<12 || i%3!==0))p.line(prev,q,col,1);prev=q;}}
// Two ash flakes fall onto the authored GPU top, dwell, then fade into its green.
for(const [idx,start] of [6.18,6.58].entries()){
const a=s.time-start,flight=.75,land=[119+idx*3,160-idx];
if(a>=0 && s.time<11.6){
 const old=state(start),u=Math.min(1,a/flight);
 const q=u<1?[old.tip[0]+(land[0]-old.tip[0])*u,old.tip[1]+(land[1]-old.tip[1])*u*u]:land;
 const fade=smooth((s.time-9.1)/2.5),base=[118,185,0];
 const ash=[199,194,180].map((v,k)=>Math.round(v*(1-fade)+base[k]*fade));
 p.pixel(q[0],q[1],ash);if(u===1)p.pixel(q[0]+1,q[1],ash);
}
}

}
p.finish();return s;},capture(scale=3){const out=document.createElement('canvas');out.width=out.height=216*scale;const c=out.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(canvas,0,0,out.width,out.height);return out.toDataURL('image/png').split(',')[1]},destroy(){destroyed=true;ctx.clearRect(0,0,216,216)}};}
export default{config,state,createRenderer};
