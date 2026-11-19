/* V112 止痛药（医院/实验室双通道生产，回 40 血）+ 药物资源禁止直接回血 */
const fs = require('fs');
const html = fs.readFileSync('/workspace/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
code = code.slice(0, bootIdx) + "window.__T = { Game, Battle, UI, DATA };\n})();";
const elems = {};
function mkEl(){ return { innerHTML:'', textContent:'', style:{ setProperty(){} }, disabled:false, scrollTop:0, value:'', dataset:{}, children:[], className:'', classList:{toggle(){},add(){},remove(){},contains:()=>false}, setAttribute(){}, removeAttribute(){}, appendChild(c){this.children.push(c);return c;}, remove(){}, addEventListener(){}, focus(){}, blur(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getBoundingClientRect(){return{width:400,height:700,top:0,left:0};} }; }
global.document = { getElementById:id=>elems[id]||(elems[id]=mkEl()), querySelector:()=>mkEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>mkEl(), body:mkEl() };
global.window = { addEventListener(){}, location:{search:''}, scrollTo(){}, innerWidth:400, innerHeight:700 };
global.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
global.navigator = { userAgent:'node' };
eval(code);
const assert=(c,n)=>console.log(c?'PASS '+n:'FAIL '+n);
const { Game, Battle, UI, DATA } = window.__T;
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkDuty(cls, name){ const c = Game.createChar(cls, name); c.stamina = 9999; c.injured = false; g.chars.push(c); return c; }

(async () => {
  // T1 道具定义：止痛药 flatHeal 40
  const pk = DATA.EQUIPS.painkiller;
  assert(pk && pk.consumable && pk.slot==='item' && pk.skill.flatHeal===40, 'T1 止痛药定义：消耗品回 40 血');

  // T2 双通道配置
  const P = DATA.PRODUCE.painkiller;
  assert(Array.isArray(P.building) && P.building.includes('hospitalLv') && P.building.includes('labLv'), 'T2a 医院或实验室双通道');
  assert(P.stamina===10 && P.mats.med===2 && P.mats.gold===10, 'T2b 配方 10⚡ + 2💊 + 10💰');

  // T3 医院（第一通道）生产
  g.hospitalLv = 1; g.res.med = 10; g.res.gold = 100;
  const doc = mkDuty('doctor','杜医');
  Game.assignHospital(doc.id);
  Game.makePainkiller();
  assert((g.bagInst||[]).some(e=>e.id==='painkiller'), 'T3a 医院通道生产入包');
  assert(g.res.med===8 && g.res.gold===90 && doc.stamina===9989, 'T3b 扣 2💊+10💰 + 10⚡');

  // T4 实验室（第二通道）：撤医院当值、拆医院用实验室
  g.hospitalLv = 0; g.hospitalDoc = null;
  g.labLv = 1; g.res.med = 10; g.res.gold = 100;
  const sci = mkDuty('scientist','钱博士');
  Game.assignLab(sci.id);
  Game.makePainkiller();
  assert((g.bagInst||[]).filter(e=>e.id==='painkiller').length===2, 'T4a 实验室通道生产入包');
  assert(g.res.med===8 && g.res.gold===90, 'T4b 实验室通道同配方扣料');

  // T5 战斗使用：flatHeal 40
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(g.chars[0], 5, 5);
  Battle.b.units.push(u);
  u.hp = 50;
  Battle.b.pendingSkill = pk.skill;   // doHeal 从 pendingSkill 取当前技能
  await Battle.doHeal(u, u);
  assert(u.hp===90, `T5 服用止痛药 50→90（+40）`);

  // T6 药物不再能直接回血：useMed 已删除
  assert(Game.useMed===undefined && UI.useMed===undefined, 'T6a useMed 函数已移除');
  assert(!html.includes("使用药物 (1)"), 'T6b 人物信息页不再有直接用药按钮');

  // T7 医院与实验室都未建时拦截
  const savedH = g.hospitalLv, savedL = g.labLv;
  g.hospitalLv = 0; g.labLv = 0;
  const med0 = g.res.med;
  Game.makePainkiller();
  assert(g.res.med===med0, 'T7 未建医院/实验室时生产被拦截');
  g.hospitalLv = savedH; g.labLv = savedL;

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
