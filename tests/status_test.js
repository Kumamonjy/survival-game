/* 战斗状态系统验证（V121 收敛为 4 种实际会触发的状态 + 结算/刷新/消退/归属） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const mkZ=(row,col)=>Battle.mkZombie('walker',row,col,1);
const mkB=(units)=>({ units, selected:units[0], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
  mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null,
  loot:{gold:0,med:0,metal:0,food:0}, ruins:{}, over:false, subtitleT:null });

(async () => {
  const nurse = { uid:'u1', name:'护士', side:'ally', hp:200, maxHp:200, stamina:120, maxStamina:120, atk:30, def:10, move:3, range:1, cds:{}, sts:{}, row:5, col:5, hasMoved:false, hasAttacked:false, critRate:5, critDmg:150 };
  const z = mkZ(5,6);
  const b = mkB([nurse, z]); Battle.b = b;
  const P = Math.round;

  // ===== T1 强力：攻击 +20% =====
  Battle.applyStatus(z, 'strong', 3, 'u1');
  assert(Battle.effAtk(z)===P(z.atk*1.2), 'T1a 强力+20%');
  assert(z.sts.strong && z.sts.strong.t===3, 'T1b 计时记录');

  // ===== T2 中毒：回合结算 10% / 递减 / 消退 / 击杀归属 =====
  z.sts = {}; z.hp = 200; z.maxHp = 200;
  Battle.applyStatus(z, 'poison', 5, 'u1');
  Battle.tickStatuses(); Battle.tickStatuses(); Battle.tickStatuses(); Battle.tickStatuses();
  assert(z.hp===200-P(200*0.10)*4, 'T2a 四回合毒发');
  assert(z.sts.poison && z.sts.poison.t===1, 'T2b 计时递减');
  Battle.tickStatuses();
  assert(!z.sts.poison, 'T2c 5回合后消退');
  const z2 = mkZ(7,6); z2.hp = 15; b.units.push(z2);
  Battle.applyStatus(z2, 'poison', 5, 'u1');
  Battle.tickStatuses();
  assert(z2.hp===0, 'T2d 毒发身亡');
  assert(b.stats['u1'] && b.stats['u1'].kill===1, 'T2e 击杀归属施加者');

  // ===== T3 燃烧：8%血 + 8%体力 =====
  const w2 = mkZ(3,6); w2.hp = 200; w2.maxHp = 200; w2.stamina = 100; w2.maxStamina = 100; b.units.push(w2);
  Battle.applyStatus(w2, 'burn', 3, 'u1');
  Battle.tickStatuses();
  assert(w2.hp===200-P(200*0.08) && w2.stamina===100-Math.max(1,P(100*0.08)), 'T3 燃烧血+体力');

  // ===== T4 眩晕：负面状态记录（行动层由回合流程拦截） =====
  const w4 = mkZ(2,6); b.units.push(w4);
  Battle.applyStatus(w4, 'stun', 2, 'u1');
  assert(w4.sts.stun && w4.sts.stun.t===2 && DATA.STATUSES.stun.bad===true, 'T4 眩晕 2 回合');

  // ===== T5 同名刷新（不叠加计时）=====
  const w3 = mkZ(6,7); b.units.push(w3);
  Battle.applyStatus(w3, 'poison', 3, 'u1');
  Battle.applyStatus(w3, 'poison', 5, 'u1');
  assert(w3.sts.poison.t===5 && Object.keys(w3.sts).filter(k=>k==='poison').length===1, 'T5 同名刷新为5回合');

  // ===== T6 多状态共存 =====
  Battle.applyStatus(w3, 'strong', 2, 'u1');
  assert(w3.sts.poison && w3.sts.strong, 'T6 不同状态共存');

  // ===== T7 状态表：仅 4 种实际会触发的状态 =====
  const S = DATA.STATUSES;
  assert(S.poison.dmgPct===0.10 && S.burn.dmgPct===0.08 && S.strong.atkMod===0.20 && S.stun && S.stun.bad===true && Object.keys(S).length===4, 'T7 状态表 4 种');
  assert(!S.bleed && !S.weak && !S.heal && !S.regen && !S.lame, 'T7b 无施加来源的死状态已移除');
  // 百科状态页与技能来源对应
  assert(html.includes('护士「注射毒药」5 回合') && html.includes('麻醉飞镖」2 回合'), 'T7c 百科状态来源与持续一致');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
