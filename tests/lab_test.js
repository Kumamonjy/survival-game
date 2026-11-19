/* V68 实验室 + 解毒针 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1] = g.chars;
const toasts = [];
UI.toast = m => toasts.push(m);

function mkB(units){
  return { units, selected:units[0], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
}

(async () => {
  // ===== T1 实验室定义 =====
  assert(DATA.LAB && DATA.LAB.name==='实验室' && DATA.LAB.buildCost===200, 'T1 实验室定义（200 金币建造）');

  // ===== T2 解毒针定义 =====
  const AN = DATA.EQUIPS.antidote;
  const sk = AN.skill;
  assert(AN && AN.name==='解毒针' && AN.consumable===true && !AN.stats, 'T2a 解毒针消耗品定义（无属性）');
  assert(sk.type==='heal' && sk.flatHeal===50 && sk.mult===0 && sk.range===1 && sk.includeSelf===true && sk.cost===0, 'T2b 技能参数（50 血/0 体耗/1 格/含自己）');
  assert(Array.isArray(sk.cureList) && sk.cureList.length===1 && sk.cureList[0]==='poison', 'T2c cureList 只解中毒');

  // ===== T3 建造 =====
  g.res.gold = 100;
  Game.buildLab();
  assert(g.labLv===0, 'T3a 金币不足拒绝建造');
  g.res.gold = 500;
  Game.buildLab();
  assert(g.labLv===1 && g.res.gold===300, 'T3b 建造成功扣 200');

  // ===== T4 指派 =====
  const sci = Game.createChar('scientist', '老陈');
  g.chars.push(sci);
  const sol = Game.createChar('soldier', '兵哥');
  g.chars.push(sol);
  Game.assignLab(sol.id);
  assert(g.labChef===null, 'T4a 非科学家拒绝');
  Game.assignLab(sci.id);
  assert(g.labChef===sci.id, 'T4b 科学家指派成功');
  assert(Game.dutyOf(sci.id)==='实验室当值', 'T4c dutyOf 职务名');
  const sci2 = Game.createChar('scientist', '小研');
  g.chars.push(sci2);
  g.kitchenChef = sci2.id;
  Game.assignLab(sci2.id);
  assert(g.labChef===sci.id, 'T4d 职务冲突拒绝');

  // ===== T5 生产正路径 =====
  g.bagInst = g.bagInst.filter(x=>x.id!=='antidote');
  sci.stamina = sci.maxStamina; g.res.gold = 100; g.res.metal = 5; g.res.med = 10;
  const gold0 = g.res.gold, metal0 = g.res.metal, med0 = g.res.med, st0 = sci.stamina;
  Game.makeAntidote();
  const antiInBag = g.bagInst.filter(x=>x.id==='antidote').length;
  assert(g.res.gold===gold0-15 && g.res.metal===metal0-1 && g.res.med===med0-3 && sci.stamina===st0-15, 'T5a 扣除 15⚡+15💰+1⚙️+3💊');
  assert(antiInBag===1, 'T5b 背包 +1 解毒针');

  // ===== T6 生产反路径 =====
  g.bagInst = g.bagInst.filter(x=>x.id!=='antidote');
  g.res.med = 2;
  Game.makeAntidote();
  assert(!g.bagInst.some(x=>x.id==='antidote'), 'T6a 药物不足拒绝');
  g.res.med = 10; sci.injured = true;
  Game.makeAntidote();
  assert(!g.bagInst.some(x=>x.id==='antidote'), 'T6b 重伤拒绝');
  sci.injured = false; sci.stamina = 10;
  Game.makeAntidote();
  assert(!g.bagInst.some(x=>x.id==='antidote'), 'T6c 体力不足 15 拒绝');
  sci.stamina = 100; g.labChef = null;
  Game.makeAntidote();
  assert(!g.bagInst.some(x=>x.id==='antidote'), 'T6d 无实验员拒绝');
  g.labChef = sci.id;

  // ===== T7 战斗使用：恢复 50 + 只解中毒 =====
  const me = Battle.mkAlly(sci, 5, 5);
  const hurt = Battle.mkAlly(s1, 5, 4);
  hurt.hp = hurt.maxHp - 80;
  hurt.sts = { poison:{ t:3 }, bleed:{ t:3 }, strong:{ t:2 } };
  Battle.b = mkB([me, hurt]);
  Battle.b.pendingSkill = DATA.EQUIPS.antidote.skill;
  const hp0 = hurt.hp;
  await Battle.doHeal(me, hurt);
  assert(hurt.hp === hp0 + 50, `T7a 恢复 50 生命（+${hurt.hp-hp0}）`);
  assert(!hurt.sts.poison, 'T7b 中毒解除');
  assert(hurt.sts.bleed, 'T7c 流血保留（只解中毒）');
  assert(hurt.sts.strong, 'T7d 增益保留');
  const bagAfter = g.bagInst.filter(x=>x.id==='antidote').length;

  // ===== T8 满血中毒者可选为目标 =====
  Battle.b = mkB([me, hurt]);
  hurt.hp = hurt.maxHp;
  hurt.sts = { poison:{ t:3 } };
  me.skills = [DATA.EQUIPS.antidote.skill];
  me.item = { id:'antidote', count:2 };
  me.stamina = 100; me.maxStamina = 150;
  me.hasAttacked = false; me.hasMoved = false;   // 清除 T7 治疗后的行动标记
  Battle.b.selected = me; Battle.b.mode = null;
  Battle.pickSkill(0);
  const tset = (Battle.b.targetSet||[]).map(p=>p.join(','));
  assert(tset.includes('5,4'), 'T8 满血但中毒者可被选为目标（打针解毒）');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
