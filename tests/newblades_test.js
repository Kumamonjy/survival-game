/* V132 新武器：匕首(atk+12) / 菜刀(atk+10) / 消防斧(atk+20)；菜刀与消防斧带「凶猛劈砍」（1格 150% + 流血2回合） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store, REC, CC, FM, SB } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠乙'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 1000; g.res.wood = 50; g.res.metal = 50; g.res.fabric = 50;

(async () => {
  // ===== T1 定义与属性 =====
  const dag = DATA.EQUIPS.dagger, cle = DATA.EQUIPS.cleaver, axe = DATA.EQUIPS.fireaxe;
  assert(dag && dag.name==='匕首' && dag.slot==='weapon' && dag.stats.atk===12 && dag.range===1 && !dag.skill, 'T1a 匕首：攻+12 射程1 无技能');
  assert(cle && cle.name==='菜刀' && cle.slot==='weapon' && cle.stats.atk===10 && cle.range===1, 'T1b 菜刀：攻+10 射程1');
  assert(axe && axe.name==='消防斧' && axe.slot==='weapon' && axe.stats.atk===20 && axe.range===1, 'T1c 消防斧：攻+20 射程1');
  assert(DATA.EQUIPS.club.stats.atk===10, 'T1d 棍棒已调整为攻+10');

  // ===== T2 技能「凶猛劈砍」 =====
  const sk = cle.skill;
  assert(sk && sk.name==='凶猛劈砍' && sk.mult===1.5 && sk.range===1 && sk.type==='attack' && sk.shape==='target', 'T2a 凶猛劈砍：1格单体 150%');
  assert(sk.cost===15 && sk.cd===3, 'T2b 消耗 15⚡ / CD3');
  assert(sk.bleed && sk.bleed.turns===2, 'T2c 附加流血 2 回合');
  assert(axe.skill && axe.skill.name==='凶猛劈砍' && axe.skill.mult===1.5 && axe.skill.bleed.turns===2, 'T2d 消防斧同款技能');

  // ===== T3 配方与打造 =====
  const r1 = REC('dagger'), r2 = REC('cleaver'), r3 = REC('fireaxe');
  assert(r1 && r1.stamina===12 && CC('dagger').gold===r1.cost.gold && CC('dagger').metal===r1.cost.metal, 'T3a 匕首配方与 craftCost 派生一致 / 12⚡');
  assert(r2 && r2.stamina===14 && CC('cleaver').gold===r2.cost.gold && CC('cleaver').metal===r2.cost.metal, 'T3b 菜刀配方与 craftCost 派生一致 / 14⚡');
  assert(r3 && r3.stamina===25 && CC('fireaxe').gold===r3.cost.gold && CC('fireaxe').wood===r3.cost.wood && CC('fireaxe').metal===r3.cost.metal, 'T3c 消防斧配方与 craftCost 派生一致 / 25⚡');
  Game.craft('dagger'); Game.craft('cleaver'); Game.craft('fireaxe');
  ['dagger','cleaver','fireaxe'].forEach(id=>{
    assert((g.bagInst||[]).some(e=>e.id===id), `T3d ${DATA.EQUIPS[id].name} 打造入包`);
  });

  // ===== T4 装备属性链 + 技能聚合 =====
  const s1 = Game.createChar('civilian','持刀者'); s1.stamina = 9999; s1.talents = []; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  const instC = g.bagInst.find(e=>e.id==='cleaver');
  Game.equipChar(s1.id, 'weapon', instC.uid);
  assert(Game.effAtk(s1)===s1.atk+10 && Game.effRange(s1)===1, 'T4a 装备菜刀 effAtk +10 / 射程1');
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(s1, 5, 5);
  Battle.b.units.push(u);
  u.critRate = 0; u.cds = {};
  assert(u.skills.some(s=>s.name==='凶猛劈砍'), 'T4b 战斗技能表含凶猛劈砍');

  // ===== T5 技能结算：150% 伤害 + 流血 2 回合 =====
  const foe = Battle.mkZombie('walker', 5, 6, 1); foe.hp = foe.maxHp = 200;
  Battle.b.units.push(foe);
  u.stamina = 100;
  const hp0 = foe.hp;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.cleaver.skill, dir:[5,6] });
  const dmg = Math.max(1, Math.round(u.atk*1.5) - foe.def);
  assert(foe.hp===hp0-dmg, `T5a 伤害 = round(atk×1.5)-防（-${dmg}）`);
  assert(foe.sts && foe.sts.bleed && foe.sts.bleed.t===2, 'T5b 目标陷入流血 2 回合');
  assert(u.stamina===85 && u.cds['凶猛劈砍']===3, 'T5c 消耗 15⚡ / 进 CD 3 回合');

  // ===== T6 匕首不提供技能 =====
  const s2 = Game.createChar('civilian','持匕者'); s2.stamina = 9999; s2.talents = []; Game.applyTalents(s2); Game.recalc(s2); g.chars.push(s2);
  const instD = g.bagInst.find(e=>e.id==='dagger');
  Game.equipChar(s2.id, 'weapon', instD.uid);
  assert(Game.effAtk(s2)===s2.atk+12, 'T6a 装备匕首 effAtk +12');
  const u2 = Battle.mkAlly(s2, 0, 0);
  Battle.b.units.push(u2);
  assert(!u2.skills.some(s=>s.name==='凶猛劈砍'), 'T6b 匕首不携带凶猛劈砍');

  // ===== T7 消防斧属性 =====
  const s3 = Game.createChar('civilian','持斧者'); s3.stamina = 9999; s3.talents = []; Game.applyTalents(s3); Game.recalc(s3); g.chars.push(s3);
  const instA = g.bagInst.find(e=>e.id==='fireaxe');
  Game.equipChar(s3.id, 'weapon', instA.uid);
  assert(Game.effAtk(s3)===s3.atk+20, 'T7 装备消防斧 effAtk +20');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
