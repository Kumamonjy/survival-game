/* V136 雨天改为战场河水：不再降低丧尸移速，改为生成不可通行的河水（留缺口且保证连通） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const Z = id => DATA.ZONES.find(z=>z.id===id);
const waterCnt = () => Battle.b.terrain.flat().filter(x=>x==='water').length;

(async () => {
  // T1 天气文案与移速脱钩
  const rain = DATA.WEATHERS.find(w=>w.id==='rain');
  assert(rain && rain.desc.includes('河水') && rain.desc.includes('不可通行'), 'T1a 雨天描述改为河水不可通行');
  assert(!rain.desc.includes('移速'), 'T1b 雨天不再影响移速');

  // T2 effMove 不受下雨影响（仍受瘸腿影响）
  g.weather = 'rain';
  const z = Battle.mkZombie('walker', 0, 0, 1);
  assert(Battle.effMove(z)===z.move, 'T2a 雨天丧尸移速不变');
  z.sts = { lame:1 };
  assert(Battle.effMove(z)===Math.max(1,z.move-1), 'T2b 瘸腿仍 -1');

  // T3 晴天不涨水
  g.weather = 'sunny';
  const c = Game.createChar('soldier','兵',false); g.chars.push(c);
  UI.teamSelected = [c.id]; c.stamina = 100;
  await Battle.start(Z('market'));
  assert(waterCnt()===Z('market').terrain.water, `T3 晴天水量 = 区域配方（${waterCnt()}）`);

  // T4 雨天额外河水：数量增加、日志提示、单位不被淹、全场连通
  let allOK = true, extraMin = 99;
  for (let i=0;i<8;i++) {
    g.weather = 'rain';
    UI.teamSelected = [c.id]; c.stamina = 100; c.injured = false;
    await Battle.start(Z('market'));
    const extra = waterCnt() - Z('market').terrain.water;
    extraMin = Math.min(extraMin, extra);
    if (extra < 4) allOK = false;
    if (Battle.b.units.some(u=>Battle.b.terrain[u.row][u.col]==='water')) allOK = false;
    const reach = Battle.rainReach(Battle.b);
    if (!Battle.b.units.filter(u=>u.side==='ally').every(u=>reach.has(u.uid))) allOK = false;
  }
  assert(allOK, `T4 雨天 8 局均生成 ≥4 格河水且不淹单位、保持连通（最少 ${extraMin}）`);
  assert(Battle.b.log.some(e=>e.msgs.some(m=>m.m.includes('河水'))), 'T4b 战报提示河水');

  // T5 rainRiver 只淹空地：障碍/箱子/单位原样保留
  const b = { units:[], terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')), ruins:{} };
  Battle.b = b;
  const ally = { uid:'a1', side:'ally', row:12, col:5, hp:10 };
  const foe = { uid:'e1', side:'enemy', row:0, col:5, hp:10 };
  b.units = [ally, foe];
  b.terrain[12][3] = 'crate'; b.terrain[0][4] = 'ruin'; b.terrain[6][2] = 'barrel';
  const n = Battle.rainRiver(b);
  assert(n >= 4, `T5a 生成河道（${n} 格）`);
  assert(b.terrain[12][5]==='plain' && b.terrain[0][5]==='plain', 'T5b 单位所在格不被淹');
  assert(b.terrain[12][3]==='crate' && b.terrain[0][4]==='ruin' && b.terrain[6][2]==='barrel', 'T5c 箱子/废墟/油桶不被覆盖');
  assert(Battle.rainConnected(b), 'T5d 河道后全体连通');

  // T6 雾天仍 -1 射程（不受本次改动影响）
  g.weather = 'fog';
  const u = Battle.mkAlly(c, 5, 5);
  assert(Battle.effRange(u) === Math.max(1, u.range-1), 'T6 雾天射程 -1 保持不变');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
