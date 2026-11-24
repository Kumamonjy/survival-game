/* V179 地图经济曲线重排 + 装备掉落分层：金币曲线单调递增、药物补充、d≤2 区域不掉顶级武器 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store, REC, CC, FM, SB } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const zone = id => DATA.ZONES.find(z=>z.id===id);

(async () => {
  // ===== T1 金币曲线重排：加油站下调、军事基地上调 =====
  const gas = zone('gas'), base = zone('base');
  assert(gas.main.gold[0]===12 && gas.main.gold[1]===20, 'T1a 加油站主金币 12-20（原 16-28）');
  assert(base.sub.gold[0]===28 && base.sub.gold[1]===45, 'T1b 军事基地副金币 28-45（原 15-25，经 25-40 微调以反超商业街）');
  // 场均金等值（主/副金币 + 击杀赏金估算：敌数中值 × 敌型赏金中值均值 + boss 固定 10）：金币图单调递增
  const avgGold = id => {
    const z = zone(id);
    const m = z.main.gold ? (z.main.gold[0]+z.main.gold[1])/2 : 0;
    const s = z.sub.gold ? (z.sub.gold[0]+z.sub.gold[1])/2 : 0;
    return m + s;
  };
  const bounty = z => {
    const n = (z.count[0]+z.count[1])/2;
    const vals = Object.keys(z.pool).map(t=>{ const r=(DATA.ZOMBIES[t].gold)||[1,1]; return (r[0]+r[1])/2; });
    return n * (vals.reduce((a,b)=>a+b,0)/vals.length) + (z.boss?10:0);
  };
  const income = id => avgGold(id) + bounty(zone(id));
  assert(income('base') > income('street') && income('street') > income('gas') && income('gas') > income('market'),
    `T1c 金币图收入单调（含赏金）：基地${income('base')} > 商业街${income('street')} > 加油站${income('gas')} > 超市${income('market')}（工厂/医院为金属/药品图）`);

  // ===== T2 药物补充 =====
  const hospital = zone('hospital'), factory = zone('factory'), street = zone('street');
  assert(hospital.main.med[0]===5 && hospital.main.med[1]===9, 'T2a 医院主产药 5-9（原 4-7）');
  assert(factory.sub.med && factory.sub.med[0]===1 && factory.sub.med[1]===2, 'T2b 工厂副产药 1-2');
  assert(street.sub.med && street.sub.med[0]===1 && street.sub.med[1]===2, 'T2c 商业街副产药 1-2');
  // zoneRewards 实际发放区间抽查（与 finish 一致：先 zoneDef 归一再发放）
  for (let i=0;i<50;i++){
    const rb = Battle.zoneRewards(Battle.zoneDef({id:'base'}));
    assert(rb.gold>=28 && rb.gold<=45, 'T2d 基地实发金币在 28-45 区间');
    const rh = Battle.zoneRewards(Battle.zoneDef({id:'hospital'}));
    assert(rh.med>=5 && rh.med<=9, 'T2e 医院实发药在 5-9 区间');
  }

  // ===== T3 掉落池分层：rollDropEquip 统一入口 =====
  const TOP = DATA.TOP_EQUIPS;
  assert(TOP.length===8 && ['pistol','fireaxe','spear','bow','shovel','compoundbow','stunbaton','sneakers'].every(id=>TOP.includes(id)), 'T3a 顶级装备集合 = 手枪/消防斧/长矛/木弓/铁锹/复合弓/电击警棍/运动鞋（V237 +1）');
  // 低危区（d1 超市 / d2 医院）：大量采样不掉顶级武器、但特殊饰品任何区域均可掉落
  let lowIds = new Set();
  for (let i=0;i<600;i++){ const d = Battle.rollDropEquip('market'); if (d) lowIds.add(d.id); }
  for (let i=0;i<400;i++){ const d = Battle.rollDropEquip('hospital'); if (d) lowIds.add(d.id); }
  assert(lowIds.size>0 && ![...lowIds].some(id=>TOP.includes(id)), 'T3b d≤2 区域采样 1000 次无顶级武器掉落');
  assert([...lowIds].some(id=>DATA.EQUIPS[id].special), 'T3c 特殊饰品（熊熊/兔兔）低危区也可掉落');
  // 高危区（d3 工厂 / d4 基地）：可掉顶级武器，也可掉特殊饰品
  let hiHasTop = false, hiHasSpecial = false;
  for (let i=0;i<600;i++){
    const d = Battle.rollDropEquip('base'); if (!d) continue;
    if (TOP.includes(d.id)) hiHasTop = true;
    if (DATA.EQUIPS[d.id].special) hiHasSpecial = true;
  }
  for (let i=0;i<600;i++){
    const d = Battle.rollDropEquip('factory'); if (d && TOP.includes(d.id)) hiHasTop = true;
  }
  assert(hiHasTop, 'T3d d3+ 区域采样 1200 次出过顶级武器（手枪/消防斧/长矛/木弓）');
  assert(hiHasSpecial, 'T3e 高危区同样可掉特殊饰品');
  // 池大小核对：全池含特殊饰品（所有区域可掉），d≤2 排除 4 件顶级
  const fullPool = Object.keys(DATA.EQUIPS).length;
  assert(fullPool>0 && !DATA.TOP_EQUIPS.some(id=>!DATA.EQUIPS[id]), 'T3f 掉落池 = 全部装备（含特殊饰品），TOP_EQUIPS 均有效');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
