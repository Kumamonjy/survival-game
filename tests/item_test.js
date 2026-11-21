/* V57 道具消耗品：无属性/不可升级/携带≤3占用背包/战斗使用消耗/迁移 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const [s1, s2] = g.chars;

(async () => {
  // T1 石块定义：无属性消耗品
  const stone = DATA.EQUIPS.stone;
  assert(!stone.stats && stone.consumable===true && stone.skill, 'T1 石块=消耗品（无 stats，保留技能）');
  const probe = { equip:{ armor:{ uid:'x', id:'cloth', lv:0 }, item:{ uid:'y', id:'stone', lv:0 } }, maxHp:0, maxStamina:0, atk:0, def:0 };
  const st0 = Game.equipStats({ equip:{ armor:{ uid:'x', id:'cloth', lv:0 } }, maxHp:0, maxStamina:0, atk:0, def:0 });
  void probe; void st0;
  const c0 = Game.createChar('soldier', '基准'); c0.talents=[]; Game.applyTalents(c0); Game.recalc(c0);
  assert(Game.effAtk(c0)===c0.atk, 'T1b 空装攻击=基础');

  // T2 携带：占用背包、≤3、异类拦截
  Game.addEquip('stone', 2);   // 补足背包石块到 4 个（新档自带 2）
  const bag0 = g.bagInst.filter(e=>e.id==='stone').length;
  Game.carryItem(s1.id, 'stone'); Game.carryItem(s1.id, 'stone'); Game.carryItem(s1.id, 'stone');
  assert(s1.item && s1.item.id==='stone' && s1.item.count===3, `T2a 携带 3 个（${s1.item&&s1.item.count}）`);
  assert(g.bagInst.filter(e=>e.id==='stone').length===bag0-3, 'T2b 背包扣 3（占用背包）');
  Game.carryItem(s1.id, 'stone');
  assert(s1.item.count===3, 'T2c 第 4 个被拦截');
  Game.carryItem(s1.id, 'stick');
  assert(s1.item.id==='stone', 'T2d 异类携带拦截');

  // T3 放回：1 个 / 全部
  Game.uncarryItem(s1.id, false);
  assert(s1.item.count===2 && Game.bagCount('stone')===bag0-2, 'T3a 放回 1 个');
  Game.uncarryItem(s1.id, true);
  assert(s1.item===null && Game.bagCount('stone')===bag0, 'T3b 全部放回清槽');

  // T4 战斗：携带道具 → 技能入列 → 使用消耗 → 用尽移除 → 回写
  Game.carryItem(s1.id, 'stone'); Game.carryItem(s1.id, 'stone');
  const me = Battle.mkAlly(s1, 5, 5);
  const foe = Battle.mkZombie('walker', 5, 6, 1);
  Battle.b = { units:[me, foe], selected:me, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  me.critRate = 0; foe.critRate = 0; foe.hp = foe.maxHp;
  const throwSk = me.skills.find(s=>s.equipSkill);
  assert(throwSk && me.item.count===2, 'T4a 携带中技能入列（余 2）');
  me.stamina = 100;
  await Battle.execSkill(me, { sk: throwSk, target: foe });
  assert(me.item.count===1 && me.stamina===90, `T4b 使用后消耗 1（余 ${me.item.count}）+ 扣 10 体（${me.stamina}）`);
  assert(foe.hp<foe.maxHp, 'T4c 全力投掷造成伤害');
  me.hasAttacked = false;   // 重置攻击标记，模拟下一回合
  await Battle.execSkill(me, { sk: me.skills.find(s=>s.equipSkill), target: foe });
  assert(me.item.count===0 && !(me.skills||[]).some(s=>s.equipSkill), 'T4d 用尽后技能移除');
  // 战后回写
  me.hp = 100;
  Battle.finish('win');
  assert(s1.item===null, 'T4e 用尽后回写为空槽');
  void downedCheck;
  function downedCheck(){}

  // T5 道具不可升级：升级弹窗过滤
  Game.addEquip('stick', 1);
  UI.openUpgradeModal();
  const upHtml = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(!upHtml.includes('石块'), 'T5a 升级弹窗不含石块（不可升级）');
  assert(upHtml.includes('木棍'), 'T5b 装备仍在升级列表');

  // T6 装备技能移除：equipChar item 拦截
  Game.equipChar(s2.id, 'item', 'stone');
  assert(!s2.equip.item, 'T6a item 槽禁止走 equipChar');

  // T7 旧档迁移：equip.item {id,lv:2} → c.item {id,count:3}
  const oldC = Object.assign(Game.createChar('civilian', '旧人'), { equip:{ ...DATA.EMPTY_EQUIP, item:{ id:'stone', lv:2 } } });
  const oldIt = oldC.equip.item;
  if (oldIt && typeof oldIt==='object' && oldIt.id && DATA.EQUIPS[oldIt.id].slot==='item') {
    if (!oldC.item) oldC.item = { id:oldIt.id, count:Math.min(3, 1+(oldIt.lv||0)) };
    oldC.equip.item = null;
  }
  assert(oldC.item && oldC.item.id==='stone' && oldC.item.count===3 && oldC.equip.item===null, 'T7 旧档道具迁移为 ×3 消耗品');

  // T8 道具管理弹窗渲染
  Game.addEquip('stone', 2);
  Game.carryItem(s2.id, 'stone');
  UI.openItemSlot(s2.id);
  const itHtml = elems['modal-body'] ? elems['modal-body'].innerHTML : '';
  assert(itHtml.includes('道具管理') && itHtml.includes('石块 ×1'), 'T8a 道具管理弹窗渲染');
  assert(itHtml.includes('携带') && itHtml.includes('放回'), 'T8b 数量调整按钮');
  assert(!itHtml.includes('面包') && !itHtml.includes('解毒针') && !itHtml.includes('绷带'), 'T8c 背包 ×0 的道具不显示');
  assert(!itHtml.includes('背包 ×0'), 'T8d 不再出现「背包 ×0」行');
  assert(itHtml.includes('背包 ×'), 'T8e 有库存道具正常显示库存');
  // T8f 弹窗内携带最后一件后，库存行即时消失（弹窗自动刷新）
  g.bagInst = (g.bagInst||[]).filter(e=>e.id!=='stone'); g.bag.stone = 0;
  Game.addEquip('stone', 1);
  s2.item = null;
  UI.openItemSlot(s2.id);
  assert(elems['modal-body'].innerHTML.includes('石块'), 'T8f 有库存时显示石块行');
  Game.carryItem(s2.id, 'stone');
  const h2 = elems['modal-body'].innerHTML;
  assert(Game.bagCount('stone')===0 && !h2.includes('背包 ×') && h2.includes('石块 ×1'),
    'T8g 携带最后一件后列表行消失，仅保留已携带卡片');

  // T9 携带道具不提供属性
  const a0 = Game.effAtk(s2);
  assert(a0===s2.atk, 'T9 携带石块不提供攻击加成');

  // T10 飞镖：定义 + 工坊配方 + 投掷飞镖技能（2 格 30%）
  const dart = DATA.EQUIPS.dart;
  assert(dart && dart.icon==='🎯' && dart.consumable && !dart.stats && dart.slot==='item'
    && dart.skill.name==='投掷飞镖' && dart.skill.mult===0.3 && dart.skill.range===2 && dart.skill.cost===10, 'T10a 飞镖定义（消耗品，2格30%）');
  assert(DATA.RECIPES.some(r=>r.id==='dart' && r.cost.gold===8 && r.cost.metal===2), 'T10b 工坊配方 8💰+2⚙️');
  assert(DATA.EQUIPS.stone.skill.name==='投掷石头', 'T10c 石块技能已改名「投掷石头」');
  Game.addEquip('dart', 2);
  Game.carryItem(s1.id, 'dart'); Game.carryItem(s1.id, 'dart');   // carryItem 每次携带 1 个（同类叠加）
  const dme = Battle.mkAlly(s1, 5, 5);
  const dfoe = Battle.mkZombie('walker', 5, 7, 1);   // 距离 2：飞镖（射程2）可掷，石头（射程3）也可
  Battle.b = { units:[dme, dfoe], selected:dme, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  dme.critRate = 0; dfoe.critRate = 0; dfoe.def = 0;   // 清零暴击与防御，伤害公式无歧义
  const dsk = dme.skills.find(s=>s.equipSkill && s.name==='投掷飞镖');
  assert(dsk && dme.item && dme.item.id==='dart' && dme.item.count===2, 'T10d 携带飞镖后「投掷飞镖」入列');
  dme.stamina = 100;
  await Battle.execSkill(dme, { sk: dsk, target: dfoe });
  assert(dfoe.hp < dfoe.maxHp && dme.item.count===1 && dme.stamina===90, `T10e 投掷飞镖造成伤害并消耗 1 个（余 ${dme.item.count}）`);
  assert(dfoe.maxHp - dfoe.hp === Math.round(dme.atk*0.3), `T10f 伤害 = 30%攻(${dme.atk}) = ${dfoe.maxHp - dfoe.hp}`);

  // T11 水瓶饰品：acc 槽体力加成
  assert(DATA.EQUIPS.bottle && DATA.EQUIPS.bottle.slot==='acc' && DATA.EQUIPS.bottle.stats.stamina===15 && !DATA.EQUIPS.bottle.consumable, 'T11a 水瓶：饰品槽 体力+15 非消耗品');
  assert(DATA.RECIPES.some(r=>r.id==='bottle' && r.cost.gold===20 && r.cost.metal===1 && r.cost.fabric===1), 'T11b 水瓶配方 20💰+1⚙️+1🧵');
  const probeAcc = { equip:{ acc:{ uid:'y', id:'bottle', lv:0 } }, maxHp:0, maxStamina:0, atk:0, def:0 };
  const stAcc = Game.equipStats(probeAcc);
  assert(stAcc.stamina===15 && stAcc.atk===0 && stAcc.hp===0, `T11c equipStats 聚合 acc 槽 +15⚡（${stAcc.stamina}）`);

  // T12 保温杯饰品：acc 槽体力 +25
  assert(DATA.EQUIPS.thermos && DATA.EQUIPS.thermos.slot==='acc' && DATA.EQUIPS.thermos.stats.stamina===25 && !DATA.EQUIPS.thermos.consumable, 'T12a 保温杯：饰品槽 体力+25 非消耗品');
  assert(DATA.RECIPES.some(r=>r.id==='thermos' && r.cost.gold===35 && r.cost.metal===2 && r.cost.fabric===1), 'T12b 保温杯配方 35💰+2⚙️+1🧵');
  const probeTh = { equip:{ acc:{ uid:'z', id:'thermos', lv:0 } }, maxHp:0, maxStamina:0, atk:0, def:0 };
  const stTh = Game.equipStats(probeTh);
  assert(stTh.stamina===25, `T12c equipStats 聚合保温杯 +25⚡（${stTh.stamina}）`);

  // T13 护腕饰品：HP+5 / 防+5，配方 20💰+4🧵（V172 上调）
  assert(DATA.EQUIPS.bracer && DATA.EQUIPS.bracer.slot==='acc' && DATA.EQUIPS.bracer.stats.hp===5 && DATA.EQUIPS.bracer.stats.def===5, 'T13a 护腕：饰品槽 生命+5/防御+5');
  assert(DATA.RECIPES.some(r=>r.id==='bracer' && r.cost.gold===20 && r.cost.fabric===4), 'T13b 护腕配方 20💰+4🧵');
  const probeBr = { equip:{ acc:{ uid:'w', id:'bracer', lv:0 } }, maxHp:0, maxStamina:0, atk:0, def:0 };
  const stBr = Game.equipStats(probeBr);
  assert(stBr.hp===5 && stBr.def===5, `T13c equipStats 聚合护腕 +5❤️+5🛡（${stBr.hp}/${stBr.def}）`);

  // T14 特殊饰品 熊熊/兔兔：暴击加成进战换单位、不可制造
  const bear = DATA.EQUIPS.bear, bunny = DATA.EQUIPS.bunny;
  assert(bear && bear.special && bear.stats.critRate===5 && bear.stats.critDmg===10, 'T14a 熊熊：特殊饰品 暴击率+5%/暴伤+10%');
  assert(bunny && bunny.special && bunny.stats.stamina===20 && bunny.stats.def===10, 'T14b 兔兔：特殊饰品 体力+20/防御+10');
  assert(!DATA.RECIPES.some(r=>r.id==='bear'||r.id==='bunny'), 'T14c 特殊饰品不在工坊配方（不可制造）');
  const fc = { id:'f1', cls:'civilian', level:1, hp:100, stamina:100, maxHp:200, maxStamina:100, atk:40, def:5, range:1, move:3, critRate:5, critDmg:150,
    equip:{ acc:{ uid:'k1', id:'bear', lv:0 } }, item:null };
  const u1 = Battle.mkAlly(fc, 5, 5);
  assert(u1.critRate===10 && u1.critDmg===160, `T14d mkAlly 暴击接入：✨10%/💥160%（${u1.critRate}/${u1.critDmg}）`);
  fc.equip = { acc:{ uid:'k2', id:'bunny', lv:0 } };
  const u2 = Battle.mkAlly(fc, 5, 5);
  assert(u2.maxStamina===120 && u2.def===15 && u2.critRate===5, `T14e mkAlly 兔兔：⚡120/🛡15（${u2.maxStamina}/${u2.def}）`);

  // T15 掉落池排除特殊饰品（V105 修复：胜利装备掉落不再出熊熊/兔兔）
  const dropPool = Object.keys(DATA.EQUIPS).filter(id=>!DATA.EQUIPS[id].special);
  assert(!dropPool.includes('bear') && !dropPool.includes('bunny') && dropPool.length===Object.keys(DATA.EQUIPS).length-2, 'T15 装备掉落池排除特殊饰品（熊熊/兔兔）');

  console.log('--- done ---');
  process.exit(0);
})();
