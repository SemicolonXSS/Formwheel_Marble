const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const game=path.basename(root).endsWith('Cook')?'cook':'marble';
function setup(initial={},stored={}){
 const nodes=new Map(),intervals=[],listeners={},store=new Map(Object.entries(stored)),data=structuredClone(initial),subs=[];
 const snap=v=>({val:()=>v??null,exists:()=>v!=null});
 const at=p=>p.split('/').reduce((x,k)=>x?.[k],data);
 const write=(p,v)=>{const bits=p.split('/');let o=data;for(const bit of bits.slice(0,-1))o=o[bit]??={};o[bits.at(-1)]=v;for(const sub of subs)if(p.startsWith(sub.path)||sub.path.startsWith(p))sub.fn(snap(at(sub.path)))};
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',value:'',style:{},hidden:false,disabled:false,events:{},classList:{add(){},remove(){},toggle(){}},setAttribute(){},append(){},addEventListener(t,f){this.events[t]=f},contentWindow:{resetAll(){},postMessage(){}},contentDocument:{getElementById(){return {textContent:'0'}}}});return nodes.get(id)}
 const ctx=vm.createContext({console,structuredClone,crypto:{randomUUID:()=> 'participant',getRandomValues:a=>a.fill(1)},URLSearchParams,Date,Math,Number,Map,Set,Promise,location:{origin:'http://local',search:'',href:'',reload(){}},document:{getElementById:node,querySelector:()=>node('main'),createElement:()=>node('status')},sessionStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},navigator:{clipboard:{writeText:async()=>{}}},alert(){},prompt(){},MutationObserver:class{observe(){}disconnect(){}},setInterval:f=>intervals.push(f),clearInterval(){},setTimeout,initializeApp:()=>({}),getDatabase:()=>({}),getAuth:()=>({currentUser:{uid:'authUid'},authStateReady:async()=>{}}),signInAnonymously:async()=>{},serverTimestamp:()=>Date.now(),ref:(_,p)=>p,get:async p=>snap(structuredClone(at(p))),set:async(p,v)=>write(p,v),update:async()=>{},onValue:(p,f)=>{if(p==='.info/serverTimeOffset')f(snap(0));else if(p==='.info/connected')f(snap(true));else{subs.push({path:p,fn:f});f(snap(structuredClone(at(p))))}return ()=>{}},runTransaction:async(p,f)=>{const next=f(structuredClone(at(p)??null));if(next===undefined)return {committed:false,snapshot:snap(at(p))};write(p,next);return {committed:true,snapshot:snap(next)}}});
 ctx.window={addEventListener:(t,f)=>listeners[t]=f};
 let helper=fs.readFileSync(path.join(root,'assets/battle-session.js'),'utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const html=fs.readFileSync(path.join(root,'battle.html'),'utf8');let script=html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import[^\n]+\n/gm,'');
 vm.runInContext(helper+'\n'+script,ctx);
 return {ctx,nodes,node,data,store,intervals,listeners,write,ready:()=>new Promise(r=>setImmediate(r))};
}
const room=(host='participant')=>({host,phase:'playing',startedAt:Date.now()-600000,players:{participant:{name:'me',score:80},other:{name:'other',score:70}},seed:1,map:'classic'});
function seed(r){return {formwheelBattles:{[game]:{ABCDEF:r}}}}
function saved(){return {['fw:battle:session:'+game]:JSON.stringify({id:'participant',code:'ABCDEF'})}}
test('refresh restores the same player and the room',async()=>{const r=room();r.phase='waiting';const h=setup(seed(r),saved());await h.ready();assert.equal(vm.runInContext('code',h.ctx),'ABCDEF');assert.equal(vm.runInContext('id',h.ctx),'participant');assert.equal(h.data.formwheelBattles[game].ABCDEF.players.participant.score,80)});
test('a remaining non-host ends an expired battle',async()=>{const h=setup(seed(room('other')),saved());await h.ready();for(const f of h.intervals)await f();assert.equal(h.data.formwheelBattles[game].ABCDEF.phase,'finished')});
test('deleted room is cleared from the resume session',async()=>{const h=setup({},saved());await h.ready();assert.equal(JSON.parse(h.store.get('fw:battle:session:'+game)).code,'')});
if(game==='marble')test('all marbles eliminated produces a completed draw',async()=>{const r=room();r.startedAt=Date.now();const h=setup(seed(r),saved());await h.ready();const key=vm.runInContext('activeRace',h.ctx);await h.listeners.message({origin:'http://local',source:h.node('marbleGame').contentWindow,data:{type:'fw-marble-battle-result',winner:null,reason:'all-eliminated',raceKey:key}});assert.equal(h.data.formwheelBattles.marble.ABCDEF.phase,'finished');assert.equal(h.data.formwheelBattles.marble.ABCDEF.finishReason,'all-eliminated')});
