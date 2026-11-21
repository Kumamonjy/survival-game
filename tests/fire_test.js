/* V161 残留火焰地形：油桶/燃烧瓶留下火焰 2 回合，踩上或停留 → 燃烧 2~3 回合 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkBattle() {
  const b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null,
    loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, fire:{}, over:false,
    subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  Battle.b = b;
  return b;
}

(async () => {
  // ===== T1 配置与样式 =====
  assert(DATA.FIRE && DATA.FIRE.turns===2 && DATA.FIRE.burnTurns===2, 'T1a 火焰持续 2 回合 / 踩火固定燃烧 2 回合');
  assert(html.includes('.cell.fire') && html.includes('.fire-fx') && html.includes('@keyframes fireFlick'), 'T1b 火焰地形样式（跳动火苗动画）');
  assert(html.includes("const fireT = (b.fire && b.fire[r+','+c]) || 0"), 'T1c 渲染读取火焰层');
  assert(html.includes('残留火焰 2 回合'), 'T1d 百科说明残留火焰规则');

  // ===== T2 点燃规则 =====
  const b = mkBattle();
  assert(Battle.ignite(2, 2) === true && Battle.fireAt(2,2), 'T2a 平地可点燃');
  assert(b.fire['2,2'] === 2, 'T2b 默认持续 2 回合');
  b.terrain[3][3] = 'water';
  assert(Battle.ignite(3,3) === false && !Battle.fireAt(3,3), 'T2c 水面不可燃');
  b.terrain[4][4] = 'barrel';
  assert(Battle.ignite(4,4) === false, 'T2d 油桶格不铺火焰');
  Battle.ignite(2, 2, 5);
  assert(b.fire['2,2'] === 5, 'T2e 同一格重复点燃取较长时长');

  // ===== T3 踩火燃烧时长（固定 2 回合，已有更长燃烧不被缩短）=====
  const c1 = Game.createChar('soldier','火一',false); g.chars.push(c1);
  const u1 = Battle.mkAlly(c1, 2, 2);
  Battle.fireBurn(u1);
  assert(u1.sts && u1.sts.burn && u1.sts.burn.t === 2, `T3a 踩火 → 固定燃烧 2 回合（${u1.sts.burn.t}）`);
  u1.sts.burn.t = 5;
  Battle.fireBurn(u1);
  assert(u1.sts.burn.t === 5, 'T3b 已有更长燃烧不被火焰缩短');

  // ===== T4 回合末：火焰 -1 回合并熄灭 =====
  b.fire = { '1,1':2, '1,2':1 };
  Battle.tickFire();
  assert(b.fire['1,1'] === 1 && b.fire['1,2'] === undefined, 'T4a 每回合 -1，到 0 熄灭');
  Battle.tickFire();
  assert(!Battle.fireAt(1,1), 'T4b 第二回合结束全部熄灭');

  // ===== T5 油桶爆炸留下 3×3 火焰 =====
  const b5 = mkBattle();
  b5.terrain[5][5] = 'barrel';
  const z5 = Battle.mkZombie('walker', 9, 9, 1); b5.units.push(z5);   // 远处敌人，避免战斗结算
  const c5 = Game.createChar('soldier','火五',false); g.chars.push(c5);
  const u5 = Battle.mkAlly(c5, 0, 0); b5.units.push(u5);
  await Battle.explodeBarrel(5, 5, null);
  const lit5 = Object.keys(b5.fire).length;
  assert(lit5 === 9, `T5a 油桶爆炸点燃周围 3×3 共 9 格（${lit5}）`);
  assert(Battle.fireAt(5,5) && Battle.fireAt(4,4) && Battle.fireAt(6,6) && !Battle.fireAt(3,3), 'T5b 火焰范围正确');
  assert(b5.fire['5,5'] === 2, 'T5c 火焰持续 2 回合');

  // ===== T6 燃烧瓶：十字 5 格留火 =====
  const b6 = mkBattle();
  const c6 = Game.createChar('soldier','火六',false); g.chars.push(c6);
  Game.addEquip('molotov', 1);
  Game.carryItem(c6.id, 'molotov');
  const u6 = Battle.mkAlly(c6, 5, 5); b6.units.push(u6);
  const msk = u6.skills.find(x=>x.equipSkill && x.name==='投掷燃烧瓶');
  assert(msk && msk.fire && msk.fire.turns===2, 'T6a 燃烧瓶技能带残留火焰配置');
  u6.stamina = 100;
  await Battle.execSkill(u6, { sk: msk, cell:[5,7] });
  assert(Battle.fireAt(5,7) && Battle.fireAt(4,7) && Battle.fireAt(6,7) && Battle.fireAt(5,6) && Battle.fireAt(5,8),
    'T6b 十字 5 格全部燃起火焰');
  assert(!Battle.fireAt(4,6) && !Battle.fireAt(6,8), 'T6c 斜角不燃');
  assert(Object.keys(b6.fire).length === 5, `T6d 恰好 5 格火焰（${Object.keys(b6.fire).length}）`);

  // ===== T7 火中停留：回合末仍被点燃 =====
  const b7 = mkBattle();
  const c7 = Game.createChar('soldier','火七',false); g.chars.push(c7);
  const u7 = Battle.mkAlly(c7, 3, 3); b7.units.push(u7);
  b7.fire['3,3'] = 2;
  Battle.tickFire();
  assert(u7.sts && u7.sts.burn && u7.sts.burn.t === 2, 'T7a 站在火焰上会被点燃（固定 2 回合）');
  assert(b7.fire['3,3'] === 1, 'T7b 同时火焰倒计时');

  // ===== T8 防御工事不受火焰影响 =====
  const tw = { side:'ally', isTower:true, hp:200, maxHp:200, row:4, col:4, sts:{} };
  b7.units.push(tw);
  b7.fire['4,4'] = 2;
  Battle.tickFire();
  assert(!tw.sts.burn, 'T8 防御工事不会被点燃');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
