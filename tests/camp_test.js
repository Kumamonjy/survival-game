/* V187 新探险地图「野外营地」（⛺ d2）：敌人全为劫掠者、金币比同级图丰厚/其他资源偏少、胜利 100% 掉一件装备（d≤2 分层自动排除高阶武器） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 地图定义 =====
  const camp = DATA.ZONES.find(z=>z.id==='camp');
  assert(camp && camp.name==='野外营地' && camp.danger===2 && !camp.boss, 'T1a 野外营地：2 星难度 / 无 Boss');
  assert(camp.gearDrop===true, 'T1b gearDrop：胜利必掉装备标记');

  // ===== T2 敌人池：全劫掠者 =====
  const RAIDER_TYPES = ['raider_mug','raider_thug','raider_snatcher','raider_drunk'];
  const keys = Object.keys(camp.pool);
  assert(keys.length===4 && keys.every(k=>RAIDER_TYPES.includes(k)), 'T2a 敌人池仅含劫掠者 4 种');
  assert(Object.values(camp.pool).reduce((a,b)=>a+b,0)===100, 'T2b 敌人池权重合计 100');
  UI.teamSelected = g.chars.slice(0,3).map(c=>c.id);   // 出战 3 人（start 需要 teamSelected）
  const enemyTypes = new Set();
  Battle.start(camp);
  Battle.b.units.filter(u=>u.side==='enemy').forEach(u=>enemyTypes.add(u.zombieType));
  assert([...enemyTypes].every(t=>RAIDER_TYPES.includes(t)), 'T2c 生成的敌人全部为劫掠者类型');

  // ===== T3 产出曲线：金币厚、其他薄 =====
  const gas = DATA.ZONES.find(z=>z.id==='gas');
  assert(camp.main.gold[0]===22 && camp.main.gold[1]===34, 'T3a 主产出金币 22-34');
  assert(camp.main.gold[0] > gas.main.gold[1], 'T3b 金币下限高于加油站上限（同级图更丰厚）');
  const subs = Object.values(camp.sub);
  assert(subs.every(r=>r[1]<=3), 'T3c 副产出区间均 ≤3（其他资源偏少）');
  assert(camp.sub.med && camp.sub.med[0]===1, 'T3d 含少量药品');

  // ===== T4 必掉装备 + 不出高阶 =====
  const TOP = DATA.TOP_EQUIPS;
  const drops = Array.from({length:40}, ()=>Battle.rollDropEquip(camp));
  assert(drops.every(d=>d && d.id), 'T4a 40 次采样均有装备掉落（100% 必掉）');
  assert(drops.every(d=>!TOP.includes(d.id)), 'T4b 掉落池不含高阶装备（手枪/消防斧/长矛/木弓/铁锹）');

  // ===== T5 胜利结算实际掉一件入包 =====
  const bagCnt0 = (g.bagInst||[]).length;
  Battle.b.units.filter(u=>u.side==='enemy').forEach(u=>{ u.hp=0; u.dead=true; });
  Battle.finish('win');
  assert((g.bagInst||[]).length===bagCnt0+1, 'T5 胜利结算背包恰好 +1 件装备');

  // ===== T6 普通图不受影响 =====
  const hospital = DATA.ZONES.find(z=>z.id==='hospital');
  assert(!hospital.gearDrop, 'T6a 普通图无必掉标记');
  let dropCnt = 0;
  for (let i=0;i<300;i++) if (Battle.rollDropEquip('hospital')) dropCnt++;
  assert(dropCnt<90 && dropCnt>10, `T6b 普通图掉落仍受 20% 概率控制（300 次中 ${dropCnt} 次）`);

  // ===== T7 wiki 收录 =====
  UI.wikiTab='map'; UI.openWiki();
  const wh = elems['wiki-content'].innerHTML;
  assert(wh.includes('野外营地') && wh.includes('⛺'), 'T7a 百科地图页收录野外营地');
  assert(wh.includes('必定') || wh.includes('100%'), 'T7b 地图说明含必掉装备提示');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
