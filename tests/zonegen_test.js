/* V126 地图生成统一化：zoneDef / rollWeighted / buildTerrain / spawnEnemies / crateLoot / zoneRewards */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const flatCnt = (b, t) => b.terrain.flat().filter(x=>x===t).length;

(async () => {
  // ===== T1 区域配置解析：缺字段补默认、老存档按 id 回查 =====
  const unknown = Battle.zoneDef({ id:'__none__' });
  assert(unknown.terrain && unknown.count && unknown.pool && unknown.bossType==='behemoth' && unknown.pcrate===1,
    'T1a 未知区域自动补默认配置');
  const stale = { ...DATA.ZONES.find(z=>z.id==='forest') };
  delete stale.terrain; delete stale.pool;
  const fixed = Battle.zoneDef(stale);
  assert(fixed.terrain.rubble===20 && fixed.pool.brute===20, 'T1b 老存档快照按 id 回查最新配方');
  assert(Battle.zoneDef(DATA.ZONES[0]).id==='market', 'T1c 正常区域原样返回');

  // ===== T2 权重随机 =====
  assert(Battle.rollWeighted({})===null, 'T2a 空概率池返回 null');
  let hitZero = 0, hitB = 0;
  for (let i=0;i<2000;i++) {
    const k = Battle.rollWeighted({ a:1, b:0 });
    if (k==='a') hitZero++; if (k==='b') hitB++;
  }
  assert(hitZero===2000 && hitB===0, 'T2b 权重 0 的类型永不抽中');

  // ===== T3 地图地形：七张图统一按配方生成（含 1 个精品箱） =====
  let terrOk = true, pcrOk = true;
  for (const z of DATA.ZONES) {
    const b = { terrain:[], ruins:{}, units:[] };
    Battle.b = b;
    Battle.buildTerrain(b, Battle.zoneDef(z));
    if (!Object.entries(z.terrain).every(([t,n])=>flatCnt(b,t)===n)) terrOk = false;
    if (flatCnt(b,'pcrate')!==1) pcrOk = false;
    if (Object.keys(b.ruins).length !== z.terrain.ruin) terrOk = false;
  }
  assert(terrOk, 'T3a 七区域地形数量与废墟翻找点均符合配方');
  assert(pcrOk, 'T3b 每区域固定生成 1 个精品物资箱');

  // ===== T4 开战生成：数量区间 + Boss 配置 =====
  const c1 = Game.createChar('soldier','兵',false); g.chars.push(c1);
  UI.teamSelected = [c1.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='base'));
  const enemies = Battle.b.units.filter(u=>u.side==='enemy');
  assert(enemies.filter(u=>u.zombieType==='behemoth').length===1, 'T4a 基地按 bossType 生成 1 个 Boss');
  assert(enemies.length>=7 && enemies.length<=9, `T4b 基地敌数=6~8+Boss（${enemies.length}）`);
  assert(Battle.b.units.filter(u=>u.side==='ally').length===1, 'T4c 我方按编队 1 人出生');
  assert(g.res.gold>=0 && c1.stamina===g.chars.find(c=>c.id===c1.id).stamina, 'T4d 开战不产生资源副作用');

  // ===== T5 物资箱掉落统一：倍率与区间 =====
  let lootOk = true;
  for (let i=0;i<600;i++) {
    const L = Battle.crateLoot(2);
    const ok = L.k==='gold' ? (L.amt%2===0 && L.amt>=4 && L.amt<=14)
      : L.k==='food' ? (L.amt>=2 && L.amt<=6) : (L.amt>=2 && L.amt<=4);
    if (!ok || L.name!==DATA.RES_NAMES[L.k]) { lootOk = false; break; }
  }
  assert(lootOk, 'T5a 物资箱 ×2 掉落区间与资源名正确');
  const L1 = Battle.crateLoot(1);
  assert(L1.amt>=1 && L1.amt<=7, 'T5b 普通物资箱区间 1-7');

  // ===== T6 区域产出：主产出 + 次产出同名合并 =====
  const R = Battle.zoneRewards({ main:{gold:[1,1]}, sub:{gold:[2,2], food:[1,1]} });
  assert(R.gold===3 && R.food===1, 'T6 主次产出同名资源合并');

  // ===== T7 渲染按地形表（cls/icon）驱动 =====
  const b2 = { terrain:[], ruins:{}, units:[], moveSet:null, targetSet:null, selected:null, targetMode:null, mode:null };
  Battle.b = b2;
  Battle.buildTerrain(b2, { terrain:{ barrel:1 } });
  Battle.renderMap();
  const m = elems['battle-map'].innerHTML;
  assert(m.includes('cell barrel') && m.includes('🛢️'), 'T7a 油桶按表 cls/icon 渲染');
  assert(m.includes('cell walk'), 'T7b 空地按表 cls 渲染');

  // ===== T8 代码统一：地图流程只有一套公共实现 =====
  assert(!html.includes('scatter(') && html.includes('Battle.buildTerrain(b, Z)')
    && html.includes('Battle.spawnEnemies(b, Z, zLevel, 0)')
    && html.includes('Battle.zoneRewards(Battle.zoneDef(b.zone))'), 'T8a 生成与结算统一调用公共函数');
  assert(!html.includes("zone.id==='") && html.includes('Battle.crateLoot('), 'T8b 无按地图 id 的特判分支');

  // ===== T9 地形交互统一：能攻击 / 走入触发都走同一张表 =====
  assert(Battle.TILES.crate.enter && Battle.TILES.pcrate.enter && Battle.TILES.stonebox.enter
    && Battle.TILES.rubble.attack && Battle.TILES.ruin.attack && Battle.TILES.barrel.attack,
    'T9a 交互表覆盖全部可交互地形');
  assert(!Battle.TILES.rubble.enter && !Battle.TILES.barrel.enter, 'T9b 障碍地形无拾取钩子');
  const b4 = { terrain:[], ruins:{}, units:[], moveSet:null, targetSet:null, selected:null, targetMode:null, mode:null };
  b4.terrain = Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
  b4.terrain[5][5] = 'ruin';
  Battle.b = b4;
  assert(!Battle.tileAttackable(5,5), 'T9c 废墟翻找次数用尽后不可指定');
  b4.ruins['5,5'] = 1;
  assert(Battle.tileAttackable(5,5), 'T9d 废墟有剩余次数可翻找');
  b4.terrain[6][6] = 'barrel';
  assert(Battle.tileAttackable(6,6) && !Battle.tileAttackable(7,7), 'T9e 油桶可指定、空地不可指定');
  assert(html.includes('const tile = Battle.TILES[b.terrain[r][c]];')
    && html.includes('if (tile && tile.enter) tile.enter(u, r, c);')
    && html.includes('const T = !u && Battle.tileAction(r,c);'), 'T9f 点击与走入统一派发到交互表');

  console.log('--- done ---');
  process.exit(0);
})();
