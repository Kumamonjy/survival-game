/* V193 加油站掉落特化：胜利装备掉落 20%→15%，且只掉武器（dropSlot='weapon'，不含顶级武器）；其余地图规则不变 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems, html } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;

(async () => {
  // ===== T1 区域配置：数据驱动 dropRate / dropSlot =====
  const gas = DATA.ZONES.find(z=>z.id==='gas');
  assert(gas.dropRate===0.1 && gas.dropSlot==='weapon', 'T1 加油站 dropRate 10% / dropSlot=weapon');
  assert(gas.danger===1, 'T1b 加油站 danger 1（顶级武器本就被 d≤2 分层排除）');
  const mk = DATA.ZONES.find(z=>z.id==='market');
  assert(mk.dropRate===0.15 && !DATA.ZONES.find(z=>z.id==='hospital').dropSlot, 'T1c 超市 15%，医院未配置 dropSlot（走默认 20% 全池）');

  // ===== T2 加油站采样：约 15% 概率，掉落全部为非顶级武器 =====
  const TOP = DATA.TOP_EQUIPS;
  let drops = 0; const ids = new Set();
  for (let i=0;i<400;i++){ const d = Battle.rollDropEquip('gas'); if (d) { drops++; ids.add(d.id); } }
  assert(drops>=12 && drops<=80, `T2a 400 次采样掉落 ${drops} 次（期望 40，10% 概率生效）`);
  assert([...ids].every(id=>DATA.EQUIPS[id].slot==='weapon'), `T2b 掉落全为武器（${[...ids].join('/')}）`);
  assert([...ids].every(id=>!TOP.includes(id)), 'T2c 不含顶级武器（手枪/消防斧/长矛/木弓/铁锹/复合弓）');
  assert([...ids].every(id=>!DATA.EQUIPS[id].special), 'T2d 不含特殊饰品（非武器自然排除）');
  assert(ids.size>=2, `T2e 采样覆盖至少 2 种武器（${ids.size} 种）`);

  // ===== T3 超市 15%，仍可掉非武器装备 =====
  let mdrops = 0; let hasNonWeapon = false;
  for (let i=0;i<400;i++){ const d = Battle.rollDropEquip('market'); if (d) { mdrops++; if (DATA.EQUIPS[d.id].slot!=='weapon') hasNonWeapon = true; } }
  assert(mdrops>=25 && mdrops<=105, `T3a 超市 400 次采样掉落 ${mdrops} 次（期望 60，15% 概率生效）`);
  assert(hasNonWeapon, 'T3b 超市仍可掉落非武器装备（全池随机）');
  assert(Battle.rollDropEquip({id:'__test_gear', gearDrop:true, dropSlot:'weapon', danger:1}), 'T3c gearDrop 区域无视概率必掉（dropSlot 仍生效）');

  // ===== T4 百科同步更新 =====
  assert(html.includes('<th>装备掉落</th>') && html.includes("?'仅武器':'全类型'") && html.includes('100%</b> 必掉一件') && html.includes('不含顶级武器') && html.includes('table-scroll'), 'T4a 百科地图页表格含装备掉落列（概率+类型+顶级武器标注，可滚动）');
  assert(html.includes('普通区域 20%、超市 15%、工厂/商业街 25%、军事基地 30%、加油站 10% 只掉武器、野外营地必掉一件'), 'T4b 玩法页掉落说明保留');
  assert(!html.includes('装备掉落分层'), 'T4c 底部探险规则不再重复掉落介绍');

  // ===== T5 高难度概率阶梯：工厂/商业街 25%，军事基地 30% =====
  const fz = DATA.ZONES.find(z=>z.id==='factory'), sz = DATA.ZONES.find(z=>z.id==='street'), bz = DATA.ZONES.find(z=>z.id==='base');
  assert(fz.dropRate===0.25 && sz.dropRate===0.25 && bz.dropRate===0.3, 'T5a 工厂/商业街 dropRate 25%、基地 30%');
  assert(fz.danger===3 && bz.danger===4, 'T5b 高难度区域（顶级武器分层不受影响）');
  let bdrops = 0;
  for (let i=0;i<300;i++){ if (Battle.rollDropEquip('base')) bdrops++; }
  assert(bdrops>=55 && bdrops<=135, `T5c 基地 300 次采样掉落 ${bdrops} 次（期望 90，30% 概率生效）`);

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.message); process.exit(1); });
