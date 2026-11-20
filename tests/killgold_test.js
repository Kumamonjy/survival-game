/* V149 击杀赏金：按丧尸难度 1~10 金币，结算时统一入账 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, DATA } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

const mkU = (ref, side, hp, zt) => ({ uid:'x'+Math.random(), side, ref, hp, maxHp:200, atk:30, def:5, row:1, col:1,
  sts:{}, zombieType:zt, name: ref?ref.name:zt, hasMoved:false, hasAttacked:false, stamina:100, maxStamina:100 });

(async () => {
  // ===== T1 图鉴赏金区间：全部 1~10 =====
  const Z = DATA.ZOMBIES;
  const bad = Object.entries(Z).filter(([k,z])=>!Array.isArray(z.gold) || z.gold[0]<1 || z.gold[1]>10 || z.gold[0]>z.gold[1]);
  assert(bad.length===0, 'T1a 每种丧尸都有 1~10 的赏金区间');
  assert(Z.walker.gold[1]===2 && Z.behemoth.gold[0]===10, 'T1b 难度对应区间：游荡 1~2、霸主 10');

  // ===== T2 随机取值落在区间内 =====
  let ok = true;
  for (let i=0;i<300;i++) {
    const w = Battle.rollKillGold('walker');
    const br = Battle.rollKillGold('brute');
    if (w<1 || w>2 || br<3 || br>5) { ok = false; break; }
  }
  assert(ok, 'T2a 300 次抽样均在区间内');
  assert(Battle.rollKillGold('behemoth')===10 && Battle.rollKillGold('unknown')===1, 'T2b 霸主固定 10 / 未知类型保底 1');

  // ===== T3 结算入账：撤离也照计，且不受拾取减半影响 =====
  const c = Game.createChar('civilian', '赏金测试');
  g.chars.push(c);
  g.res.gold = 500;
  Battle.b = { zone: DATA.ZONES[0], turn:1, phase:'player', over:false, doubledReward:false,
    loot:{gold:10,med:0,metal:0,food:0}, stats:{}, log:[], ruins:{}, lootBase:null,
    units:[ mkU(c,'ally',100,null),
            mkU(null,'enemy',0,'walker'), mkU(null,'enemy',0,'walker'), mkU(null,'enemy',0,'behemoth'),
            mkU(null,'enemy',150,'savage') ] };
  await Battle.finish('flee');
  const delta = g.res.gold - 500;
  assert(delta>=10+1+1+10 && delta<=10+2+2+10, 'T3a 赏金合计 12~14（2 游荡 + 霸主）叠加拾取 10 金');

  // ===== T4 未击杀不产出赏金 =====
  g.res.gold = 500;
  Battle.b = { zone: DATA.ZONES[0], turn:1, phase:'player', over:false, doubledReward:false,
    loot:{gold:0,med:0,metal:0,food:0}, stats:{}, log:[], ruins:{}, lootBase:null,
    units:[ mkU(c,'ally',100,null), mkU(null,'enemy',150,'walker') ] };
  await Battle.finish('flee');
  assert(g.res.gold===500, 'T4 零击杀不发放赏金');

  console.log('--- done ---');
  process.exit(0);
})();
