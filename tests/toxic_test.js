/* V242 毒气桶：绿色桶（filter hue-rotate 280deg），引爆 = 8 格 20 伤(-防御) + 中毒 3 回合 + 3×3 毒气 3 回合（踩上/停留中毒 3）；
   毒气与火焰/冰冻三方互相覆盖；可连锁；医院 4 / 工厂 5 / 军事基地 3 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义：绿色桶（filter 数据驱动着色） =====
  const TT = DATA.TERRAIN.toxic;
  assert(TT && TT.name==='毒气桶' && TT.walk===false && TT.icon==='🛢️' && TT.cls==='toxic', 'T1a TERRAIN.toxic 定义（不可通行油桶）');
  assert(TT.blast==='toxic' && TT.filter && TT.filter.includes('hue-rotate'), 'T1b blast=toxic，绿色滤镜与红/蓝桶区分');
  assert(TT.desc.includes('中毒') && TT.desc.includes('20 点'), 'T1c desc 说明中毒机制与 20 点伤害');
  assert(html.includes('.cell.toxic') && html.includes('.cell.gas'), 'T1d 毒气桶格/毒气地形 CSS');
  assert(Battle.TILES.toxic && Battle.TILES.toxic.attackable===true, 'T1e 普攻可选毒气桶为目标');
  assert(Battle.isBarrelLike('toxic') && Battle.isBarrelLike('barrel') && Battle.isBarrelLike('iceN') && !Battle.isBarrelLike('crate'), 'T1f isBarrelLike 含毒气桶');
  assert(html.includes("blast:'toxic'"), 'T1g 桶型 blast 字段数据驱动');

  // ===== T2 引爆：8 格 20 伤（结算防御）+ 中毒 3 + 3×3 毒气 3 回合，无燃烧无冰冻 =====
  const mkA = (name,uid,r,c) => Battle.mkAlly({ uid, name, cls:'civilian', level:1, exp:0, av:'🧍',
    hp:300, maxHp:300, stamina:100, maxStamina:100, atk:20, def:0, range:1, move:3, critRate:0, critDmg:150 }, r, c);
  const u = mkA('幸存者','p1',3,8);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{}, ice:{} };
  Battle.b.terrain[5][5] = 'toxic';
  const mk = (r,col)=>{ const z = Battle.mkZombie('walker', r, col, 1); z.def = 10; z.critRate = 0; Battle.b.units.push(z); return z; };
  const es = [[4,4],[4,5],[4,6],[5,4],[5,6],[6,4],[6,5],[6,6]].map(([r,c])=>mk(r,c));
  const hps = es.map(z=>z.hp);
  await Battle.explodeBarrel(5, 5, null);
  assert(Battle.b.terrain[5][5]==='plain', 'T2a 毒气桶爆后消失');
  assert(es.every((z,i)=>z.hp===hps[i]-10), 'T2b 8 格各受 10 = 20-防御10（伤害结算防御）');
  assert(es.every(z=>z.sts && z.sts.poison && z.sts.poison.t===3), 'T2c 8 格全部中毒 3 回合');
  assert(es.every(z=>!(z.sts && z.sts.burn) && !(z.sts && z.sts.frozen)), 'T2d 毒气爆炸不产生燃烧/冰冻');
  const gasKeys = Object.keys(Battle.b.gas);
  assert(gasKeys.length===9 && gasKeys.every(k=>Battle.b.gas[k]===3), `T2e 3×3 毒气各 3 回合（${gasKeys.length} 格）`);
  assert(!Battle.b.gas['3,8'], 'T2f 2 格外无毒气');
  assert(u.hp===u.maxHp && !(u.sts && u.sts.poison), 'T2g 远处单位无伤无毒');

  // ===== T3 三方互斥（后一个覆盖前一个）：函数级 =====
  Battle.b.terrain[8][8] = 'plain';
  Battle.ignite(8, 8, 3);
  Battle.gasFloor(8, 8, 3);
  assert(Battle.b.gas['8,8']===3 && !Battle.b.fire['8,8'], 'T3a 毒气覆盖火焰');
  Battle.freezeFloor(8, 8, 2);
  assert(Battle.b.ice['8,8']===2 && !Battle.b.gas['8,8'], 'T3b 冰冻覆盖毒气');
  Battle.gasFloor(8, 8, 3);
  assert(Battle.b.gas['8,8']===3 && !Battle.b.ice['8,8'], 'T3c 毒气覆盖冰冻');
  Battle.ignite(8, 8, 3);
  assert(Battle.b.fire['8,8']>0 && !Battle.b.gas['8,8'], 'T3d 火焰覆盖毒气');
  assert(Battle.b.fire['8,8']===3, 'T3e 点燃取较长时长不受覆盖影响');

  // ===== T4 连锁：毒气桶 → 相邻毒气桶/油桶连锁，波及与状态正确 =====
  Battle.b.terrain = Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
  Battle.b.terrain[8][8]='toxic'; Battle.b.terrain[8][9]='toxic';
  const e9 = mk(7,8); e9.def = 0; e9.hp = 300; e9.maxHp = 300;
  const e9hp = e9.hp;
  Battle._barrelSeq = 0;
  await Battle.explodeBarrel(8, 8, null);
  assert(Battle.b.terrain[8][8]==='plain' && Battle.b.terrain[8][9]==='plain', 'T4a 毒气桶引爆后相邻毒气桶连锁炸开');
  assert(e9.hp===e9hp-40, `T4b 相邻敌人先受 20 再受连锁 20（-40，实际 -${e9hp-e9.hp}）`);
  assert(e9.sts && e9.sts.poison && e9.sts.poison.t===3, 'T4c 连锁毒气附加中毒 3 回合');
  assert(Battle.b.gas['8,8']===3 && Battle.b.gas['7,8']===3, 'T4d 两处毒气地形均生成');
  assert(Battle.b.log.some(e=>e.msgs.some(x=>x.m.includes('连锁炸裂'))), 'T4e 连锁炸裂字幕入战斗记录');
  // 混合连锁：油桶 → 毒气桶（毒气覆盖油桶火焰）
  Battle.b.terrain[3][3]='barrel'; Battle.b.terrain[3][4]='toxic';
  Battle.b.gas = {}; Battle.b.fire = {};
  Battle._barrelSeq = 0;
  await Battle.explodeBarrel(3, 3, null);
  assert(Battle.b.terrain[3][3]==='plain' && Battle.b.terrain[3][4]==='plain', 'T4f 油桶引爆后毒气桶连锁');
  assert(Battle.b.gas['3,4']===3 && !Battle.b.fire['3,4'], 'T4g 连锁毒气覆盖本格油桶火焰');

  // ===== T5 踩毒：进入毒气格立即中毒 3 回合；已有 ≥3 中毒不缩短 =====
  Battle.b.units = [u]; u.row=5; u.col=4; u.sts = {};
  Battle.b.gas = { '5,5': 3 }; Battle.b.fire = {}; Battle.b.ice = {};
  await Battle.doMove(u, 5, 5);
  assert(u.row===5 && u.col===5 && u.sts.poison && u.sts.poison.t===3, 'T5a 踩毒立即中毒 3 回合');
  u.sts.poison.t = 5;
  Battle.gasHit(u);
  assert(u.sts.poison.t===5, 'T5b 已有更长中毒不被缩短');
  u.sts.poison.t = 1;
  Battle.gasHit(u);
  assert(u.sts.poison.t===3, 'T5c 更短中毒续到 3 回合');
  assert(html.includes('if (Battle.gasAt(r,c)) Battle.gasHit(u);'), 'T5d doMove 踩毒挂点');

  // ===== T6 毒气衰减：回合结束 -1，站毒中持续中毒，消散有日志 =====
  Battle.b.units = [u]; u.row=1; u.col=1; u.sts = {}; u.hp = u.maxHp;
  Battle.b.gas = { '1,1':2, '2,2':1 };
  Battle.tickGas();
  assert(Battle.b.gas['1,1']===1 && !Battle.b.gas['2,2'], 'T6a 毒气 -1，归零消散');
  assert(u.sts.poison && u.sts.poison.t===3, 'T6b 站毒气中持续吸入中毒 3 回合');
  Battle.tickGas();
  assert(!Battle.b.gas['1,1'], 'T6c 再一回合全部消散');
  assert(Battle.b.log.some(e=>e.msgs && e.msgs.some(x=>x.m.includes('毒气消散了'))), 'T6d 消散日志');
  assert(html.includes('Battle.tickGas();'), 'T6e 回合结算接入 tickGas');

  // ===== T7 地图配比：医院 4 / 工厂 5 / 军事基地 3，其他地图不放 =====
  const T = id => DATA.ZONES.find(z=>z.id===id).terrain;
  assert(T('hospital').toxic===4 && T('factory').toxic===5 && T('base').toxic===3, 'T7a 医院 4 / 工厂 5 / 军事基地 3');
  assert(!T('gas').toxic && !T('camp').toxic && !T('forest').toxic && !T('market').toxic && !T('street').toxic, 'T7b 加油站/营地/林场/超市/商业街不放毒气桶');
  const c = Game.createChar('soldier','兵',false); g.chars.push(c);
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='hospital'));
  const cnt = t => Battle.b.terrain.flat().filter(x=>x===t).length;
  assert(cnt('toxic')===4, `T7c 医院实际散布毒气桶 4（${cnt('toxic')}）`);

  // ===== T8 渲染：toxic 格绿色滤镜、毒气格 ☠️ =====
  const b2 = { terrain:[], ruins:{}, units:[], moveSet:null, targetSet:null, selected:null, targetMode:null, mode:null };
  Battle.b = b2;
  Battle.buildTerrain(b2, { terrain:{ toxic:3 } });
  b2.gas = { '1,1': 3 };
  Battle.renderMap();
  const m = elems['battle-map'].innerHTML;
  assert(m.includes('cell toxic') && m.includes('hue-rotate(280deg)'), 'T8a 毒气桶按表 cls/filter 渲染（绿色）');
  assert(m.includes('walk gas') && m.includes('☠️'), 'T8b 毒气地形渲染 ☠️ + gas 底色');

  // ===== T9 百科收录 =====
  UI.wikiTab='fight'; UI.openWiki();
  const wiki = elems['wiki-content'].innerHTML;
  assert(wiki.includes('毒气桶') && wiki.includes('中毒'), 'T9 百科地形表收录毒气桶');
  UI.wikiTab='map'; UI.openWiki();
  const wikiMap = elems['wiki-content'].innerHTML;
  assert(wikiMap.includes('毒气 3 回合') && wikiMap.includes('互相覆盖'), 'T9b 百科探险规则收录毒气残留说明');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
