/* V91 运动员改版：近身格斗(同格斗家) + 奔袭(sangshi 陷阵式空格落点 AOE, 菱形1格, 80%) */
const fs = require('fs');
const html = fs.readFileSync('/workspace/index.html', 'utf8');
const scripts = html.match(/<script>([\s\S]*?)<\/script>/g);
let code = scripts[scripts.length - 1].replace(/^<script>/, '').replace(/<\/script>\s*$/, '');
const bootIdx = code.lastIndexOf("Game.renderHome();\n  window.addEventListener('resize'");
code = code.slice(0, bootIdx) + "window.__T = { Game, Battle, UI, DATA };\n})();";
const elems = {};
function mkEl(){ return { innerHTML:'', textContent:'', style:{ setProperty(){} }, disabled:false, scrollTop:0, value:'', dataset:{}, children:[], offsetWidth:36, className:'', classList:{ s:new Set(), add(c){this.s.add(c);}, remove(c){this.s.delete(c);}, contains(c){return this.s.has(c);} }, setAttribute(){}, removeAttribute(){}, appendChild(c){this.children.push(c);return c;}, remove(){}, addEventListener(){}, focus(){}, blur(){}, querySelector(){return null;}, querySelectorAll(){return [];}, getBoundingClientRect(){return{width:400,height:700,top:0,left:0,bottom:700};} }; }
global.document = { getElementById:id=>elems[id]||(elems[id]=mkEl()), querySelector:()=>mkEl(), querySelectorAll:()=>[], addEventListener(){}, createElement:()=>mkEl(), body:mkEl() };
global.window = { addEventListener(){}, location:{search:''}, scrollTo(){}, innerWidth:400, innerHeight:700 };
global.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
global.navigator = { userAgent:'node' };
global.getComputedStyle = () => ({ getPropertyValue:()=>'' });
eval(code);
const assert=(c,n)=>console.log(c?'PASS '+n:'FAIL '+n);
const { Game, Battle, UI, DATA } = window.__T;
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 技能定义
  const S = DATA.CLASSES.scout;
  assert(S.skills.length===2 && !S.skill, 'T1a 运动员改为双技能组');
  const melee = S.skills[0], dash = S.skills[1];
  const brwMelee = DATA.CLASSES.brawler.skills[1];
  assert(melee.name==='近身格斗' && melee.mult===brwMelee.mult && melee.range===brwMelee.range && melee.cost===brwMelee.cost && melee.cd===brwMelee.cd && melee.selfStrong===brwMelee.selfStrong,
    'T1b 近身格斗与格斗家版逐字段一致（150%/1格/40⚡/CD3/强力2）');
  assert(dash.name==='奔袭' && dash.shape==='aoe' && dash.range===2 && dash.area===1 && dash.mult===0.8 && dash.cost===40 && dash.cd===4 && dash.emptyCell===true,
    'T1c 奔袭：aoe落点/射程2/范围1/80%/40⚡/CD4/限空格');

  // T2 战斗：奔袭菱形（十字5格）命中，斜角不中
  const c = Game.createChar('scout','飞人',false);
  g.chars.push(c);
  const u = Battle.mkAlly(c, 5, 5);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  u.critRate = 0;
  const atk = Battle.effAtk(u);   // 40
  const exp = Math.round(atk*0.8) - 5;   // 先乘后减防：round(40×0.8)-5 = 27
  const mk = (r,col,hp)=>{ const z = Battle.mkZombie('walker', r, col, 1); z.hp = hp||z.maxHp; Battle.b.units.push(z); return z; };
  const up = mk(4,7), right = mk(5,8), diag = mk(4,6), center = mk(5,7);   // 上下左右+斜角，落点(5,7)此时有丧尸 center（用于过滤测试，稍后移走）
  // 落点过滤：center 所在格不可作为奔袭落点
  const emptyFilter = ([r,c2])=>!dash.emptyCell || !Battle.unitAt(r,c2);
  const raw = Battle.attackCells(u, 2).filter(([r,c2])=>Math.abs(r-5)+Math.abs(c2-5)<=2 && Math.abs(r-5)+Math.abs(c2-5)>0);
  assert(!raw.filter(emptyFilter).some(([r,c2])=>r===5&&c2===7), 'T2a 敌人所在格被空格过滤排除');
  Battle.b.units = Battle.b.units.filter(x=>x!==center);   // 移走落点丧尸
  await Battle.execSkill(u, { sk: dash, cell:[5,7] });
  assert(up.hp===up.maxHp-exp, `T2b 十字上格命中 ${up.maxHp-up.hp} = round(40×0.8)-5`);
  assert(right.hp===right.maxHp-exp, 'T2c 十字右格命中同伤');
  assert(diag.hp===diag.maxHp, 'T2d 斜角格不受影响（曼哈顿菱形）');
  assert(u.stamina===u.maxStamina-40, `T2e 扣体力 40（${u.maxStamina-u.stamina}）`);
  assert((u.cds['奔袭']||0)>0, 'T2f 进冷却');

  // T3 近身格斗：150% 伤害 + 强力 2 回合
  u.hasAttacked = false; u.cds = {}; u.stamina = u.maxStamina;
  const foe = mk(5,6);
  const exp2 = Math.round(atk*1.5) - 5;
  await Battle.execSkill(u, { sk: melee, target: foe });
  assert(foe.hp===foe.maxHp-exp2 && (u.sts.strong && u.sts.strong.t===2), `T3 近身格斗 ${foe.maxHp-foe.hp}=round(40×1.5)-5 且强力2回合`);

  console.log('--- done ---');
  process.exit(0);
})();
