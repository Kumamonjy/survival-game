/* V182 新武器铁锹（攻+18/射程2/挥扫：sweep2 横扫 3×1 70% 25⚡ CD3）+ 泼火锅汤上调 90% */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, REC, CC } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
{ const sm = Game.createChar('civilian','工匠甲'); sm.stamina=9999; sm.injured=false;
  g.chars.push(sm); g.workshopLv=1; Game.assignWorkshop(sm.id); }
g.res.gold = 800; g.res.wood = 60; g.res.metal = 60; g.res.fabric = 60;

(async () => {
  // ===== T1 定义 =====
  const sv = DATA.EQUIPS.shovel;
  assert(sv && sv.slot==='weapon' && sv.stats.atk===18 && sv.range===2, 'T1a 铁锹：攻+18 / 射程 2');
  assert(sv.skill && sv.skill.name==='挥扫' && sv.skill.shape==='sweep2' && sv.skill.sweepLen===3 && sv.skill.sweepWid===1, 'T1b 挥扫：横扫类（sweep2 3×1）');
  assert(sv.skill.mult===0.7 && sv.skill.cost===25 && sv.skill.cd===3, 'T1c 挥扫：70% / 25⚡ / CD3');
  assert(DATA.TOP_EQUIPS.includes('shovel'), 'T1d 铁锹属顶级装备分层（d≤2 区域不掉落）');

  // ===== T2 配方与打造 =====
  const rc = REC('shovel');
  assert(rc && rc.stamina===25, 'T2a 配方体力 25⚡');
  assert(rc.cost.gold===47 && rc.cost.wood===15 && rc.cost.metal===9, 'T2b 配方 47💰+15🪵+9⚙️（V226 金币下调材料大增）');
  assert(CC('shovel').gold===47 && CC('shovel').wood===15 && CC('shovel').metal===9, 'T2c craftCost 派生与配方一致');
  Game.craft('shovel');
  const inst = (g.bagInst||[]).find(e=>e.id==='shovel');
  assert(inst && inst.lv===0, 'T2d 铁锹打造入包');

  // ===== T3 属性链 =====
  const s1 = Game.createChar('soldier','持锹者'); s1.stamina=9999; s1.talents=[]; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  Game.equipChar(s1.id, 'weapon', inst.uid);
  assert(Game.effAtk(s1)===s1.atk+18, 'T3a effAtk +18');
  assert(Game.effRange(s1)===2, 'T3b 射程 1→2');

  // ===== T4 战斗：mkAlly 技能表 + 横扫结算 =====
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(s1, 5, 5);
  Battle.b.units.push(u);
  u.critRate = 0;
  assert(u.skills.some(s=>s.name==='挥扫'), 'T4a 战斗技能表含挥扫');
  const f1 = Battle.mkZombie('walker', 5, 6, 1), f2 = Battle.mkZombie('walker', 5, 7, 1);
  f1.hp=f1.maxHp; f2.hp=f2.maxHp; f1.def=0; f2.def=0;
  Battle.b.units.push(f1, f2);
  u.stamina = 100;
  const h10=f1.hp, h20=f2.hp;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.shovel.skill, dir:[5,6] });
  const dmg = Math.max(1, Math.round(u.atk*0.7));
  assert(f1.hp===h10-dmg && f2.hp===h20-dmg, `T4b 横扫直线双敌各 70% 攻（-${dmg}）`);
  assert(u.stamina===75 && u.cds['挥扫']===3, 'T4c 消耗 25⚡ / 进 CD 3');
  assert(u.hasAttacked===true, 'T4d 已消耗攻击次数');

  // ===== T5 挥扫弹道清瓦砾（攻击类技能）=====
  Battle.b.terrain[5][8] = 'rubble';
  u.cds={}; u.stamina=100; u.hasAttacked=false;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.shovel.skill, dir:[5,6] });
  assert(Battle.b.terrain[5][8]==='stonebox', 'T5 弹道瓦砾被清除为石头物资箱');

  // ===== T6 泼火锅汤上调 90% =====
  const sk = DATA.CLASSES.chef.skills[0];
  assert(sk.name==='泼火锅汤' && sk.mult===0.9 && sk.desc.includes('90%'), 'T6 泼火锅汤 70%→90%（desc 同步）');

  // ===== T7 打造弹窗武器页收录 =====
  UI.openCraftTab('weapon');
  const cmh = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(cmh.includes('铁锹') && cmh.includes('挥扫'), 'T7 打造弹窗武器页含铁锹与技能摘要');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
