/* V115 出征体力费链路：canBattle 判定 ≥15 + Battle.start 实扣 15/人（未出战不扣、下限 0） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 判定端：canBattle 边界（14 拒 / 15 过）+ 源码门槛
  const a = g.chars[0], b = g.chars[1], c3 = g.chars[2];
  a.injured = false; a.stamina = 14;
  assert(!Game.canBattle(a), 'T1a 体力 14 不可出战');
  a.stamina = 15;
  assert(Game.canBattle(a), 'T1b 体力 15 可出战（边界）');
  assert(html.includes('!c.injured && c.stamina >= 15'), 'T1c 判定源码：≥15 出征费门槛');

  // T2 扣除端：出发实扣 15/人，未出战成员不扣
  a.stamina = 100; b.stamina = 60; c3.stamina = 77;
  UI.teamSelected = [a.id, b.id];
  await Battle.start(DATA.ZONES[0]);
  assert(a.stamina===85 && b.stamina===45, `T2a 出战二人各扣 15（${a.stamina}/${b.stamina}）`);
  assert(c3.stamina===77, 'T2b 未出战成员不扣');
  assert(html.includes('c.stamina = Math.max(0, c.stamina - 15)'), 'T2c 扣除源码：下限 0 保护');

  // T3 边界：恰好 15 出发后归 0
  const d = Game.createChar('civilian','边界者'); d.stamina = 15; d.injured = false; g.chars.push(d);
  UI.teamSelected = [d.id];
  await Battle.start(DATA.ZONES[0]);
  assert(d.stamina===0, 'T3 体力恰好 15 出发后归 0');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
