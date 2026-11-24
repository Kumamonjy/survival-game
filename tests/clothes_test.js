/* V236 护甲线扩充：比基尼（暴击率+5%/暴伤+10%）/ 运动背心（HP20/防5/体10）/ 棉袄（HP60/防15/体-15） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义 =====
  const B = DATA.EQUIPS.bikini, V = DATA.EQUIPS.sportvest, C = DATA.EQUIPS.paddedcoat;
  assert(B && B.name==='比基尼' && B.slot==='armor' && B.icon==='🩱' && B.stats.critRate===5 && B.stats.critDmg===10 && !B.stats.def, 'T1a 比基尼：暴击率+5%/暴伤+10%/零防');
  assert(V && V.name==='运动背心' && V.slot==='armor' && V.icon==='🦺' && V.stats.hp===20 && V.stats.def===5 && V.stats.stamina===10, 'T1b 运动背心：HP20/防5/体10');
  assert(C && C.name==='棉袄' && C.slot==='armor' && C.icon==='🧥' && C.stats.hp===60 && C.stats.def===15 && C.stats.stamina===-15, 'T1c 棉袄：HP60/防15/体-15');

  // ===== T2 配方 =====
  const rb = DATA.RECIPES.find(r=>r.id==='bikini'), rv = DATA.RECIPES.find(r=>r.id==='sportvest'), rc = DATA.RECIPES.find(r=>r.id==='paddedcoat');
  assert(rb && rb.cost.gold===72 && rb.cost.fabric===6 && rb.stamina===5, 'T2a 比基尼 72💰+6🧵 / 5⚡（V239 金币×1.2）');
  assert(rv && rv.cost.gold===42 && rv.cost.fabric===12 && rv.stamina===12, 'T2b 运动背心 42💰+12🧵 / 12⚡');
  assert(rc && rc.cost.gold===88 && rc.cost.fabric===20 && rc.cost.metal===8 && rc.stamina===15, 'T2c 棉袄 88💰+20🧵+8⚙️ / 15⚡');
  assert(Game.craftCost('bikini').gold===72 && Game.craftCost('paddedcoat').fabric===20, 'T2d craftCost 派生一致');

  // ===== T3 打造入包（护甲走工坊：需 Lv1 + 工匠当值）=====
  g.workshopLv = 1;
  const wc = Game.createChar('civilian','裁缝'); wc.stamina = 9999; wc.injured = false; g.chars.push(wc);
  Game.assignWorkshop(wc.id);
  g.res.gold = 500; g.res.fabric = 60; g.res.metal = 20;
  Game.craft('bikini'); Game.craft('sportvest'); Game.craft('paddedcoat');
  assert((g.bagInst||[]).some(e=>e.id==='bikini') && (g.bagInst||[]).some(e=>e.id==='sportvest') && (g.bagInst||[]).some(e=>e.id==='paddedcoat'), 'T3 三件打造入包');

  // ===== T4 属性链 =====
  const t = Game.createChar('civilian','模特'); t.stamina = 9999; t.talents = []; Game.applyTalents(t); Game.recalc(t); g.chars.push(t);
  const baseCrit = Game.effCrit(t), baseDmg = Game.effCritDmg(t), baseHp = Game.effHp(t), baseDef = Game.effDef(t), baseSt = Game.effSt(t);
  const ib = (g.bagInst||[]).find(e=>e.id==='bikini'), iv = (g.bagInst||[]).find(e=>e.id==='sportvest'), ic = (g.bagInst||[]).find(e=>e.id==='paddedcoat');
  Game.equipChar(t.id, 'armor', ib.uid);
  assert(Game.effCrit(t)===baseCrit+5 && Game.effCritDmg(t)===baseDmg+10, 'T4a 比基尼：effCrit +5 / effCritDmg +10');
  Game.equipChar(t.id, 'armor', iv.uid);
  assert(Game.effHp(t)===baseHp+20 && Game.effDef(t)===baseDef+5 && Game.effSt(t)===baseSt+10, 'T4b 运动背心：HP+20/防+5/体+10');
  Game.equipChar(t.id, 'armor', ic.uid);
  assert(Game.effHp(t)===baseHp+60 && Game.effDef(t)===baseDef+15 && Game.effSt(t)===baseSt-15, 'T4c 棉袄：HP+60/防+15/体-15');

  // ===== T5 战斗单位聚合 =====
  UI.teamSelected = [t.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='market'));
  const u = Battle.b.units[0];
  assert(u.maxHp===Game.effHp(t) && u.def===Game.effDef(t), 'T5 战斗单位按棉袄聚合（HP60/防15）');
  Battle.b.over = true;

  // ===== T6 摘要渲染（V235 eqStatsStr）=====
  assert(UI.eqStatsStr(B,0)==='暴击+5%　暴伤+10%', 'T6a 比基尼摘要（暴击+5% 暴伤+10%）');
  assert(UI.eqStatsStr(C,0)==='血+60　防+15　体-15', 'T6b 棉袄摘要（负值体-15）');

  // ===== T7 百科收录 =====
  UI.wikiTab = 'equip'; UI.openWiki();
  const w = elems['wiki-content'].innerHTML;
  assert(w.includes('比基尼') && w.includes('运动背心') && w.includes('棉袄'), 'T7a 百科收录三件新护甲');
  assert(w.includes('工坊制造 💰×72<br>🧵×6<br>5⚡') && w.includes('工坊制造 💰×88<br>🧵×20<br>⚙️×8<br>15⚡'), 'T7b 获取途径显示新配方');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
