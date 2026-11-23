/* V210 新武器「鞭子」🪢（攻+8/射程2，28💰+3🧵+1⚙️/10⚡）与消耗品「飞刀」🗡️（技能「小李飞刀」：3格单体 100%攻，10⚡，CD0，22💰+5⚙️/8⚡） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;

(async () => {
  // ===== T1 鞭子定义与配方 =====
  const wp = DATA.EQUIPS.whip;
  assert(wp && wp.slot==='weapon' && wp.stats.atk===8 && wp.range===2 && !wp.skill, 'T1a 鞭子：攻+8 / 射程2 / 无技能');
  const wr = DATA.RECIPES.find(r=>r.id==='whip');
  assert(wr && wr.cost.gold===19 && wr.cost.fabric===5 && wr.cost.metal===2 && wr.stamina===10, 'T1b 鞭子配方 19💰+5🧵+2⚙️ / 10⚡（V226 金币下调材料大增）');

  // ===== T2 飞刀定义与技能参数 =====
  const tk = DATA.EQUIPS.throwknife;
  assert(tk && tk.slot==='item' && tk.consumable===true && !tk.stats, 'T2a 飞刀=道具槽消耗品（无属性）');
  const sk = tk.skill;
  assert(sk && sk.name==='小李飞刀' && sk.equipSkill===true, 'T2b 自带道具技能「小李飞刀」');
  assert(sk.type==='attack' && sk.shape==='target' && sk.range===3 && sk.mult===1.0, 'T2c 攻击技能：单体 / 射程3 / 100% 攻击力');
  assert(sk.cost===10 && sk.cd===1, 'T2d 消耗 10 体力 / 冷却 1 回合（V211 消耗品统一 CD1：同回合不可重复使用）');
  const kr = DATA.RECIPES.find(r=>r.id==='throwknife');
  assert(kr && kr.cost.gold===22 && kr.cost.metal===5 && kr.stamina===8, 'T2e 飞刀配方 22💰+5⚙️ / 8⚡');

  // ===== T3 工坊打造 =====
  g.workshopLv = 1;
  const wc = Game.createChar('civilian','工匠丙'); wc.stamina = 200; wc.injured = false; g.chars.push(wc);
  Game.assignWorkshop(wc.id);
  g.res.gold = 300; g.res.metal = 20; g.res.fabric = 20;
  Game.craft('whip'); Game.craft('throwknife');
  const wInst = (g.bagInst||[]).find(e=>e.id==='whip');
  assert(wInst && Game.bagCount('throwknife')===1, 'T3a 鞭子入包 + 飞刀背包 1 把');

  // ===== T4 鞭子穿戴生效 =====
  s1.range = 1; s1.critRate = 0;   // 固定近战基础值（newGame 初始职业随机，远程职业会让 effRange=max(自身,2)≠2 偶发失败）
  Game.equipChar(s1.id,'weapon',wInst.uid);
  assert(Game.effAtk(s1)===s1.atk+8 && Game.effRange(s1)===2, 'T4a 鞭子：攻击+8 / 射程 2 生效');

  // ===== T5 飞刀携带后技能入列 =====
  Game.addEquip('throwknife', 2);
  Game.carryItem(s1.id, 'throwknife'); Game.carryItem(s1.id, 'throwknife');
  assert(s1.item && s1.item.id==='throwknife' && s1.item.count===2, 'T5a 携带 2 把飞刀');
  const me = Battle.mkAlly(s1, 5, 5);
  const msk = me.skills.find(x=>x.equipSkill && x.name==='小李飞刀');
  assert(!!msk, 'T5b 携带后「小李飞刀」进入技能栏');

  // ===== T6 小李飞刀结算：3 格内单体 100% 攻击力 =====
  const foe = Battle.mkZombie('walker', 5, 8, 1);   // 曼哈顿距离 3，射程边缘
  me.hp = me.maxHp = 300; foe.hp = foe.maxHp = 300;
  foe.def = 0; me.atk = 40; me.critRate = 0;   // 屏蔽暴击（否则偶发 1.8× 暴伤污染断言）
  Battle.b = { units:[me, foe], selected:me,
    terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{},
    over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  me.stamina = 100;
  await Battle.execSkill(me, { sk: msk, cell:[5, 8] });
  assert(foe.hp === 260, `T6a 100% 攻击力 = 40 伤（余 ${foe.hp}）`);
  assert(me.stamina === 90, `T6b 消耗 10 体力（余 ${me.stamina}）`);
  assert(me.item.count === 1, `T6c 用后消耗 1 把（余 ${me.item.count}）`);
  assert(me.hasAttacked === true, 'T6d 本回合行动结束');
  assert(Battle.skCd(me, msk)===1, 'T6e 冷却 1 回合：同一回合不可再次使用');
  Battle.newRoundReset(me);
  assert(Battle.skCd(me, msk)===0, 'T6f 下一回合冷却结束，可再次使用');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
