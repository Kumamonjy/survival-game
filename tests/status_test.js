/* 战斗状态系统验证（8 状态 + 结算/刷新/消退/归属） */
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

  // ===== T1 攻击修正 =====
  Battle.applyStatus(z, 'strong', 3, 'u1');
  assert(Battle.effAtk(z)===P(z.atk*1.2), 'T1a 强力+20%');
  Battle.applyStatus(z, 'weak', 3, 'u1');
  assert(Battle.effAtk(z)===P(P(z.atk*1.2)*0.8), 'T1b 强弱共存依序相乘');
  // T1c 信息栏：状态修正用彩色箭头替代星号（▲增强/▼减弱）
  const infoEl = () => elems['b-unitinfo'] ? elems['b-unitinfo'].innerHTML : '';
  z.sts = { strong:{t:2} }; Battle.renderInfo(z);
  assert(infoEl().includes('🗡️<b>'+Battle.effAtk(z)+'</b>') && infoEl().includes('▲') && !infoEl().includes('*'), 'T1c 强力状态攻击显示生效值+▲（无星号）');
  z.sts = { weak:{t:2} }; Battle.renderInfo(z);
  assert(infoEl().includes('▼') && !infoEl().includes('▲'), 'T1d 虚弱状态攻击显示▼');
  z.sts = {};
  Battle.applyStatus(nurse, 'lame', 3, null);
  Battle.renderInfo(nurse);
  assert(infoEl().includes('👟<b>'+Battle.effMove(nurse)+'</b>') && infoEl().includes('▼'), 'T1e 瘸腿移速显示▼');

  // T1f-i 折叠信息栏：默认两行（状态详情收进 u-extra），点击展开/收起
  const ui = elems['b-unitinfo'];
  Battle.infoOpen = false; Battle.renderInfo(z);
  assert(ui.classList.contains('open')===false && ui.innerHTML.includes('u-extra') && ui.innerHTML.includes('▸ 展开详情'), 'T1f 默认折叠：u-extra 隐藏+展开提示');
  assert(ui.innerHTML.includes('✅ 无异常状态'), 'T1f-b 无状态时展开区显示占位说明');
  ui.onclick();
  assert(ui.classList.contains('open') && ui.innerHTML.includes('▾ 收起'), 'T1g 点击展开（open 态+收起提示）');
  ui.onclick();
  assert(ui.classList.contains('open')===false && ui.innerHTML.includes('▸ 展开详情'), 'T1h 再点收起');
  z.sts = { burn:{t:3}, poison:{t:2} }; Battle.infoOpen = true; Battle.renderInfo(z);
  assert(ui.innerHTML.includes('燃烧 3回合') && ui.innerHTML.includes('中毒 2回合'), 'T1i 展开后显示状态详情（图标+名称+回合）');
  z.sts = {}; Battle.infoOpen = false;

  // ===== T2 瘸腿与保底移速 =====
  Battle.applyStatus(nurse, 'lame', 3, null);
  assert(Battle.effMove(nurse)===2, 'T2a 瘸腿-1');
  nurse.move = 1;
  assert(Battle.effMove(nurse)===1, 'T2b 保底移速1');
  nurse.move = 3; nurse.sts = {};

  // ===== T3 中毒：回合结算 10% / 递减 / 消退 / 击杀归属 =====
  z.hp = 200; z.maxHp = 200;
  Battle.applyStatus(z, 'poison', 5, 'u1');
  Battle.tickStatuses(); Battle.tickStatuses(); Battle.tickStatuses(); Battle.tickStatuses();
  assert(z.hp===200-P(200*0.10)*4, 'T3a 四回合毒发');
  assert(z.sts.poison && z.sts.poison.t===1, 'T3b 计时递减');
  Battle.tickStatuses();
  assert(!z.sts.poison, 'T3c 5回合后消退');
  const z2 = mkZ(7,6); z2.hp = 15; b.units.push(z2);
  Battle.applyStatus(z2, 'poison', 5, 'u1');
  Battle.tickStatuses();
  assert(z2.hp===0, 'T3d 毒发身亡');
  assert(b.stats['u1'] && b.stats['u1'].kill===1, 'T3e 击杀归属施加者');

  // ===== T4 流血：行动结算 6% =====
  const w1 = mkZ(4,6); w1.hp = 200; w1.maxHp = 200; b.units.push(w1);
  Battle.applyStatus(w1, 'bleed', 3, 'u1');
  await Battle.bleedTick(w1);
  assert(w1.hp===200-P(200*0.06), 'T4 流血6%');

  // ===== T5 燃烧：8%血 + 8%体力 =====
  const w2 = mkZ(3,6); w2.hp = 200; w2.maxHp = 200; w2.stamina = 100; w2.maxStamina = 100; b.units.push(w2);
  Battle.applyStatus(w2, 'burn', 3, 'u1');
  Battle.tickStatuses();
  assert(w2.hp===200-P(200*0.08) && w2.stamina===100-Math.max(1,P(100*0.08)), 'T5 燃烧血+体力');

  // ===== T6 治愈：5% 回血 =====
  const a1 = Battle.mkAlly({ uid:'a1', name:'小满', cls:'civilian', level:1, exp:0, av:'🧍',
    hp:100, maxHp:200, stamina:50, maxStamina:120, atk:20, def:5, range:1, move:3, critRate:0, critDmg:150 }, 2,2);
  b.units.push(a1);
  Battle.applyStatus(a1, 'heal', 3, null);
  Battle.tickStatuses();
  assert(a1.hp===100+P(200*0.05), 'T6 治愈5%');

  // ===== T7 调息：5% 回体力 =====
  const a2 = Battle.mkAlly({ uid:'a2', name:'阿勇', cls:'civilian', level:1, exp:0, av:'🧍',
    hp:200, maxHp:200, stamina:50, maxStamina:120, atk:20, def:5, range:1, move:3, critRate:0, critDmg:150 }, 1,2);
  b.units.push(a2);
  Battle.applyStatus(a2, 'regen', 3, null);
  Battle.tickStatuses();
  assert(a2.stamina===50+P(120*0.05), 'T7 调息5%');

  // ===== T8 同名刷新（不叠加计时）=====
  const w3 = mkZ(6,7); b.units.push(w3);
  Battle.applyStatus(w3, 'poison', 3, 'u1');
  Battle.applyStatus(w3, 'poison', 5, 'u1');
  assert(w3.sts.poison.t===5 && Object.keys(w3.sts).filter(k=>k==='poison').length===1, 'T8 同名刷新为5回合');

  // ===== T9 多状态共存 =====
  Battle.applyStatus(w3, 'weak', 2, 'u1');
  assert(w3.sts.poison && w3.sts.weak, 'T9 不同状态共存');

  // ===== T10 状态表完整 =====
  const S = DATA.STATUSES;
  assert(S.poison.dmgPct===0.10 && S.bleed.dmgPct===0.06 && S.burn.dmgPct===0.08 && S.weak.atkMod===-0.20 && S.strong.atkMod===0.20 && S.heal.healPct===0.05 && S.regen.regenPct===0.05 && S.lame.moveMod===-1 && S.stun && S.stun.bad===true && S.root && S.root.icon==='⛓️' && S.frozen && S.frozen.icon==='❄️' && Object.keys(S).length===11, 'T10 状态表完整');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
