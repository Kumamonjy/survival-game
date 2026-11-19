/* V113 急救丸（回60血+解重伤，医院/实验室双通道）+ 删除药物治重伤 + canProduce 统一判定 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;

function mkDuty(cls, name){ const c = Game.createChar(cls, name); c.stamina = 9999; c.injured = false; g.chars.push(c); return c; }

(async () => {
  // T1 道具定义
  const fa = DATA.EQUIPS.firstaid;
  assert(fa && fa.consumable && fa.skill.flatHeal===60, 'T1 急救丸定义：消耗品回 60 血');

  // T2 双通道配置
  const P = DATA.PRODUCE.firstaid;
  assert(Array.isArray(P.building) && P.building.includes('hospitalLv') && P.building.includes('labLv'), 'T2a 医院/实验室双通道');
  assert(P.stamina===15 && P.mats.med===2 && P.mats.gold===20, 'T2b 配方 15⚡ + 2💊 + 20💰');

  // T3 医院通道生产 + canProduce 统一判定
  g.hospitalLv = 1; g.res.med = 10; g.res.gold = 100;
  const doc = mkDuty('doctor','杜医');
  Game.assignHospital(doc.id);
  const chk = Game.canProduce('firstaid');
  assert(chk.ok && chk.worker===doc && chk.mats.med===2 && chk.mats.gold===20, 'T3a canProduce 统一判定通过（含执行材料与当值者）');
  Game.makeFirstaid();
  assert((g.bagInst||[]).some(e=>e.id==='firstaid'), 'T3b 医院通道生产入包');
  assert(g.res.med===8 && g.res.gold===80 && doc.stamina===9984, 'T3c 扣 2💊+20💰 + 15⚡');

  // T4 canProduce 拦截原因（材料不足路径）
  g.res.med = 0;
  const chk2 = Game.canProduce('firstaid');
  assert(!chk2.ok && chk2.lack && (chk2.why||'').includes('急救丸'), 'T4 材料不足时 why 提示急救丸配方');
  g.res.med = 10;

  // T5 营地使用：重伤角色 → 回 60 血 + 解除重伤 + 背包 -1
  g.bagInst.push({ uid:'fa_t', id:'firstaid', lv:0 });
  Game.unequipToBag ? null : null;
  g.bag.firstaid = (g.bag.firstaid||0);   // 背包道具为投影：直接构造 bag 计数
  g.bag.firstaid = 1;
  const hurt = g.chars[0];
  hurt.injured = true; hurt.hp = 10;
  Game.useFirstaid(hurt.id);
  assert(!hurt.injured && hurt.hp===70, `T5a 服用急救丸：解除重伤 + 回 60 血（${hurt.hp}）`);
  assert(g.bag.firstaid===0, 'T5b 背包急救丸 -1');

  // T6 无药拦截
  hurt.injured = true; hurt.hp = 10;
  Game.useFirstaid(hurt.id);
  assert(hurt.injured && hurt.hp===10, 'T6 无急救丸时使用被拦截');

  // T7 healInjured 已删除
  assert(Game.healInjured===undefined && UI.healInjured===undefined, 'T7a healInjured 函数已移除');
  assert(!html.includes('治疗 (2药物)'), 'T7b 「治疗 (2药物)」按钮已移除');

  // T8 战斗技能：doHeal 60
  Battle.b = { units:[], selected:null, terrain:Array.from({length:Battle.ROWS},()=>Array.from({length:Battle.COLS},()=>'plain')),
    mode:null, turn:1, phase:'player', weather:'sunny', stats:{}, log:[], logEl:null, loot:{gold:0,med:0,metal:0,food:0,fabric:0,wood:0}, ruins:{}, over:false, subtitleT:null, zLevel:1, speed:1, zone:DATA.ZONES[0], doubledReward:false };
  const u = Battle.mkAlly(g.chars[1], 5, 5);
  Battle.b.units.push(u);
  u.hp = 30; Battle.b.pendingSkill = fa.skill;
  await Battle.doHeal(u, u);
  assert(u.hp===90, 'T8 战斗中服用急救丸 30→90（+60）');

  // T9 医院卡渲染含急救丸按钮
  g.hospitalLv = 1;
  UI.renderBuild();
  const bh = Object.values(elems).map(e=>e.innerHTML).join('');
  assert(bh.includes('makeFirstaid') && bh.includes('生产急救丸'), 'T9 医院卡含急救丸生产按钮');

  // T10 打造也走 canProduce：无工匠时 craft club 拦截
  const sm = Game.createChar('civilian','工匠甲'); sm.stamina = 9999; g.chars.push(sm);
  g.workshopLv = 1;
  const chk3 = Game.canProduce('club');
  assert(!chk3.ok && (chk3.why||'').includes('工匠'), 'T10a canProduce 覆盖工坊打造（未指派工匠拦截）');
  Game.assignWorkshop(sm.id);
  g.res.gold = 500; g.res.wood = 30; g.res.metal = 30; g.res.fabric = 30;
  assert(Game.canProduce('club').ok, 'T10b 指派工匠后可打造');

  // T11 状态分类：只存在重伤（V115 移除「受伤」黄标 / 医生减半假优惠 / 旧药物文案）
  assert(!html.includes('tag yellow">受伤'), 'T11a 人物页「受伤」黄标已移除');
  assert(html.includes(`const inj = c.injured ? '<span class="tag red">重伤</span>' : '';`), 'T11b 状态标签只保留重伤');
  assert(!html.includes('medNote') && !html.includes('治疗消耗减半'), 'T11c 医生减半假优惠标签已移除');
  assert(!html.includes('药物使用说明') && html.includes('急救丸使用说明'), 'T11d 仓库面板改为急救丸说明');
  assert(!html.includes('治疗重伤所需药物减半'), 'T11e 医生职业描述不再提药物减半');

  console.log('--- done ---');
  process.exit(0);
})().catch(e=>{ console.log('TEST ERROR', e); process.exit(1); });
