/* V130 燃烧瓶：工坊消耗品 · 投掷燃烧瓶（2 格落点，十字 5 格内所有角色受伤+燃烧 2 回合） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;

(async () => {
  // ===== T1 装备定义 =====
  const M = DATA.EQUIPS.molotov;
  assert(M && M.name === '燃烧瓶' && M.slot === 'item' && M.icon === '🔥' && M.consumable === true && !M.stats,
    'T1a 燃烧瓶=道具槽消耗品（无属性）');
  const sk = M.skill;
  assert(sk && sk.name === '投掷燃烧瓶' && sk.equipSkill === true, 'T1b 自带道具技能「投掷燃烧瓶」');

  // ===== T2 技能参数 =====
  assert(sk.type === 'attack' && sk.shape === 'aoe' && sk.range === 2 && sk.area === 1, 'T2a 攻击技能：aoe / 射程2 / 半径1');
  assert(sk.cost === 15 && sk.cd === 0, 'T2b 消耗 15 体力 / 无冷却');
  assert(sk.fixedDmg === 40, 'T2c 固定 40 点伤害（无视防御）');
  assert(sk.burn && sk.burn.turns === 2, 'T2d 附加燃烧 2 回合');
  assert(sk.hitsAll === true, 'T2e 敌我不分（hitsAll）');

  // ===== T3 工坊配方 =====
  const r = DATA.RECIPES.find(x => x.id === 'molotov');
  assert(r && r.cost.gold === 26 && r.cost.metal === 1 && r.cost.fabric === 2 && r.stamina === 10,
    'T3a 配方 26💰+1⚙️+2🧵 / 10⚡');
  const P = Game.produceConfig('molotov');
  assert(P && P.building === 'workshopLv' && P.craft === true && P.duty === 'workshopChef', 'T3b 只能工坊打造（需工匠当值）');

  // ===== T4 打造入包 =====
  g.workshopLv = 1;
  const wc = Game.createChar('civilian', '工匠丙'); wc.stamina = 100; wc.injured = false; g.chars.push(wc);
  Game.assignWorkshop(wc.id);
  g.res.gold = 100; g.res.metal = 10; g.res.fabric = 10;
  const bag0 = Game.bagCount('molotov'), st0 = wc.stamina;
  Game.craft('molotov');
  assert(Game.bagCount('molotov') === bag0 + 1, 'T4a 打造成功背包 +1 燃烧瓶');
  assert(g.res.gold === 74 && g.res.metal === 9 && g.res.fabric === 8, `T4b 实扣 26💰+1⚙️+2🧵（${g.res.gold}/${g.res.metal}/${g.res.fabric}）`);
  assert(wc.stamina === st0 - 10, 'T4c 工匠扣 10 体力');

  // ===== T5 携带后技能入列 =====
  Game.addEquip('molotov', 2);
  Game.carryItem(s1.id, 'molotov'); Game.carryItem(s1.id, 'molotov');
  assert(s1.item && s1.item.id === 'molotov' && s1.item.count === 2, 'T5a 携带 2 个燃烧瓶');
  const me = Battle.mkAlly(s1, 5, 5);
  const msk = me.skills.find(x => x.equipSkill && x.name === '投掷燃烧瓶');
  assert(!!msk, 'T5b 携带后「投掷燃烧瓶」进入技能栏');

  // ===== T6 投掷结算：十字 5 格内敌我双方均由 40 伤 + 燃烧 2 =====
  const mate = Battle.mkAlly(s2, 5, 6);      // 友军，紧邻落点（会被波及）
  const foe1 = Battle.mkZombie('walker', 5, 7, 1);   // 落点中心
  const foe2 = Battle.mkZombie('runner', 6, 7, 1);   // 落点下侧
  const far = Battle.mkZombie('walker', 0, 0, 1);    // 圈外，不受影响
  me.hp = me.maxHp = 300; mate.hp = mate.maxHp = 300;
  foe1.hp = foe1.maxHp = 300; foe2.hp = foe2.maxHp = 300; far.hp = far.maxHp = 300;
  mate.def = 0; foe1.def = 0; foe2.def = 0;
  Battle.b = { units:[me, mate, foe1, foe2, far], selected:me,
    terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{},
    over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  me.stamina = 100;
  await Battle.execSkill(me, { sk: msk, cell:[5, 7] });
  assert(foe1.hp === 260 && foe2.hp === 260, `T6a 两个敌人各受 40 伤（${foe1.hp}/${foe2.hp}）`);
  assert(mate.hp === 260, `T6b 友军也被波及 40 伤（${mate.hp}）`);
  assert(far.hp === 300, 'T6c 圈外单位不受影响');
  assert(foe1.sts && foe1.sts.burn && foe1.sts.burn.t >= 2 && foe1.sts.burn.t <= 3, `T6d 敌人陷入燃烧 2~3 回合（${foe1.sts.burn.t}，落点残留火焰续燃）`);
  assert(mate.sts && mate.sts.burn && mate.sts.burn.t >= 2 && mate.sts.burn.t <= 3, `T6e 友军同样燃烧 2~3 回合（${mate.sts.burn.t}）`);
  assert(me.stamina === 85, `T6f 消耗 15 体力（余 ${me.stamina}）`);
  assert(me.item.count === 1, `T6g 用后消耗 1 个（余 ${me.item.count}）`);
  assert(me.hasAttacked === true, 'T6h 本回合行动结束');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
