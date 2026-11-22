/* V133 消耗品：香烟（+15体力 + 调息2回合）/ 药汤（+20生命 + 治愈3回合） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store, REC, CC, FM, SB } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;
{ const sm = Game.createChar('civilian','工匠丁'); sm.stamina = 9999; sm.injured = false;
  g.chars.push(sm); g.workshopLv = 1; Game.assignWorkshop(sm.id); }
g.res.gold = 500; g.res.fabric = 30; g.res.med = 30;

const mkB = units => ({ units, selected:units[0], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
  mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0},
  ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null });

(async () => {
  // ===== T1 定义 =====
  const cig = DATA.EQUIPS.cigarette, sp = DATA.EQUIPS.soup;
  assert(cig && cig.name==='香烟' && cig.slot==='item' && cig.icon==='🚬' && cig.consumable===true && !cig.stats, 'T1a 香烟=道具槽消耗品');
  assert(cig.skill && cig.skill.name==='抽烟' && cig.skill.type==='regen' && cig.skill.regenAmt===15 && cig.skill.cost===0
    && cig.skill.range===1 && cig.skill.includeSelf===true && cig.skill.selfOnly===true, 'T1b 抽烟：15体力 / 自身 / 0消耗');
  assert(cig.skill.regenStatus && cig.skill.regenStatus.turns===2, 'T1c 附带调息 2 回合');
  assert(sp && sp.name==='药汤' && sp.slot==='item' && sp.icon==='🥣' && sp.consumable===true && !sp.stats, 'T1d 药汤=道具槽消耗品');
  assert(sp.skill && sp.skill.name==='喝药汤' && sp.skill.type==='heal' && sp.skill.flatHeal===20 && sp.skill.cost===0
    && sp.skill.selfOnly===true, 'T1e 喝药汤：20生命 / 自身 / 0消耗');
  assert(sp.skill.healStatus && sp.skill.healStatus.turns===3, 'T1f 附带治愈 3 回合');

  // ===== T2 工坊配方 =====
  const r1 = REC('cigarette'), r2 = REC('soup');
  assert(r1 && r1.stamina===5 && CC('cigarette').gold===r1.cost.gold && CC('cigarette').fabric===r1.cost.fabric, 'T2a 香烟配方与 craftCost 派生一致 / 5⚡');
  assert(r2 && r2.stamina===10 && CC('soup').gold===r2.cost.gold && CC('soup').med===r2.cost.med && CC('soup').fabric===r2.cost.fabric, 'T2b 药汤配方与 craftCost 派生一致 / 10⚡');

  // ===== T3 打造入包 =====
  Game.craft('cigarette'); Game.craft('soup');
  assert((g.bagInst||[]).some(e=>e.id==='cigarette') && (g.bagInst||[]).some(e=>e.id==='soup'), 'T3 香烟/药汤打造入包');

  // ===== T4 香烟：+15体力 + 调息 =====
  Game.addEquip('cigarette', 2);
  Game.carryItem(s1.id, 'cigarette'); Game.carryItem(s1.id, 'cigarette');
  const me = Battle.mkAlly(s1, 5, 5);
  Battle.b = mkB([me]);
  const csk = me.skills.find(s=>s.equipSkill && s.name==='抽烟');
  assert(csk, 'T4a 抽烟技能入列');
  me.stamina = 50; me.maxStamina = 120; me.hp = me.maxHp = 100;
  Battle.b.pendingSkill = csk;
  await Battle.doRegen(me, me);
  assert(me.stamina===65, `T4b 恢复 15 体力（${me.stamina}）`);
  assert(me.item.count===1, `T4c 消耗 1 支（余 ${me.item.count}）`);
  assert(me.sts && me.sts.regen && me.sts.regen.t===2, 'T4d 进入调息 2 回合');
  // 两个回合结算：每回合 5% 最大体力 = 6
  Battle.tickStatuses();
  assert(me.stamina===71 && me.sts && me.sts.regen && me.sts.regen.t===1, `T4e 第1回合调息 +6（${me.stamina}）`);
  Battle.tickStatuses();
  assert(me.stamina===77 && !me.sts.regen, `T4f 第2回合调息 +6 后消退（${me.stamina}）`);

  // ===== T5 药汤：+20生命 + 治愈 =====
  Game.addEquip('soup', 2);
  Game.carryItem(s2.id, 'soup'); Game.carryItem(s2.id, 'soup');
  const me2 = Battle.mkAlly(s2, 0, 0);
  Battle.b.units.push(me2);
  const ssk = me2.skills.find(s=>s.equipSkill && s.name==='喝药汤');
  assert(ssk, 'T5a 喝药汤技能入列');
  me2.hp = 50; me2.maxHp = 100; me2.stamina = 100;
  Battle.b.pendingSkill = ssk;
  await Battle.doHeal(me2, me2);
  assert(me2.hp===70, `T5b 恢复 20 生命（${me2.hp}）`);
  assert(me2.item.count===1, `T5c 消耗 1 碗（余 ${me2.item.count}）`);
  assert(me2.sts && me2.sts.heal && me2.sts.heal.t===3, 'T5d 进入治愈 3 回合');
  Battle.tickStatuses();
  Battle.tickStatuses();
  Battle.tickStatuses();
  assert(me2.hp===85 && !me2.sts.heal, `T5e 三回合各 +5 后消退（${me2.hp}）`);

  // ===== T6 selfOnly：regren 目标集不含队友 =====
  Battle.b.selected = me;
  me.stamina = 10; me.hasAttacked = false; me.cds = {};   // V211 消耗品 CD1：清冷却以专注测 selfOnly 目标集
  const mate = Battle.mkAlly(s2, 5, 4);
  Battle.b.units.push(mate);
  mate.stamina = 10;
  Battle.pickSkill(me.skills.findIndex(s=>s.name==='抽烟'));
  const set = Battle.b.targetSet || [];
  assert(set.some(([r,c])=>r===5&&c===5) && !set.some(([r,c])=>r===5&&c===4), 'T6 抽烟仅可对自己使用');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
