/* V199 新武器「双截棍」🥢：攻+15 射程1（无技能），工坊可打造（36💰+5🪵+6⚙️/18⚡，V205 由 48💰 降价），探险掉落池（非顶级） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 500; g.res.wood = 30; g.res.metal = 30; g.res.fabric = 30;

(async () => {
  // ===== T1 定义 =====
  const nk = DATA.EQUIPS.nunchaku;
  assert(nk && nk.name==='双截棍' && nk.slot==='weapon' && nk.icon==='🥢', 'T1a 双截棍注册（武器槽 🥢）');
  assert(nk.stats.atk===15 && nk.range===1, 'T1b 攻击力 +15 / 射程 1');
  assert(!nk.skill, 'T1c 无自带技能（纯属性武器，同弹弓/匕首）');
  assert(nk.desc.includes('+15') && nk.desc.includes('射程 1'), 'T1d desc 同步');

  // ===== T2 配方与工坊打造 =====
  const rc = DATA.RECIPES.find(r=>r.id==='nunchaku');
  assert(rc && rc.cost.gold===36 && rc.cost.wood===5 && rc.cost.metal===6 && rc.stamina===18, 'T2a 配方 36💰+5🪵+6⚙️ / 18⚡（性价比回正）');
  Game.craft('nunchaku');
  const inst = (g.bagInst||[]).find(e=>e.id==='nunchaku');
  assert(inst && inst.lv===0, 'T2b 打造入包');

  // ===== T3 属性链：effAtk +15，射程 1 =====
  const s1 = Game.createChar('civilian','持棍者'); s1.stamina = 9999; s1.talents = []; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  Game.equipChar(s1.id, 'weapon', inst.uid);
  assert(Game.effAtk(s1)===s1.atk+15, 'T3a 装备双截棍 effAtk +15');
  assert(Game.effRange(s1)===1, 'T3b 射程 1');

  // ===== T4 掉落池：非顶级武器（d≤2 区域可掉，加油站仅武器池也含它）=====
  assert(!DATA.TOP_EQUIPS.includes('nunchaku'), 'T4a 不属顶级武器分层');
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  for (let i=0;i<200;i++){ const d = Battle.rollDropEquip('hospital'); if (d && d.id==='nunchaku') break; }
  const gasIds = new Set(); let gasN = 0;
  for (let i=0;i<600;i++){ const d = Battle.rollDropEquip('gas'); if (d){ gasN++; gasIds.add(d.id); } }
  assert(gasIds.has('nunchaku') && gasN>0, 'T4b 加油站仅武器池含双截棍（采样命中）');

  // ===== T5 百科收录 =====
  assert(html.includes('双截棍'), 'T5 装备图鉴含双截棍');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
