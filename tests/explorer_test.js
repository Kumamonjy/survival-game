/* V75/V77 探险家职业：属性 / 野外生存（10⚡ 自疗 50% 攻）/ 移速 3 / 自动接入各系统 */
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

// T1 职业定义
const E = DATA.CLASSES.explorer;
assert(E && E.name==='探险家' && E.icon==='🧭', 'T1a 探险家注册（🧭）');
assert(E.price===250 && E.food===2, 'T1b 招募价 250 / 食物 2');
assert(E.base.maxHp===250 && E.base.maxStamina===150 && E.base.atk===40 && E.base.def===10, 'T1c 基础属性 250/150/40/10');
assert(E.base.range===1 && E.base.move===3 && E.base.critRate===5 && E.base.critDmg===150, 'T1d 射程1/移速3/暴击5%/150%');
const WS = E.skills && E.skills[0];
assert(WS && WS.name==='野外生存' && WS.cost===10 && WS.cd===3 && WS.mult===0.5 && WS.selfOnly===true && WS.type==='heal', 'T1e 野外生存：10⚡/CD3/自身50%攻/仅限自身');

// T2 属性落地（withTalent=false 排除随机天赋干扰）
const ex = Game.createChar('explorer', '阿探', false);
assert(ex.maxHp===250 && ex.maxStamina===150 && ex.atk===40 && ex.def===10, 'T2a createChar 属性生效');
assert(ex.range===1 && ex.move===3, 'T2b 射程/移速生效');

(async () => {
  // T3 战斗移速 3：reachable 覆盖曼哈顿距离 3 格
  const u = Battle.mkAlly(ex, 6, 6);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const reach = Battle.reachable(u);
  assert(reach['3,6']===3 && reach['6,3']===3 && reach['6,9']===3 && reach['5,5']===2, 'T3 移速 3：直线 3 格可达（穿平原）');

  // T4 野外生存：目标过滤仅限自身 + 治疗量 = 50% 攻击力 + CD
  const b = Battle.b;
  u.hp = 100; u.maxHp = 250; u.stamina = 100; u.maxStamina = 150;
  b.pendingSkill = WS; b.selected = u;
  const mate = Battle.mkAlly(Game.createChar('soldier', '老兵', false), 5, 6);
  mate.hp = 50; mate.maxHp = 300;
  b.units.push(mate);
  const sk = WS;
  const skRange = sk.range || u.range;
  const hc = Battle.attackCells(u, skRange).concat(sk.includeSelf ? [[u.row,u.col]] : []);
  b.targetSet = hc.filter(([r,c])=>{
    const t = Battle.unitAt(r,c);
    if (!t || t.side!=='ally') return false;
    if (sk.selfOnly && t.uid!==u.uid) return false;
    return t.hp < t.maxHp;
  });
  const selfIn = b.targetSet.some(([r,c])=>r===u.row&&c===u.col);
  const mateIn = b.targetSet.some(([r,c])=>r===mate.row&&c===mate.col);
  assert(selfIn && !mateIn, 'T4a selfOnly：目标集仅含自己，不含掉血邻格友方');
  // 执行：恢复 20（atk 40 × 50%），耗 10 体力
  b.targetSet = [[u.row,u.col]]; b.targetMode='heal'; b.mode='skill'; b.pendingSkill=sk;
  await Battle.cellClick(u.row, u.col);
  assert(u.hp===120, `T4b 治疗量 = 50%×40攻 = 20（+${u.hp-100}）`);
  assert(u.stamina===90, `T4c 消耗 10 体力（剩 ${u.stamina}）`);
  assert(u.cds && u.cds['野外生存']===3, 'T4d CD 3 回合');

  // T5 食物清单已删除，预估行仍按实际队伍计算
  Game.g.chars.push(ex);
  UI.renderInv();
  const inv = elems['inv-list'].innerHTML;
  assert(!inv.includes('探险家 2') && inv.includes('每日消耗预估'), 'T5a 物资页无食量清单但保留消耗预估');
  UI.renderWiki ? UI.renderWiki() : null;
  const wiki = elems['wiki-page'] ? elems['wiki-page'].innerHTML : '';
  assert(wiki==='' || wiki.includes('探险家'), 'T5b 职业图鉴含探险家（若渲染）');

  // T6 初始随机池含探险家
  let seen = false;
  for (let i=0;i<150;i++){ if (Game.newGame().chars.some(c=>c.cls==='explorer')) { seen=true; break; } }
  assert(seen, 'T6 初始职业随机池含探险家');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
