/* V173 军人第一技能「火力压制」→「擒拿」：指定类型攻击，1格单体 70%攻 + 眩晕1回合，35⚡ CD4 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义：军人一技能换为擒拿，参数与双技能结构 =====
  const sol = DATA.CLASSES.soldier, sk = sol.skills[0];
  assert(sk && sk.name==='擒拿' && sk.type==='attack' && sk.shape==='target', 'T1a 军人一技能「擒拿」（指定类型攻击）');
  assert(sk.mult===0.7 && sk.range===1 && sk.cost===35 && sk.cd===4, 'T1b 70%攻 / 1格 / 35⚡ / CD4');
  assert(sk.stun && sk.stun.turns===1, 'T1c 命中附加眩晕 1 回合');
  assert(sol.skills.length===2 && sol.skills[1].name==='近身格斗', 'T1d 第二技能「近身格斗」保持不变');
  assert(!sol.skills.some(s=>s.name==='火力压制'), 'T1e 军人不再持有火力压制');

  // ===== T2 战斗：70% 伤害 + 目标眩晕 1 回合 + 扣 35⚡ + 进 CD4 =====
  const s1 = Game.createChar('soldier', '擒拿手');
  s1.talents = []; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  const me = Battle.mkAlly(s1, 5, 5);
  const foe = Battle.mkZombie('walker', 5, 6, 1); foe.hp = foe.maxHp;
  Battle.b = { units:[me, foe], selected:me, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  me.critRate = 0; foe.critRate = 0;
  me.stamina = 100; me.hasMoved = false; me.hasAttacked = false;
  await Battle.execSkill(me, { sk, target: foe });
  const dmg = Math.max(1, Math.round(me.atk*0.7) - foe.def);
  assert(foe.hp===foe.maxHp-dmg, `T2a 伤害 = round(atk×0.7)-防（-${dmg}）`);
  assert(foe.sts && foe.sts.stun && foe.sts.stun.t===1, `T2b 目标眩晕 1 回合（t=${foe.sts.stun&&foe.sts.stun.t}）`);
  assert(me.stamina===65 && me.cds['擒拿']===4, 'T2c 消耗 35⚡ / 进 CD 4 回合');
  assert(me.hasAttacked===true, 'T2d 技能后置灰标记');

  // ===== T3 眩晕敌人跳过行动（复用通用状态管线） =====
  const meP = Battle.mkAlly(Game.createChar('civilian', '路人'), 5, 4);
  meP.hp = meP.maxHp;
  Battle.b.units.push(meP);
  Battle.b.log = [];
  await Battle.zombieAct(foe);
  const logs = Battle.b.log.flatMap(e=>e.msgs).map(x=>x.m).join('|');
  assert(/眩晕中，无法行动/.test(logs), 'T3a 眩晕敌人跳过行动日志');
  assert(meP.hp===meP.maxHp, 'T3b 眩晕敌人未攻击（我方无伤）');

  // ===== T4 选择层：可选格仅 1 格内敌人 =====
  const far = Battle.mkZombie('walker', 5, 8, 1); far.hp = far.maxHp;
  Battle.b.units.push(far);
  const cells = Battle.targetCells(me, sk);
  assert(cells.some(([r,c])=>r===5&&c===6) && !cells.some(([r,c])=>r===5&&c===8), 'T4 可选格含 1 格内目标、不含 3 格外');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
