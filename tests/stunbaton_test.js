/* V234 高阶武器「电击警棍」⚡：攻+20 射程1，技能「电击」（1格单体 80% + 眩晕1回合，25⚡ CD3）；不可打造，仅 d3+ 掉落 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, DATA, elems } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

(async () => {
  // ===== T1 定义 =====
  const S = DATA.EQUIPS.stunbaton;
  assert(S && S.name==='电击警棍' && S.slot==='weapon' && S.icon==='⚡', 'T1a 电击警棍注册（武器槽 ⚡）');
  assert(S.stats.atk===20 && S.range===1 && !S.stats.def, 'T1b 攻+20 / 射程 1');

  // ===== T2 技能参数 =====
  const sk = S.skill;
  assert(sk && sk.name==='电击' && sk.shape==='target' && sk.range===1 && sk.mult===0.8, 'T2a 电击：1 格单体 80%');
  assert(sk.stun && sk.stun.turns===1 && sk.cost===25 && sk.cd===3, 'T2b 眩晕 1 回合 / 25⚡ / CD3');
  assert(S.desc.includes('不可打造') && S.desc.includes('仅探险掉落'), 'T2c desc 标注不可打造/仅掉落');

  // ===== T3 不可打造 + 顶级掉落分层 =====
  assert(!DATA.RECIPES.some(r=>r.id==='stunbaton'), 'T3a 无打造配方（不可打造）');
  assert(DATA.TOP_EQUIPS.includes('stunbaton'), 'T3b 纳入 TOP_EQUIPS（危险度≤2 不掉落）');
  assert(typeof Game.craft==='function' && !Game.produceConfig('stunbaton'), 'T3c 工坊无该装备生产配置');

  // ===== T4 战斗：80% 伤害 + 眩晕生效 =====
  const s1 = Game.createChar('soldier','警员'); s1.stamina = 9999; s1.talents = []; Game.applyTalents(s1); Game.recalc(s1); g.chars.push(s1);
  Game.addEquip('stunbaton', 1);
  const inst = (g.bagInst||[]).find(e=>e.id==='stunbaton');
  assert(inst, 'T4a 掉落获得后可装备（背包 +1）');
  Game.equipChar(s1.id, 'weapon', inst.uid);
  assert(Game.effAtk(s1)===s1.atk+20 && Game.effRange(s1)===1, 'T4b effAtk +20 / 射程 1');
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(s1, 5, 5);
  const foe = Battle.mkZombie('walker', 5, 6, 1);
  Battle.b.units.push(u, foe);
  u.stamina = 100; u.critRate = 0;   // 关暴击避免随机（soldier 职业固有 10%）
  const hp0 = foe.hp;
  await Battle.execSkill(u, { sk: DATA.EQUIPS.stunbaton.skill, dir:[5,6] });
  const dmg = Math.max(1, Math.round(u.atk*0.8) - foe.def);
  assert(foe.hp===hp0-dmg, `T4c 电击伤害 = round(atk×0.8)-防（-${dmg}）`);
  assert(foe.sts && foe.sts.stun && foe.sts.stun.t===1, 'T4d 目标眩晕 1 回合');
  assert(u.stamina===75 && u.cds['电击']===3, 'T4e 消耗 25⚡ / 进 CD 3 回合');

  // ===== T5 眩晕锁定：目标回合无法行动 =====
  const stunU = Battle.mkZombie('walker', 5, 7, 1);
  Battle.b.units.push(stunU);
  Battle.applyStatus(foe, 'stun', 1, u.uid);
  const hp0b = stunU.hp;
  await Battle.zombieAct(foe);   // 眩晕中的丧尸：直接 return，不行动
  assert(stunU.hp===hp0b && Battle.b.log.some(e=>e.msgs.some(m=>m.m && m.m.includes('眩晕'))), 'T5 眩晕中的目标本回合无法行动（log 提示）');

  // ===== T6 掉落地图严格限定（V241）：仅军事基地/野外营地可掉 =====
  assert((DATA.DROP_ONLY||[]).includes('stunbaton') && (DATA.DROP_ONLY||[]).includes('crystalshoes'), 'T6-0 DROP_ONLY 清单含电击警棍与水晶鞋');
  const HOSP = DATA.ZONES.find(z=>z.id==='hospital'), BASE = DATA.ZONES.find(z=>z.id==='base');
  const CAMP = DATA.ZONES.find(z=>z.id==='camp'), FACT = DATA.ZONES.find(z=>z.id==='factory');
  const STREET = DATA.ZONES.find(z=>z.id==='street'), MKT = DATA.ZONES.find(z=>z.id==='market');
  let hits = 0;
  for (let i=0;i<600;i++) { const e = Battle.rollDropEquip(HOSP); if (e && e.id==='stunbaton') hits++; }
  assert(hits===0, `T6a 医院（d2）采样 600 次不掉电击警棍（实际 ${hits}）`);
  hits = 0;
  for (const Z of [FACT, STREET, MKT]) for (let i=0;i<800;i++) { const e = Battle.rollDropEquip(Z); if (e && e.id==='stunbaton') hits++; }
  assert(hits===0, `T6a2 工厂/商业街/超市采样 2400 次不掉电击警棍（实际 ${hits}）`);
  hits = 0;
  for (let i=0;i<1200;i++) { const e = Battle.rollDropEquip(BASE); if (e && e.id==='stunbaton') hits++; }
  assert(hits>=90 && hits<=300, `T6b 军事基地专属加权（30%×50%≈15%/战）1200 次命中 ${hits}（期望≈180）`);
  hits = 0;
  for (let i=0;i<1000;i++) { const e = Battle.rollDropEquip(CAMP); if (e && e.id==='stunbaton') hits++; }
  assert(hits>=180 && hits<=450, `T6c 野外营地必掉装备中 30% 为警棍，1000 次命中 ${hits}（期望≈300）`);

  // ===== T7 百科收录：获取途径显示「探险掉落」 =====
  UI.wikiTab = 'equip'; UI.openWiki();
  const w = elems['wiki-content'].innerHTML;
  assert(w.includes('电击警棍') && w.includes('⚡'), 'T7a 百科装备图鉴收录');
  assert(w.includes('<td>⚡ 电击警棍</td><td>武器</td><td>攻击力 +20，射程 1；自带技能「电击」：1 格内单体 80% 伤害并眩晕 1 回合（冷却 3 回合，消耗 25 体力）；警用装备，不可打造，仅探险掉落</td><td>探险掉落</td>'), 'T7b 无配方装备获取途径 =「探险掉落」');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.error('TEST ERROR:', e.stack||e.message); process.exit(1); });
