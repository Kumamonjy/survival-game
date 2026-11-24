/* V237 鞋线扩充：高跟鞋（暴击率+5%/暴伤+10%）/ 运动鞋（HP20/防5/移+1/体20，TOP 高级装备） */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义 =====
  const H = DATA.EQUIPS.heels, S = DATA.EQUIPS.sneakers;
  assert(H && H.name==='高跟鞋' && H.slot==='shoes' && H.icon==='👠' && H.stats.critRate===5 && H.stats.critDmg===10 && !H.stats.def, 'T1a 高跟鞋：暴击率+5%/暴伤+10%/零防');
  assert(S && S.name==='运动鞋' && S.slot==='shoes' && S.icon==='🥾' && S.stats.hp===20 && S.stats.def===5 && S.stats.move===1 && S.stats.stamina===20, 'T1b 运动鞋：HP20/防5/移+1/体20');

  // ===== T2 配方 =====
  const rh = DATA.RECIPES.find(r=>r.id==='heels'), rs = DATA.RECIPES.find(r=>r.id==='sneakers');
  assert(rh && rh.cost.gold===55 && rh.cost.fabric===5 && rh.stamina===6, 'T2a 高跟鞋 55💰+5🧵 / 6⚡（V238 金币↑料↓）');
  assert(rs && rs.cost.gold===85 && rs.cost.fabric===16 && rs.cost.metal===6 && rs.stamina===15, 'T2b 运动鞋 85💰+16🧵+6⚙️ / 15⚡');
  assert(Game.craftCost('heels').gold===55 && Game.craftCost('sneakers').fabric===16, 'T2c craftCost 派生一致');

  // ===== T3 打造入包（工坊）=====
  g.workshopLv = 1;
  const wc = Game.createChar('civilian','鞋匠'); wc.stamina = 9999; wc.injured = false; g.chars.push(wc);
  Game.assignWorkshop(wc.id);
  g.res.gold = 500; g.res.fabric = 60; g.res.metal = 20;
  Game.craft('heels'); Game.craft('sneakers');
  assert((g.bagInst||[]).some(e=>e.id==='heels') && (g.bagInst||[]).some(e=>e.id==='sneakers'), 'T3 两件打造入包');

  // ===== T4 属性链 =====
  const t = Game.createChar('civilian','模特乙'); t.stamina = 9999; t.talents = []; Game.applyTalents(t); Game.recalc(t); g.chars.push(t);
  const baseCrit = Game.effCrit(t), baseDmg = Game.effCritDmg(t), baseHp = Game.effHp(t), baseDef = Game.effDef(t), baseSt = Game.effSt(t), baseMove = Game.effMove(t);
  const ih = (g.bagInst||[]).find(e=>e.id==='heels'), is = (g.bagInst||[]).find(e=>e.id==='sneakers');
  Game.equipChar(t.id, 'shoes', ih.uid);
  assert(Game.effCrit(t)===baseCrit+5 && Game.effCritDmg(t)===baseDmg+10, 'T4a 高跟鞋：effCrit +5 / effCritDmg +10');
  Game.equipChar(t.id, 'shoes', is.uid);
  assert(Game.effHp(t)===baseHp+20 && Game.effDef(t)===baseDef+5 && Game.effSt(t)===baseSt+20, 'T4b 运动鞋：HP+20/防+5/体+20');
  assert(Game.effMove(t)===baseMove+1, `T4c 运动鞋：移速 +1（${baseMove}→${Game.effMove(t)}）`);

  // ===== T5 战斗聚合（mkAlly 读取 effMove）=====
  UI.teamSelected = [t.id];
  await Battle.start(DATA.ZONES.find(z=>z.id==='market'));
  const u = Battle.b.units[0];
  assert(u.move===Game.effMove(t) && u.move===baseMove+1, `T5 战斗单位移速 ${u.move} = 面板 ${Game.effMove(t)}（+1 生效）`);
  Battle.b.over = true;

  // ===== T6 TOP 分层 =====
  assert(DATA.TOP_EQUIPS.includes('sneakers') && !DATA.TOP_EQUIPS.includes('heels'), 'T6a 运动鞋纳入 TOP 高级装备，高跟鞋为普通装备');
  // d3+ 区域可掉、d1-2 不掉（rollDropEquip 分层）
  const d1 = DATA.ZONES.find(z=>z.danger===1), d3 = DATA.ZONES.find(z=>z.danger===3);
  let low = 0, high = 0;
  for (let i=0;i<600;i++){ const e1 = Battle.rollDropEquip(d1.id); if (e1 && e1.id==='sneakers') low++; }
  for (let i=0;i<600;i++){ const e3 = Battle.rollDropEquip(d3.id); if (e3 && e3.id==='sneakers') high++; }
  assert(low===0 && high>0, `T6b 掉落分层：d1 ${low} 次 / d3 ${high} 次（600 采样）`);

  // ===== T7 摘要渲染 =====
  assert(UI.eqStatsStr(H,0)==='暴击+5%　暴伤+10%', 'T7a 高跟鞋摘要');
  assert(UI.eqStatsStr(S,0)==='血+20　防+5　移+1　体+20', 'T7b 运动鞋摘要（移+1 正常显示）');

  // ===== T8 百科收录 =====
  UI.wikiTab = 'equip'; UI.openWiki();
  const w = elems['wiki-content'].innerHTML;
  assert(w.includes('高跟鞋') && w.includes('运动鞋'), 'T8a 百科收录两件新鞋');
  assert(w.includes('💰×55') && w.includes('💰×85'), 'T8b 获取途径显示新配方');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
