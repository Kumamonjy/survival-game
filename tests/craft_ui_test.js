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
  assert(['🧪 消耗品 5','🗡️ 武器 8','🛡️ 防具 4','📿 饰品 3'].every(t=>h.includes(t)), 'T1a 四类子标签与数量正确');
  assert(/wiki-subtab active[^>]*>🧪 消耗品/.test(h), 'T1b 默认选中消耗品页');

  // T2 默认页只渲染消耗品
  assert(h.includes('燃烧瓶') && h.includes('石块') && h.includes('药汤') && !h.includes('菜刀') && !h.includes('毛衣'), 'T2 消耗品页只含消耗品');

  // T3 武器页：8 把武器，互斥
  UI.openCraftTab('weapon');
  h = body();
  assert(h.includes('菜刀') && h.includes('消防斧') && h.includes('匕首') && h.includes('长枪') && !h.includes('燃烧瓶') && !h.includes('毛衣'), 'T3 武器页只含武器');
  assert(/wiki-subtab active[^>]*>🗡️ 武器/.test(h), 'T3b 武器标签高亮');

  // T4 防具页合并 头盔/衣服/鞋子
  UI.openCraftTab('armor');
  h = body();
  assert(h.includes('毛衣') && h.includes('布衣') && h.includes('布帽') && h.includes('布鞋') && !h.includes('长枪') && !h.includes('水瓶'), 'T4 防具页含头/衣/鞋且不含武器饰品');

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

  console.log('--- done ---');
  process.exit(0);
})();
