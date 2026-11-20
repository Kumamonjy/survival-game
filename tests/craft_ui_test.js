/* V135 打造界面精简：按类别子标签（消耗品/武器/防具/饰品）+ 紧凑单行卡片 + 一行技能摘要 */
const { setup, assert } = require('./_helper.js');
const { Game, Battle, UI, Recruit, DATA, elems, html, store } = setup();
Game.g = Game.newGame(); Game.currentSlot = 1;
const g = Game.g;
const body = () => elems['modal-body'] ? elems['modal-body'].innerHTML : '';

// 指派工匠（不限职业）
const smith = Game.createChar('civilian','工匠甲'); smith.stamina = 9999; smith.injured = false;
g.chars.push(smith); g.workshopLv = 1; Game.assignWorkshop(smith.id);

(() => {
  // T1 四个类别子标签 + 数量徽标，默认选中「消耗品」
  UI.craftTab = null;
  UI.openCraftModal();
  let h = body();
  assert(['🧪 消耗品 5','🗡️ 武器 8','🛡️ 防具 6','📿 饰品 3'].every(t=>h.includes(t)), 'T1a 四类子标签与数量正确');
  assert(/wiki-subtab active[^>]*>🧪 消耗品/.test(h), 'T1b 默认选中消耗品页');

  // T2 默认页只渲染消耗品
  assert(h.includes('燃烧瓶') && h.includes('石块') && h.includes('药汤') && !h.includes('菜刀') && !h.includes('毛衣'), 'T2 消耗品页只含消耗品');

  // T3 武器页：8 把武器，互斥
  UI.openCraftTab('weapon');
  h = body();
  assert(h.includes('菜刀') && h.includes('消防斧') && h.includes('匕首') && h.includes('长矛') && !h.includes('燃烧瓶') && !h.includes('毛衣'), 'T3 武器页只含武器');
  assert(/wiki-subtab active[^>]*>🗡️ 武器/.test(h), 'T3b 武器标签高亮');

  // T4 防具页合并 头盔/衣服/鞋子
  UI.openCraftTab('armor');
  h = body();
  assert(h.includes('毛衣') && h.includes('布衣') && h.includes('布帽') && h.includes('布鞋') && h.includes('棒球帽') && h.includes('安全帽') && !h.includes('长矛') && !h.includes('水瓶'), 'T4 防具页含头/衣/鞋且不含武器饰品');

  // T5 饰品页
  UI.openCraftTab('acc');
  h = body();
  assert(h.includes('水瓶') && h.includes('保温杯') && h.includes('护腕') && !h.includes('菜刀'), 'T5 饰品页只含饰品');

  // T6 紧凑行 + 一行技能摘要（不再渲染冗长 desc）
  UI.openCraftTab('item');
  h = body();
  assert(h.includes('class="craft-row"'), 'T6a 使用紧凑行卡片');
  assert(h.includes('「投掷燃烧瓶」2格 40伤 +燃烧2 15⚡'), 'T6b 燃烧瓶摘要一行概括');
  assert(h.includes('「投掷石头」3格 50%攻 10⚡'), 'T6c 石块摘要含射程/伤害/体力');
  assert(!h.includes('消耗品 · 不提供属性'), 'T6d 不再重复冗长介绍');

  // T7 缺工匠：成本标红且按钮禁用
  Game.unassignWorkshop();
  UI.openCraftModal();
  h = body();
  assert(h.includes('craft-cost no') && h.includes('disabled'), 'T7 缺工匠时成本标红 + 按钮禁用');
  Game.assignWorkshop(smith.id);

  // T8 道具管理弹窗同样紧凑化
  Game.addEquip('stone', 2);
  UI.openItemSlot(g.chars[0].id);
  h = body();
  assert(h.includes('class="craft-row"') && h.includes('「投掷石头」'), 'T8 道具管理改紧凑行');

  // T9 skillBrief 纯函数：多段摘要
  assert(UI.skillBrief({name:'凶猛劈砍',range:1,mult:1.5,bleed:{turns:2},cost:15}) === '「凶猛劈砍」1格 150%攻 +流血2 15⚡', 'T9a 武器技能摘要');
  assert(UI.skillBrief({name:'抽烟',range:1,regenAmt:15,regenStatus:{turns:2},cost:0}) === '「抽烟」1格 +15⚡', 'T9b 体力类消耗品摘要');
  assert(UI.skillBrief(null) === '', 'T9c 无技能返回空串');

  // T10 金币排序：默认升序，按钮简化为 金币↑ / 金币↓ 且靠左
  UI.craftSort = null; UI.openCraftTab('item');
  h = body();
  assert(h.includes('💰 金币↑'), 'T10a 默认显示「💰 金币↑」');
  assert(h.indexOf('飞镖') < h.indexOf('石块') && h.indexOf('石块') < h.indexOf('燃烧瓶'), 'T10b 默认按金币从低到高（8→12→22）');
  assert(/justify-content:flex-start[^>]*>\s*<button[^>]*toggleCraftSort/.test(h), 'T10c 排序按钮靠左');
  UI.toggleCraftSort();
  h = body();
  assert(h.includes('💰 金币↓') && h.indexOf('燃烧瓶') < h.indexOf('飞镖'), 'T10d 点击切换为降序');
  UI.toggleCraftSort();
  assert(body().includes('💰 金币↑'), 'T10e 再次点击回到升序');

  // T11 成本移入说明列，允许换行（两行显示），不再挤压右侧按钮
  h = body();
  assert(/<div class="craft-info">[\s\S]*?craft-cost[\s\S]*?<div class="craft-act">/.test(h), 'T11 成本位于说明列内、按钮独占右列');

  // T12 新头盔：棒球帽 / 安全帽 数据与配方
  const cap = DATA.EQUIPS.cap, helmet = DATA.EQUIPS.helmet;
  assert(cap && cap.slot==='head' && cap.stats.hp===10 && cap.stats.stamina===10, 'T12a 棒球帽：生命+10 / 体力+10');
  assert(helmet && helmet.slot==='head' && helmet.stats.hp===25 && helmet.stats.def===10, 'T12b 安全帽：生命+25 / 防御+10');
  const rc = DATA.RECIPES.find(r=>r.id==='cap'), rh = DATA.RECIPES.find(r=>r.id==='helmet');
  assert(rc && rc.cost.gold===18 && rc.cost.fabric===2, 'T12c 棒球帽配方 18💰+2🧵');
  assert(rh && rh.cost.gold===48 && rh.cost.metal===3, 'T12d 安全帽配方 48💰+3⚙️');

  // T13 兔兔调整：体力+20 / 防御+10
  const bunny = DATA.EQUIPS.bunny;
  assert(bunny.stats.stamina===20 && bunny.stats.def===10, 'T13 兔兔：体力+20 / 防御+10');

  // T14 弹窗内快速指派工匠
  Game.unassignWorkshop(); UI.craftAssign = false; UI.openCraftModal();
  h = body();
  assert(h.includes('👤 指派') && h.includes('UI.toggleCraftAssign()'), 'T14a 未指派时显示「指派」按钮');
  UI.toggleCraftAssign();
  h = body();
  assert(h.includes('craft-pick') && h.includes("UI.quickAssignWorkshop('"), 'T14b 展开角色选择列表');
  assert(h.includes(smith.name) && h.includes('工匠甲'), 'T14c 列表含可选成员与职业');
  UI.quickAssignWorkshop(smith.id);
  h = body();
  assert(g.workshopChef === smith.id, 'T14d 点击角色直接指派成功');
  assert(h.includes('🔄 更换') && !h.includes('craft-pick'), 'T14e 指派后收起列表并显示「更换」');

  // T15 指派守门：已有职务的成员会被拦截（一人一职）
  Game.unassignWorkshop(); Game.unassignFarm();
  const other = g.chars.find(c=>!c.dead && c.id!==smith.id);
  other.stamina = 80; g.farmLv = 1; Game.assignDuty('farm', other.id);
  assert(g.farmWorker === other.id, 'T15a 前置：成员已在农场耕作');
  UI.craftAssign = false; UI.renderCraftModal();
  UI.quickAssignWorkshop(other.id);
  assert(g.workshopChef !== other.id, 'T15b 已当值的成员无法直接改派工匠');
  Game.unassignFarm();

  // T16 体力上限含装备加成，避免显示 175/165 这类「超过上限」
  smith.equip = smith.equip || {};
  smith.equip.acc = { id:'bottle', lv:0 };
  smith.stamina = 110;
  Game.assignWorkshop(smith.id);
  UI.openCraftModal();
  h = body();
  assert(h.includes(`⚡ 110/${Game.effSt(smith)}`) && Game.effSt(smith) === smith.maxStamina + 15, 'T16 工匠体力按含装备的有效上限显示');
  smith.equip.acc = null;

  console.log('--- done ---');
  process.exit(0);
})();
