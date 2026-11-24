/* V202/V231 新顶级武器「复合弓」🎯：攻+30 射程3，自带技能「精准射箭」（3格单体 150%，20⚡ CD3），配方 89💰+21🪵+13🧵+16⚙️/26⚡，纳入 TOP_EQUIPS 分层 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 500; g.res.wood = 40; g.res.metal = 30; g.res.fabric = 30;

(async () => {
  // ===== T1 定义 =====
  const cb = DATA.EQUIPS.compoundbow;
  assert(cb && cb.name==='复合弓' && cb.slot==='weapon' && cb.icon==='🎯', 'T1a 复合弓注册（武器槽 🎯）');
  assert(cb.stats.atk===30 && cb.range===3, 'T1b 攻击力 +30 / 射程 3（V231 上调）');
  const sk = cb.skill;
  assert(sk && sk.name==='精准射箭' && sk.shape==='target' && sk.range===3, 'T1c 自带技能「精准射箭」3 格单体');
  assert(sk.mult===1.5 && sk.cost===20 && sk.cd===3, 'T1d 150% 伤害 / 20⚡ / CD3（V231 上调）');
  assert(cb.desc.includes('+30') && cb.desc.includes('射程 3') && cb.desc.includes('精准射箭'), 'T1e desc 同步');

  // ===== T2 配方与工坊打造（高消耗档）=====
  const rc = DATA.RECIPES.find(r=>r.id==='compoundbow');
  assert(rc && rc.cost.gold===89 && rc.cost.wood===21 && rc.cost.fabric===13 && rc.cost.metal===16 && rc.stamina===26, 'T2a 配方 89💰+21🪵+13🧵+16⚙️ / 26⚡（V232 材料小幅上调）');
  const rcPistol = DATA.RECIPES.find(r=>r.id==='pistol');
  assert(rcPistol.cost.gold>rc.cost.gold, 'T2b 金币消耗低于手枪（手枪 104💰 全场最贵）');
  Game.craft('compoundbow');
  const inst = (g.bagInst||[]).find(e=>e.id==='compoundbow');
  assert(inst && inst.lv===0, 'T2b 打造入包');

  // ===== T3 属性链：effAtk +30，射程 3 =====
  const s1 = Game.createChar('civilian','射手'); s1.stamina = 9999; s1.talents = []; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  Game.equipChar(s1.id, 'weapon', inst.uid);
  assert(Game.effAtk(s1)===s1.atk+30, 'T3a 装备复合弓 effAtk +30');
  assert(Game.effRange(s1)===3, 'T3b 射程 3');

  // ===== T4 战斗：技能表含精准射箭，3 格内单体 150% =====
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(s1, 5, 5);
  Battle.b.units.push(u);
  u.critRate = 0; u.cds = {};
  assert(u.skills.some(s=>s.name==='精准射箭'), 'T4a 战斗技能表含精准射箭');
  assert(u.atk===Game.effAtk(s1) && u.range===3, 'T4b 单位属性含武器加成');
  const foe = Battle.mkZombie('walker', 5, 8, 1); foe.hp = foe.maxHp;   // 距离恰好 3 格
  Battle.b.units.push(foe);
  u.stamina = 100;
  const hp0 = foe.hp;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.compoundbow.skill, dir:[5,8] });
  const dmg = Math.max(1, Math.round(u.atk*1.5) - foe.def);
  assert(foe.hp===hp0-dmg, `T4c 3 格外目标伤害 = round(atk×1.5)-防（-${dmg}）`);
  assert(u.stamina===80 && u.cds['精准射箭']===3, 'T4d 消耗 20⚡ / 进 CD 3 回合');
  assert(!u.skills.some(s=>s.name==='棍棒打击') && !u.skills.some(s=>s.name==='火力压制'), 'T4e 无误带其他武器技能');

  // ===== T5 射程外不可用：4 格外目标不受影响 =====
  const far = Battle.mkZombie('walker', 5, 9, 1); far.hp = far.maxHp;
  Battle.b.units.push(far);
  const hpFar = far.hp;
  u.cds = {}; u.stamina = 100;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.compoundbow.skill, dir:[5,9] });
  assert(far.hp===hpFar, 'T5a 4 格外目标不受影响');
  assert(u.stamina===100 && !u.cds['精准射箭'], 'T5b 不消耗体力/不进 CD');

  // ===== T6 掉落分层：顶级武器（d≤2 不掉，d3+ 可掉）=====
  assert(DATA.TOP_EQUIPS.includes('compoundbow'), 'T6a 纳入 TOP_EQUIPS 顶级分层');
  let hiHit = false;
  for (let i=0;i<1200;i++){ const d = Battle.rollDropEquip('base'); if (d && d.id==='compoundbow'){ hiHit = true; break; } }
  assert(hiHit, 'T6b 军事基地（d4）采样可掉复合弓');
  let lowHit = false;
  for (let i=0;i<600;i++){ const d = Battle.rollDropEquip('hospital'); if (d && d.id==='compoundbow'){ lowHit = true; break; } }
  assert(!lowHit, 'T6c 医院（d2）采样 600 次不掉复合弓');

  // ===== T7 百科收录 =====
  assert(html.includes('复合弓') && html.includes('精准射箭'), 'T7 装备图鉴含复合弓与技能');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
