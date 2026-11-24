/* V240 水晶鞋：高级装备（TOP），不可打造，商业街 exclusiveEquip 50% 加权掉落；HP20/防5/暴击8%/暴伤16% */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义 =====
  const C = DATA.EQUIPS.crystalshoes;
  assert(C && C.name==='水晶鞋' && C.slot==='shoes' && C.icon==='🩰' && C.stats.hp===20 && C.stats.def===5 && C.stats.critRate===8 && C.stats.critDmg===16, 'T1 水晶鞋定义：HP20/防5/暴击8%/暴伤16%');

  // ===== T2 不可打造 + TOP =====
  assert(!DATA.RECIPES.some(r=>r.id==='crystalshoes'), 'T2a 无打造配方（不可打造）');
  assert(DATA.TOP_EQUIPS.includes('crystalshoes'), 'T2b 纳入 TOP 高级装备');

  // ===== T3 商业街专属掉落 =====
  const street = DATA.ZONES.find(z=>z.id==='street');
  assert(street.exclusiveEquip==='crystalshoes' && street.danger===3, 'T3a 商业街 exclusiveEquip=水晶鞋（d3）');
  // 加权采样：掉装备时约半数水晶鞋
  let cs=0, other=0;
  for (let i=0;i<2000;i++){ const d = Battle.rollDropEquip('street'); if (d){ if (d.id==='crystalshoes') cs++; else other++; } }
  assert(cs>0 && cs > other*0.6, `T3b 商业街加权：水晶鞋 ${cs} vs 其他 ${other}（2000 采样，约半数）`);
  // d1-2 不掉（TOP 分层）
  let low=0;
  for (let i=0;i<600;i++){ const d = Battle.rollDropEquip('market'); if (d && d.id==='crystalshoes') low++; }
  assert(low===0, `T3c 低危险度不掉（超市 600 采样 ${low} 次）`);

  // ===== T4 属性链 =====
  const t = Game.createChar('civilian','模特丙'); t.stamina = 9999; t.talents = []; Game.applyTalents(t); Game.recalc(t); g.chars.push(t);
  const baseHp = Game.effHp(t), baseDef = Game.effDef(t), baseCrit = Game.effCrit(t), baseDmg = Game.effCritDmg(t);
  Game.addEquip('crystalshoes', 1);
  const ic = (g.bagInst||[]).find(e=>e.id==='crystalshoes');
  Game.equipChar(t.id, 'shoes', ic.uid);
  assert(Game.effHp(t)===baseHp+20 && Game.effDef(t)===baseDef+5, 'T4a HP+20/防+5');
  assert(Game.effCrit(t)===baseCrit+8 && Game.effCritDmg(t)===baseDmg+16, 'T4b 暴击率+8%/暴伤+16%');

  // ===== T5 战斗聚合 =====
  UI.teamSelected = [t.id];
  await Battle.start(street);
  const u = Battle.b.units[0];
  assert(u.maxHp===Game.effHp(t), 'T5 战斗单位属性聚合生效');
  Battle.b.over = true;

  // ===== T6 摘要渲染 =====
  assert(UI.eqStatsStr(C,0)==='血+20　防+5　暴击+8%　暴伤+16%', 'T6 摘要（四属性含双暴击）');

  // ===== T7 百科收录 =====
  UI.wikiTab = 'equip'; UI.openWiki();
  const w = elems['wiki-content'].innerHTML;
  assert(w.includes('水晶鞋') && w.includes('探险掉落'), 'T7a 百科收录（获取途径=探险掉落）');
  assert(w.includes('仅商业街废墟掉落') || w.includes('商业街废墟掉落'), 'T7b 描述注明商业街专属');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
