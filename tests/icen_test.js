/* V191 液氮桶：蓝色油桶（无 filter 原色），引爆 = 8 格 60 低温伤(-防御) + 冰冻 1 回合 + 3×3 冰冻地形 2 回合；
   冰冻与火焰地形互相覆盖（后一个覆盖前一个）；可连锁 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义：蓝色桶（数据驱动着色，无 filter 即原色蓝） =====
  const IT = DATA.TERRAIN.iceN;
  assert(IT && IT.name==='液氮桶' && IT.walk===false && IT.icon==='🛢️' && IT.cls==='iceN', 'T1a TERRAIN.iceN 定义（不可通行油桶）');
  assert(IT.blast==='ice' && IT.desc.includes('冰冻'), 'T1b blast=ice，desc 说明冰冻机制');
  assert(!IT.filter, 'T1c 液氮桶无 filter 字段（🛢️ 原色=蓝，与红桶 filter:hue-rotate 区分）');
  assert(html.includes(".cell.iceN") && html.includes(".cell.ice {"), 'T1d 冰冻格/冰面 CSS');
  assert(Battle.TILES.iceN && Battle.TILES.iceN.attackable===true, 'T1e 普攻可选液氮桶为目标');
  assert(Battle.isBarrelLike('barrel') && Battle.isBarrelLike('iceN') && !Battle.isBarrelLike('crate') && !Battle.isBarrelLike('plain'), 'T1f isBarrelLike 统一桶类判断');
  assert(html.includes("blast:'fire'") && html.includes("blast:'ice'"), 'T1g 桶型由 blast 字段数据驱动分派');

  // ===== T2 引爆：8 格 40 低温伤（结算防御）+ 冰冻 1 + 3×3 冰冻地形 2 回合，无燃烧 =====
  const mkA = (name,uid,r,c) => Battle.mkAlly({ uid, name, cls:'civilian', level:1, exp:0, av:'🧍',
    hp:300, maxHp:300, stamina:100, maxStamina:100, atk:20, def:0, range:1, move:3, critRate:0, critDmg:150 }, r, c);
  const u = mkA('幸存者','p1',3,8);
  Battle.b = { units:[u], selected:u, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false, fires:{}, ice:{} };
  Battle.b.terrain[5][5] = 'iceN';
  const mk = (r,col)=>{ const z = Battle.mkZombie('walker', r, col, 1); z.def = 10; z.critRate = 0; Battle.b.units.push(z); return z; };
  const es = [[4,4],[4,5],[4,6],[5,4],[5,6],[6,4],[6,5],[6,6]].map(([r,c])=>mk(r,c));
  const hps = es.map(z=>z.hp);
  await Battle.explodeBarrel(5, 5, null);
  assert(Battle.b.terrain[5][5]==='plain', 'T2a 液氮桶爆后消失');
  assert(es.every((z,i)=>z.hp===hps[i]-50), 'T2b 8 格各受 50 = 60-防御10（低温伤害结算防御，V221 上调）');
  assert(es.every(z=>z.sts && z.sts.frozen && z.sts.frozen.t===1), 'T2c 8 格全部冰冻 1 回合');
  assert(es.every(z=>!(z.sts && z.sts.burn)), 'T2d 液氮爆炸不产生燃烧');
  const iceKeys = Object.keys(Battle.b.ice);
  assert(iceKeys.length===9 && iceKeys.every(k=>Battle.b.ice[k]===2), `T2e 3×3 冰冻地形各 2 回合（${iceKeys.length} 格）`);
  assert(!Battle.b.ice['3,8'], 'T2f 2 格外不结冰');
  assert(u.hp===u.maxHp && !(u.sts && u.sts.frozen), 'T2g 远处单位无伤无冻');

  // ===== T3 冰/火互斥（后一个覆盖前一个）：函数级 =====
  Battle.b.terrain[8][8] = 'plain';
  Battle.ignite(8, 8, 3);
  assert(Battle.b.fire['8,8'] > 0, 'T3a 点燃生效');
  Battle.freezeFloor(8, 8, 2);
  assert(Battle.b.ice['8,8']===2 && !Battle.b.fire['8,8'], 'T3b 冰冻覆盖火焰');
  Battle.ignite(8, 8, 3);
  assert(Battle.b.fire['8,8'] > 0 && !Battle.b.ice['8,8'], 'T3c 火焰覆盖冰冻');
  assert(Battle.b.fire['8,8']===3, 'T3d 点燃取较长时长不受覆盖影响');

  // ===== T4 连锁端到端：油桶 → 液氮桶连锁，冰覆盖连锁火 =====
  Battle.b.terrain = Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain'));
  Battle.b.terrain[8][8]='barrel'; Battle.b.terrain[8][9]='iceN';
  const e9 = mk(7,8); e9.def = 0; e9.hp = 300; e9.maxHp = 300;
  const e9hp = e9.hp;
  Battle._barrelSeq = 0;
  await Battle.explodeBarrel(8, 8, null);
  assert(Battle.b.terrain[8][8]==='plain' && Battle.b.terrain[8][9]==='plain', 'T4a 油桶引爆后液氮桶连锁炸开');
  assert(e9.hp===e9hp-160, `T4b 相邻敌人先受油桶 100 再受液氮 60（-160，实际 -${e9hp-e9.hp}）`);
  assert(e9.sts && e9.sts.frozen && e9.sts.frozen.t===1, 'T4c 连锁液氮将敌人冻住');
  assert(Battle.b.ice['8,8']===2 && !Battle.b.fire['8,8'], 'T4d 冰冻地形覆盖本格火焰');
  assert(Battle.b.ice['7,8']===2 && !Battle.b.fire['7,8'], 'T4e 冰冻地形覆盖邻格火焰');
  assert(Battle.b.fire['7,7']>0 && !Battle.b.ice['7,7'], 'T4f 冰区外的油桶火焰保留（覆盖仅限重叠格）');
  assert(Battle.b.log.some(e=>e.msgs.some(x=>x.m.includes('连锁炸裂'))), 'T4g 连锁炸裂字幕入战斗记录');

  // ===== T5 踩冰：进入冰格立即冰冻 1 回合；已冻不重刷 =====
  Battle.b.units = [u]; u.row=5; u.col=4; u.sts = {};
  Battle.b.ice = { '5,5': 2 }; Battle.b.fire = {};
  await Battle.doMove(u, 5, 5);
  assert(u.row===5 && u.col===5 && u.sts.frozen && u.sts.frozen.t===1, 'T5a 踩冰立即冰冻 1 回合');
  Battle.freezeHit(u);
  assert(u.sts.frozen.t===1, 'T5b 已冰冻不重刷时长');
  assert(html.includes('if (Battle.iceAt(r,c)) Battle.freezeHit(u);'), 'T5c doMove 踩冰挂点');

  // ===== T6 冰面衰减：回合结束 -1，归零融化 =====
  Battle.b.ice = { '1,1':2, '2,2':1 };
  Battle.tickIce();
  assert(Battle.b.ice['1,1']===1 && !Battle.b.ice['2,2'], 'T6a 冰面 -1，归零移除');
  Battle.tickIce();
  assert(!Battle.b.ice['1,1'], 'T6b 再一回合全部融化');
  assert(Battle.b.log.some(e=>e.msgs && e.msgs.some(x=>x.m.includes('冰面融化了'))), 'T6c 融化日志');
  assert(html.includes('Battle.tickIce();') && !html.includes('Battle.tickIce() && Battle.tickFire'), 'T6d 回合结算接入 tickIce');

  // ===== T7 地图配比：加油站无液氮（纯油桶图），工厂/医院液氮多，林场/营地不放 =====
  const T = id => DATA.ZONES.find(z=>z.id===id).terrain;
  assert(!T('gas').iceN && T('gas').barrel===24, 'T7a 加油站无液氮桶（纯红油桶 24，液氮直接移除）');
  assert(T('factory').iceN===12 && T('hospital').iceN===7 && T('factory').iceN>T('hospital').iceN, 'T7b 工厂液氮 12 / 医院 7（V221 上调；资源图液氮多）');
  assert(T('market').iceN===2 && T('base').iceN===9 && T('street').iceN===2, 'T7c 超市 2 / 军事基地 9（V221 上调）/ 商业街 2');
  assert(!T('camp').iceN && T('forest').iceN===5, 'T7d 野外营地不放液氮桶；林场 V233 起放 5 个（替换原 3 油桶）');
  const c = Game.createChar('soldier','兵',false); g.chars.push(c);
  UI.teamSelected = [c.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='factory'));
  const cnt = t => Battle.b.terrain.flat().filter(x=>x===t).length;
  assert(cnt('iceN')===12 && cnt('barrel')===10, `T7e 工厂实际散布液氮 12 / 油桶 10（${cnt('iceN')}/${cnt('barrel')}）`);

  // ===== T8 渲染：iceN 格原色蓝桶、冰面 ❄️、区域卡蓝桶计数 =====
  const b2 = { terrain:[], ruins:{}, units:[], moveSet:null, targetSet:null, selected:null, targetMode:null, mode:null };
  Battle.b = b2;
  Battle.buildTerrain(b2, { terrain:{ iceN:3 } });
  b2.ice = { '1,1': 2 };
  Battle.renderMap();
  const m = elems['battle-map'].innerHTML;
  assert(m.includes('cell iceN') && m.includes('🛢️'), 'T8a 液氮桶按表 cls/icon 渲染（无滤镜=蓝色）');
  assert(m.includes('cell ice') && m.includes('❄️'), 'T8b 冰冻地形渲染 ❄️ + ice 底色');
  const gasStr = UI.terrainStr(T('gas')), facStr = UI.terrainStr(T('factory'));
  assert(gasStr.includes('🛢️</span>24') && !gasStr.includes('🛢️4'), 'T8c 区域卡：加油站仅红桶计数、无蓝桶');
  assert(facStr.includes('🛢️</span>10') && facStr.includes('🛢️12'), 'T8c 工厂区域卡：红桶带滤镜 span、蓝桶原色（V221 液氮 12）');

  // ===== T9 百科收录（地形表自动遍历 TERRAIN） =====
  UI.wikiTab='fight'; UI.openWiki();
  const wiki = elems['wiki-content'].innerHTML;
  assert(wiki.includes('液氮桶') && wiki.includes('冰冻'), 'T9 百科地形表收录液氮桶');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
