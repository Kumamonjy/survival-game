/* V172 新武器 手枪：攻+40 / 暴击+3% / 射程3，自带军人技能「火力压制」（3格单体160%，25⚡ CD3）；全场最贵配方 110💰+8⚙️+3🧵 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store, REC, CC, FM, SB } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 1000; g.res.wood = 50; g.res.metal = 50; g.res.fabric = 50;

(async () => {
  // T1 定义：攻+40 / 暴击+3% / 射程3
  const P = DATA.EQUIPS.pistol;
  assert(P && P.name==='手枪' && P.slot==='weapon' && P.icon==='🔫', 'T1a 手枪定义（武器槽）');
  assert(P.stats.atk===35 && P.stats.critRate===3 && P.range===3, 'T1b 攻+35 / 暴击率+3% / 射程3');

  // T2 技能：火力压制为手枪独立技能对象（V173 军人一技能已换为擒拿，互不影响）
  const sk = P.skill, grap = DATA.CLASSES.soldier.skills[0];
  assert(sk && sk.name==='火力压制' && sk.mult===1.6 && sk.cost===25 && sk.cd===3
    && sk.range===3 && sk.shape==='target' && sk.type==='attack', 'T2a 手枪自带火力压制 160%/25⚡/CD3/3格');
  assert(grap && grap.name==='擒拿' && sk !== grap, 'T2b 军人一技能为擒拿，与手枪技能为不同对象');
  assert(sk.equipSkill===undefined && !sk.eqName, 'T2c 手枪技能对象无消耗品标记');

  // T3 配方：110💰+8⚙️+3🧵 / 30⚡，全场最贵
  const rc = REC('pistol');
  assert(rc && rc.stamina===30 && CC('pistol').gold===rc.cost.gold && CC('pistol').metal===rc.cost.metal && CC('pistol').fabric===rc.cost.fabric, 'T3a 配方与 craftCost 派生一致 / 30⚡');
  assert(DATA.RECIPES.every(r=>r.cost.gold<=REC('pistol').cost.gold), 'T3b 金币造价全场最高（104💰，高于复合弓 89💰）');

  // T4 打造 + 装备：effAtk +40 / 射程 3 / 暴击 +3
  Game.craft('pistol');
  const inst = (g.bagInst||[]).find(e=>e.id==='pistol');
  assert(inst && inst.lv===0, 'T4a 手枪打造入包');
  const c1 = Game.createChar('civilian','枪手'); c1.stamina = 9999; c1.talents = []; Game.applyTalents(c1); Game.recalc(c1); g.chars.push(c1);
  const baseCrit = c1.critRate;
  Game.equipChar(c1.id, 'weapon', inst.uid);
  assert(Game.effAtk(c1)===c1.atk+35, 'T4b 装备手枪 effAtk +35');
  assert(Game.effRange(c1)===3, 'T4c 射程 3');
  assert(Game.effCrit(c1)===baseCrit+3, `T4d 暴击率 +3（${baseCrit}→${Game.effCrit(c1)}）`);

  // T5 mkAlly：战斗单位带「火力压制」且属性继承
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(c1, 5, 5);
  Battle.b.units.push(u);
  u.critRate = 0; u.cds = {};
  assert(u.skills.some(s=>s.name==='火力压制'), 'T5a 战斗技能表含火力压制');
  assert(u.atk===Game.effAtk(c1) && u.range===3, 'T5b 单位属性含武器加成');

  // T6 实战：3 格内敌人受 160% 攻击伤害、扣 25⚡、进 CD 3
  const foe = Battle.mkZombie('walker', 5, 8, 1); foe.hp = foe.maxHp;
  Battle.b.units.push(foe);
  u.stamina = 100;
  const hp0 = foe.hp;
  await Battle.execSkill(u, { sk, target: foe });
  const dmg = Math.max(1, Math.round(u.atk*1.6) - foe.def);
  assert(foe.hp===hp0-dmg, `T6a 伤害 = round(atk×1.6)-防（-${dmg}）`);
  assert(u.stamina===75 && u.cds['火力压制']===3, 'T6b 消耗 25⚡ / 进 CD 3 回合');
  assert(c1.equip.weapon && c1.equip.weapon.id==='pistol' && c1.equip.weapon.lv===0, 'T6c 手枪不被消耗（仍在穿戴槽）');

  // T7 射程外（4 格）：统一施放入口 castTargeted 拒绝目标，无伤害、不扣体力、不进 CD
  const far = Battle.mkZombie('walker', 5, 9, 1); far.hp = far.maxHp;
  Battle.b.units.push(far);
  const hpFar = far.hp;
  u.cds = {}; u.stamina = 100; u.hasAttacked = false;
  await Battle.castTargeted(u, sk, far);
  assert(far.hp===hpFar && u.stamina===100 && !u.cds['火力压制'], 'T7 4 格外目标被 castTargeted 拒绝（射程校验在选择层）');

  // T8 打造弹窗武器页含手枪
  UI.openCraftTab('weapon');
  const cmh = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(cmh.includes('手枪') && cmh.includes('火力压制'), 'T8 打造弹窗武器页含手枪（带技能摘要）');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
