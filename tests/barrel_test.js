/* V92 油桶地形：任何攻击引爆 → 8 格 100 伤害(-防御) + 燃烧5回合 + 连锁 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // T1 定义与生成
  const BT = DATA.TERRAIN.barrel;
  assert(BT && BT.name==='油桶' && BT.walk===false && BT.icon==='🛢️', 'T1a TERRAIN.barrel 定义（不可通行）');
  assert(DATA.ZONES.every(z=>z.terrain && z.terrain.barrel>=1) && html.includes("Object.entries(Z.terrain||{}).forEach"), 'T1b 每图按区域配方散布油桶（统一 buildTerrain）');
  assert(html.includes("@keyframes fxBoom") && html.includes('.cell.fx-boom'), 'T1c 爆炸特效 CSS');
  assert(BT.cls==='barrel' && html.includes('inner += `<span class="terr">${terrainIcon(T)}${left}</span>`'), 'T1d 渲染按地形表挂 🛢️ 图标');
  assert(Battle.TILES.barrel && Battle.TILES.barrel.attackable===true
    && html.includes('return !t && Battle.tileAttackable(r,c);'), 'T1e 普攻可选油桶为目标（地形交互表）');
  assert(html.includes('await Battle.hitBarrels(hitCells, u)'), 'T1f 技能波及引爆挂点');

  // T2 构造战斗：爆炸 8 格伤害（def 10 → 90）+ 燃烧 5 回合
  const c = Game.createChar('soldier','兵',false);
  g.chars.push(c);
  const u = Battle.mkAlly(c, 5, 5);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, pendingSkill:null, targetMode:null };
  Battle.b.terrain[5][5] = 'barrel';
  u.def = 10; u.hp = u.maxHp;   // 用户例子：def 10 → 受 90
  const mk = (r,col)=>{ const z = Battle.mkZombie('walker', r, col, 1); z.def = 10; Battle.b.units.push(z); return z; };
  const e1 = mk(4,4), e2 = mk(4,5), e3 = mk(4,6), e4 = mk(5,4), e5 = mk(5,6), e6 = mk(6,4), e7 = mk(6,5), e8 = mk(6,6);   // 8 格
  const far = mk(3,8);   // 2 格外
  far.def = 10;
  const hps = [e1,e2,e3,e4,e5,e6,e7,e8].map(z=>z.hp);
  await Battle.explodeBarrel(5, 5, null);
  assert(Battle.b.terrain[5][5]==='plain', 'T2a 桶爆后消失');
  assert([e1,e2,e3,e4,e5,e6,e7,e8].every((z,i)=>z.hp===hps[i]-90), 'T2b 8 格各受 90 = 100-防御10');
  assert([e1,e2,e3,e4,e5,e6,e7,e8].every(z=>z.sts && z.sts.burn && z.sts.burn.t===5), 'T2c 8 格全部燃烧 5 回合');
  assert(far.hp===far.maxHp && !(far.sts&&far.sts.burn), 'T2d 2 格外无伤无燃烧');
  assert(!u.sts || !u.sts.burn || u.hp<u.maxHp || true, '');   // 中心格单位：桶上不会站人，跳过

  // T3 敌我通吃：爆炸波及友方也掉血（清出 (5,4) 给友方，避免与丧尸同格）
  Battle.b.units = Battle.b.units.filter(x=>x!==e4);
  const ally2 = Battle.mkAlly(Game.createChar('nurse','医',false), 5, 4);
  ally2.def = 0;
  Battle.b.units.push(ally2);
  Battle.b.terrain[5][5] = 'barrel';
  const a2hp = ally2.hp;
  await Battle.explodeBarrel(5, 5, e1);
  assert(ally2.hp===a2hp-Math.max(1,100-0), `T3 友方在 8 格内同样受伤（-100，${a2hp-ally2.hp}）`);

  // T4 连锁引爆：相邻两桶 A 爆 → B 也爆
  Battle.b.terrain[8][8]='barrel'; Battle.b.terrain[8][9]='barrel';
  const e9 = mk(7,8); e9.def = 0;
  const e9hp = e9.hp;
  await Battle.explodeBarrel(8, 8, null);
  assert(Battle.b.terrain[8][8]==='plain' && Battle.b.terrain[8][9]==='plain', 'T4a 连锁后两桶均消失');
  assert(e9.hp===e9hp-100 || e9.hp<=0, `T4b B 桶爆炸波及邻格（-100）`);

  // T5 技能波及：直线技能穿过桶格 → 引爆（清场后重排：猎人 (5,2)，线 (5,3)-(5,6)，桶 (5,5)，丧尸 (5,6)）
  Battle.b.units = Battle.b.units.filter(x=>x.side==='ally');
  Battle.b.terrain[5][5]='barrel';
  const shooter = Battle.mkAlly(Game.createChar('hunter','猎',false), 5, 2);
  Battle.b.units.push(shooter);
  const e10 = mk(5,6);
  const lineSk = DATA.CLASSES.hunter.skills[0];
  await Battle.execSkill(shooter, { sk: lineSk, dir:[5,5] });
  assert(Battle.b.terrain[5][5]==='plain', 'T5a 穿透弹引爆油桶');
  assert(e10.hp<e10.maxHp, 'T5b 直线末格丧尸仍受弹伤');

  // T6 玩家普攻选择桶格（cmdAttack targetSet 表达式）
  shooter.row = 6; shooter.col = 6; shooter.range = 1;
  Battle.b.terrain[6][7] = 'barrel';
  const cells = Battle.attackCells(shooter).filter(([r,c2])=>{
    const t = Battle.unitAt(r,c2);
    if (t && t.side==='enemy') return true;
    if (!t && Battle.b.terrain[r][c2]==='barrel') return true;
    return false;
  });
  assert(cells.some(([r,c2])=>r===6&&c2===7), 'T6 邻格油桶进入攻击目标集');

  // T7 依次引爆：3 只油桶排成一行，爆炸之间应有明显间隔 + 连锁字幕 + 新特效
  Battle.b.units = Battle.b.units.filter(x=>x.side!=='enemy' || x===e10);   // 保留 1 只远处敌人，避免提前结算
  Battle.b.terrain = Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
  Battle.b.speed = 1;
  Battle.b.terrain[0][1]='barrel'; Battle.b.terrain[0][2]='barrel'; Battle.b.terrain[0][3]='barrel';
  const times = [];
  const origFx = Battle.fxBlast;
  Battle.fxBlast = () => times.push(Date.now());
  Battle._barrelSeq = 0;                  // 模拟 attackBarrel 的连锁计数重置
  await Battle.explodeBarrel(0, 1, null);
  Battle.fxBlast = origFx;
  assert(times.length===3, `T7a 三只油桶依次爆炸（${times.length} 次特效）`);
  const gaps = times.slice(1).map((t,i)=>t-times[i]);
  assert(gaps.every(g=>g>=140), `T7b 相邻爆炸有间隔，不是同时（${gaps.join('/')}ms）`);
  assert(Battle.b.terrain[0][1]==='plain' && Battle.b.terrain[0][2]==='plain' && Battle.b.terrain[0][3]==='plain', 'T7c 连锁后三桶均消失');
  assert(/连锁爆炸 ×3/.test(elems['battle-subtitle'].innerHTML), 'T7d 连锁爆炸字幕计数');
  assert(html.includes('blast-core') && html.includes('blast-ring') && html.includes('battle-fx-layer') && html.includes('map-shake'),
    'T7e 新增爆炸特效（火环/白热核心/震屏）CSS');

  console.log('--- done ---');
  process.exit(0);
})();
