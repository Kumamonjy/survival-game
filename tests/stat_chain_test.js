/* V85b 属性链与技能暴击验证：
   1) 属性 = 职业基础 → 天赋(作用于基础值) → 等级成长(基础值×(1+10%×lv-1)) → +装备加成
   2) 百分比伤害技能吃暴击（calcDamage 共用通道）；固定伤害技能不暴击 */
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

(async () => {
  // ===== T1 属性链：基础 → 天赋 → 等级 → 装备 =====
  const c = Game.createChar('soldier', '链试', false);   // 军人 base 300❤️/50⚔️/10🛡️/150⚡
  g.chars.push(c);
  assert(c.maxHp===300 && c.atk===50 && c.def===10 && c.critRate===10, 'T1a Lv1 基础值');

  // 天赋：锐利(暴击率+12，直接加字段) + 强壮(baseMaxHp×1.15)
  const sharp = DATA.TALENTS.find(t=>t.id==='sharp'), strong = DATA.TALENTS.find(t=>t.id==='strong');
  sharp.apply(c); strong.apply(c);
  assert(c.critRate===22 && c.baseMaxHp===345, `T1b 天赋落地：暴击 10+12=22 / baseMaxHp 300×1.15=345（${c.critRate}/${c.baseMaxHp}）`);

  // 等级成长：Lv2 = 基础(含天赋)×1.1
  c.exp = 0; Game.gainExp(c, 100);   // 正好升 1 级（Lv1→2 需 100）
  assert(c.level===2, 'T1c 升级 Lv2');
  assert(c.maxHp===Math.round(345*1.1) && c.atk===Math.round(50*1.1) && c.def===Math.round(10*1.1),
    `T1d Lv2 = 天赋后基础×1.1：${c.maxHp}/round(345×1.1)、${c.atk}/55、${c.def}/11`);
  assert(c.maxHp===380 && c.atk===55 && c.def===11, 'T1e 数值精确：380❤️/55⚔️/11🛡️');

  // 装备最后叠加（加法，不参与天赋/等级乘区）：毛衣 +35❤️+10🛡️
  g.workshopLv = 1; g.res.gold = 500; g.res.fabric = 50;
  Game.craft('sweater');
  const sw = g.bagInst.find(e=>e.id==='sweater');
  Game.equipChar(c.id, 'armor', sw.uid);
  assert(Game.effHp(c)===380+35 && Game.effDef(c)===11+10, `T1f +装备：effHp 380+35=415 / effDef 11+10=21（${Game.effHp(c)}/${Game.effDef(c)}）`);

  // 暴击天赋不受等级成长稀释（critRate/critDmg 不在 base 乘区）
  assert(c.critRate===22, 'T1g 暴击率不随等级变化（22）');

  // ===== T2 技能暴击：百分比技能走 calcDamage 共用通道 =====
  const u = Battle.mkAlly(c, 5, 5);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const mkFoe = (col)=>{ const f = Battle.mkZombie('walker', 5, col, 1); f.hp = f.maxHp; Battle.b.units.push(f); return f; };

  // T2a 必暴（critRate 100）：穿刺 100% 伤害 = round((atk-def)×critDmg/100)
  const f1 = mkFoe(6);
  u.critRate = 100; u.critDmg = 180; u.stamina = 100; u.cds = {};
  const baseDmg = Math.max(1, Battle.effAtk(u) - f1.def);       // 65-5=60
  await Battle.execSkill(u, { sk: DATA.EQUIPS.spear.skill, dir:[5,6] });
  assert(f1.hp===f1.maxHp-Math.round(baseDmg*1.8), `T2a 技能吃暴击：60×180%=108（实受 ${f1.maxHp-f1.hp}）`);

  // T2b 必不暴（critRate 0）：同技能受 baseDmg（execSkill 会置 hasAttacked，先复位；f1 挪开腾出格子）
  const f2 = mkFoe(6);
  f1.row = 9;
  u.critRate = 0; u.stamina = 100; u.cds = {}; u.hasAttacked = false;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.spear.skill, dir:[5,6] });
  assert(f2.hp===f2.maxHp-baseDmg, `T2b 无暴击时 100% 伤害（实受 ${f2.maxHp-f2.hp}）`);

  // T2c 固定伤害技能（护士毒针 fixedDmg，target 单体）不暴击：必暴下伤害仍为固定值
  const nurseC = Game.createChar('nurse', '护士长', false);
  g.chars.push(nurseC);
  const nu = Battle.mkAlly(nurseC, 5, 5);
  Battle.b.units.push(nu);
  const poisonSk = DATA.CLASSES.nurse.skills.find(s=>s.fixedDmg);
  const f3 = mkFoe(6);
  nu.critRate = 100; nu.critDmg = 180; nu.stamina = 100; nu.cds = {};
  await Battle.execSkill(nu, { sk: poisonSk, target: f3 });
  assert(f3.hp===f3.maxHp-poisonSk.fixedDmg, `T2c 固定伤害技能不暴击（毒针 ${poisonSk.fixedDmg}，实受 ${f3.maxHp-f3.hp}）`);

  // T2d calcDamage 单元：暴击标记与减伤半伤
  const d1 = Battle.calcDamage(u, f2, 1);
  assert(d1.crit===false && d1.dmg===baseDmg, 'T2d-1 critRate=0 时无暴击标记');
  f2.isDefending = true;
  const d2 = Battle.calcDamage(u, f2, 1);
  f2.isDefending = false;
  assert(d2.dmg===Math.max(1, Math.round(baseDmg*0.5)), 'T2d-2 休息减伤 50% 生效');

  // ===== T3 战斗单位继承整链属性（mkAlly） =====
  assert(u.atk===Game.effAtk(c) && u.maxHp===Game.effHp(c), 'T3 战斗单位继承 天赋×等级+装备 全链');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
